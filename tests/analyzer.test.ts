import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inventory, baseline, rank, redact, healthScore } from '../server/analyzer';
import { parseResult, diagnose } from '../server/providers';
import { profiles, seed } from '../server/seed';
import { normalizeWorkspace } from '../server/migrate';
import { patternById, slopDimensions, slopPatterns } from '../src/slopTaxonomy';
const profile = profiles[0];
test('inventory respects ignore rules, excludes symlinks and secret files, and redacts credentials', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'slop-test-'));
  try {
    await fs.mkdir(path.join(root, 'node_modules'));
    await fs.writeFile(path.join(root, 'node_modules', 'bad.js'), 'eval(input)');
    await fs.writeFile(path.join(root, '.gitignore'), 'ignored.ts\n');
    await fs.writeFile(path.join(root, 'ignored.ts'), 'eval(input)');
    await fs.writeFile(path.join(root, '.env'), 'SECRET=do-not-read');
    await fs.writeFile(
      path.join(root, 'app.ts'),
      'const password = "sensitive";\nexport const x = 1;',
    );
    await fs.symlink(path.join(root, 'app.ts'), path.join(root, 'linked.ts'));
    const result = await inventory(root);
    assert.deepEqual(
      result.files.map((f) => f.path),
      ['app.ts'],
    );
    assert.ok(result.files[0].content.includes('[REDACTED]'));
    assert.ok(!result.files[0].content.includes('sensitive'));
    assert.ok(result.skipped >= 4);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('baseline compresses repeated silent failures into a root cause with file evidence', () => {
  const files = Array.from({ length: 4 }, (_, i) => ({
    path: `module-${i}.ts`,
    content: 'try { work(); } catch {}',
    lines: 1,
  }));
  const result = baseline(files, 'repo', profile);
  assert.equal(result.length, 1);
  assert.equal(result[0].findings, 4);
  assert.equal(result[0].dimension, 'Correctness');
  assert.equal(result[0].patternId, 'error-handling-slop');
  assert.equal(result[0].evidence[2].file, 'module-2.ts');
});
test('large modules are treated as review signals, not confirmed architectural defects', () => {
  const result = baseline(
    [{ path: 'large.ts', content: Array(450).fill('const value = 1;').join('\n'), lines: 450 }],
    'repo',
    profile,
  );
  assert.equal(result[0].confidence, 65);
  assert.match(result[0].why, /file size alone/);
});
test('dependencies outrank severity and cycles are broken deterministically', () => {
  const findings = structuredClone(seed().repos.flatMap((r) => r.findings)).slice(0, 3);
  findings[0].dependencies = [findings[1].id];
  findings[1].dependencies = [findings[0].id];
  const result = rank(findings, profile);
  const seen = new Set();
  for (const f of result) {
    assert.ok(f.dependencies.every((d) => seen.has(d)));
    seen.add(f.id);
  }
  assert.equal(result.length, findings.length);
});
test('profile emphasis changes scores without changing severity', () => {
  const f = structuredClone(seed().repos[0].findings[0]);
  const low = rank([structuredClone(f)], {
    ...profile,
    weights: { ...profile.weights, Architecture: 0 },
  })[0];
  const high = rank([structuredClone(f)], {
    ...profile,
    weights: { ...profile.weights, Architecture: 5 },
  })[0];
  assert.ok(high.score > low.score);
  assert.equal(high.severity, low.severity);
});
test('health stays in bounds and reflects observed problems', () => {
  assert.equal(healthScore([]), 100);
  const findings = seed().repos.flatMap((r) => r.findings);
  assert.ok(healthScore(findings) < 100);
  assert.equal(healthScore(Array(50).fill(findings[0])), 0);
});
test('common inline credential assignments are redacted', () => {
  assert.equal(redact('api_key: "example-secret"'), 'api_key: "[REDACTED]"');
  assert.equal(redact("password = 'secret'"), "password = '[REDACTED]'");
});
test('built-in rubric stays aligned with the 40-pattern markdown reference', async () => {
  const markdown = await fs.readFile(path.resolve('common-ai-slop.md'), 'utf8');
  const headings = [...markdown.matchAll(/^## \d+\. (.+)$/gm)].map((match) => match[1]);
  assert.equal(slopPatterns.length, 40);
  assert.equal(new Set(slopPatterns.map((pattern) => pattern.id)).size, 40);
  assert.deepEqual(
    slopPatterns.map((pattern) => pattern.title),
    headings,
  );
  for (const pattern of slopPatterns.slice(0, 39)) {
    const section = markdown.match(
      new RegExp(
        `^## \\d+\\. ${pattern.title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\n([\\s\\S]*?)(?=^## |^# Suggested)`,
        'm',
      ),
    )?.[1];
    assert.deepEqual(
      pattern.examples,
      [...(section || '').matchAll(/^- (.+)$/gm)].map((match) => match[1]),
    );
  }
  assert.deepEqual(
    new Set(slopPatterns.map((pattern) => pattern.dimension)),
    new Set(slopDimensions),
  );
});
test('workspace migration normalizes active and historical findings without changing evidence', () => {
  const workspace = structuredClone(seed()) as ReturnType<typeof seed> & Record<string, unknown>;
  workspace.schemaVersion = 1;
  const current = workspace.repos[0].findings[0] as (typeof workspace.repos)[0]['findings'][0] &
    Record<string, unknown>;
  const historical = workspace.scans[0].findings![0] as typeof current;
  const preserved = {
    score: current.score,
    status: current.status,
    evidence: structuredClone(current.evidence),
  };
  for (const finding of [current, historical]) {
    Reflect.deleteProperty(finding, 'dimension');
    Reflect.deleteProperty(finding, 'patternId');
    finding.category = 'Architecture';
  }
  workspace.profiles[0].weights = {
    Architecture: 5,
    Security: 4,
    Simplicity: 2,
    Testing: 4,
    Duplication: 3,
    Performance: 2,
    Naming: 1,
    Reliability: 4,
  } as unknown as (typeof workspace.profiles)[0]['weights'];
  assert.equal(normalizeWorkspace(workspace), true);
  assert.equal(workspace.schemaVersion, 2);
  assert.equal(current.dimension, 'Architecture');
  assert.equal(current.patternId, 'poor-architecture-boundaries');
  assert.equal(current.legacyCategory, 'Architecture');
  assert.equal(historical.dimension, 'Architecture');
  assert.deepEqual(
    { score: current.score, status: current.status, evidence: current.evidence },
    preserved,
  );
  assert.deepEqual(Object.keys(workspace.profiles[0].weights), [...slopDimensions]);
});
test('malformed model output and unsupported severity are rejected', () => {
  assert.throws(() => parseResult('This code looks good'));
  assert.throws(() => parseResult('{"findings":[{"severity":"catastrophic"}]}'));
  assert.deepEqual(parseResult('```json\n{"findings":[]}\n```'), { findings: [] });
});
test('model results reject invented patterns and dimension mismatches', () => {
  const finding = structuredClone(seed().repos[0].findings[0]);
  assert.throws(() =>
    parseResult(JSON.stringify({ findings: [{ ...finding, patternId: 'invented-pattern' }] })),
  );
  assert.throws(() =>
    parseResult(JSON.stringify({ findings: [{ ...finding, dimension: 'Security' }] })),
  );
  assert.equal(patternById.get(finding.patternId)?.dimension, finding.dimension);
});
test('AI adapter validates evidence and replaces model snippets with actual source lines', async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'unit-test-key';
  const f = seed().repos[0].findings[0];
  const payload = {
    findings: [
      {
        ...f,
        id: 'boundary',
        dependencies: [],
        evidence: [
          {
            file: 'app.ts',
            line: 2,
            snippet: 'invented code',
            explanation: 'Review this boundary.',
          },
        ],
        sources: ['https://unverified.example.com'],
      },
    ],
  };
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init!.body as string);
    return new Response(
      JSON.stringify({ output: [{ content: [{ text: JSON.stringify(payload) }] }] }),
      { status: 200 },
    );
  };
  try {
    const result = await diagnose(
      [{ path: 'app.ts', content: 'const x = 1;\nconst y = 2;', lines: 2 }],
      'actual',
      profile,
      [],
      {
        harness: 'openai',
        model: 'test-model',
        effort: 'high',
        signal: new AbortController().signal,
      },
      'quick',
      () => {},
    );
    assert.equal(result.findings[0].id, 'actual-boundary');
    assert.equal(result.findings[0].evidence[0].snippet, 'const y = 2;');
    assert.deepEqual(result.findings[0].sources, []);
    assert.deepEqual(requestBody.reasoning, { effort: 'high' });
    assert.match(String(requestBody.input), /BUILT-IN SLOP RUBRIC/);
    assert.match(String(requestBody.input), /Repository Fit/);
    assert.match(result.coverage, /1 of 1/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
test('nested ignore rules and language manifests are respected', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'slop-nested-'));
  try {
    await fs.mkdir(path.join(root, 'service'));
    await fs.writeFile(path.join(root, 'service', '.gitignore'), 'generated.py\n');
    await fs.writeFile(path.join(root, 'service', 'generated.py'), 'eval(input())');
    await fs.writeFile(path.join(root, 'service', 'main.py'), 'print("hello")');
    await fs.writeFile(path.join(root, 'pyproject.toml'), '[project]\nname = "example"');
    const { files } = await inventory(root);
    assert.deepEqual(
      files.map((f) => f.path),
      ['pyproject.toml', 'service/main.py'],
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('inventory aborts cancelled scans', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(inventory('/tmp', controller.signal), { name: 'AbortError' });
});
