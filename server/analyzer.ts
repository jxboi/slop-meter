import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ignore from 'ignore';
import type { Evidence, Finding, Profile } from '../src/types.js';
import type { SlopDimension, SlopPatternId } from '../src/slopTaxonomy.js';
export interface SourceFile {
  path: string;
  content: string;
  lines: number;
}
const excluded = new Set([
  'node_modules',
  '.git',
  '.data',
  'dist',
  'build',
  'coverage',
  '.next',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
]);
const extensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.rb',
  '.php',
  '.cs',
  '.vue',
  '.svelte',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.sql',
  '.toml',
  '.mod',
  '.txt',
  '.xml',
  '.kt',
  '.swift',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.scala',
  '.ex',
  '.exs',
  '.sh',
  '.html',
  '.css',
  '.scss',
]);
export async function inventory(root: string, signal?: AbortSignal) {
  const files: SourceFile[] = [];
  let skipped = 0;
  let bytes = 0;
  let entries = 0;
  const ig = ignore().add([
    '.env*',
    '*.pem',
    '*.key',
    '*lock*',
    '*.min.js',
    '*.map',
    'credentials*',
    'secrets*',
  ]);
  type Scope = { base: string; matcher: ReturnType<typeof ignore> };
  async function walk(dir: string, inherited: Scope[] = []) {
    signal?.throwIfAborted();
    const scopes = [...inherited];
    try {
      scopes.push({
        base: dir,
        matcher: ignore().add(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')),
      });
    } catch {}
    let children;
    try {
      children = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (dir === root) throw error;
      skipped++;
      return;
    }
    for (const entry of children.sort((a, b) => a.name.localeCompare(b.name))) {
      signal?.throwIfAborted();
      if (++entries > 100000) {
        skipped++;
        return;
      }
      const abs = path.join(dir, entry.name),
        rel = path.relative(root, abs).split(path.sep).join('/');
      let gitIgnored = false;
      for (const scope of scopes) {
        const check = scope.matcher.test(
          path.relative(scope.base, abs).split(path.sep).join('/') +
            (entry.isDirectory() ? '/' : ''),
        );
        if (check.ignored) gitIgnored = true;
        else if (check.unignored) gitIgnored = false;
      }
      if (
        entry.isSymbolicLink() ||
        excluded.has(entry.name) ||
        gitIgnored ||
        ig.ignores(rel + (entry.isDirectory() ? '/' : ''))
      ) {
        skipped++;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(abs, scopes);
        continue;
      }
      if (!extensions.has(path.extname(entry.name))) {
        skipped++;
        continue;
      }
      const stat = await fs.stat(abs);
      if (stat.size > 200000 || bytes + stat.size > 30000000 || files.length >= 10000) {
        skipped++;
        continue;
      }
      const content = redact(await fs.readFile(abs, 'utf8'));
      if (content.includes('\0')) continue;
      bytes += stat.size;
      files.push({ path: rel, content, lines: content.split('\n').length });
    }
  }
  await walk(root);
  return { files, skipped, bytes };
}
export function redact(text: string) {
  return text
    .replace(/(?:sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{12,}/g, '[REDACTED]')
    .replace(
      /((?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["'`])[^"'`\n]+/gi,
      '$1[REDACTED]',
    );
}
export function rank(findings: Finding[], profile: Profile) {
  const ids = new Set(findings.map((f) => f.id));
  for (const f of findings) {
    f.dependencies = [...new Set(f.dependencies)].filter((d) => ids.has(d) && d !== f.id);
    const weight = profile.weights[f.dimension] ?? 3;
    f.score = Math.round(
      Math.min(
        100,
        ((((f.impact * 3 + f.risk * 3 + f.blastRadius * 2 + Math.min(f.unlocks, 5) * 3) *
          f.confidence) /
          100) *
          (0.7 + weight * 0.1)) /
          (1 + Math.log2(1 + f.effort) * 0.15),
      ),
    );
  }
  // Break cycles deterministically, then order prerequisites before dependants.
  const ordered: Finding[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(f: Finding) {
    if (visited.has(f.id)) return;
    visiting.add(f.id);
    f.dependencies = f.dependencies.filter((id) => !visiting.has(id));
    for (const id of f.dependencies) {
      const dep = findings.find((x) => x.id === id)!;
      visit(dep);
    }
    visiting.delete(f.id);
    visited.add(f.id);
    ordered.push(f);
  }
  for (const f of [...findings].sort((a, b) => b.score - a.score)) visit(f);
  return ordered;
}
export function baseline(files: SourceFile[], repoId: string, profile: Profile): Finding[] {
  const groups = new Map<
    string,
    {
      title: string;
      dimension: SlopDimension;
      patternId: SlopPatternId;
      severity: Finding['severity'];
      why: string;
      steps: string[];
      evidence: Evidence[];
    }
  >();
  function add(
    key: string,
    file: SourceFile,
    line: number,
    snippet: string,
    explanation: string,
    meta: Omit<ReturnType<typeof groups.get> & {}, 'evidence'>,
  ) {
    const g = groups.get(key) || { ...meta, evidence: [] };
    g.evidence.push({ file: file.path, line, snippet: snippet.slice(0, 600), explanation });
    groups.set(key, g);
  }
  for (const file of files) {
    if (/\.(md|json|ya?ml)$/.test(file.path)) continue;
    if (file.lines > 400)
      add(
        'module-boundaries',
        file,
        1,
        file.content.split('\n').slice(0, 9).join('\n'),
        'This source file has ' +
          file.lines +
          ' lines. Size is a review signal, not proof of poor architecture.',
        {
          title: 'Review oversized module boundaries',
          dimension: 'Maintainability',
          patternId: 'god-objects-god-functions',
          severity: 'medium',
          why: 'Large modules concentrate change. Inspect responsibilities and callers before extracting smaller units; file size alone does not justify a rewrite.',
          steps: [
            'Map the responsibilities and consumers of these modules.',
            'Capture current behavior in characterization tests.',
            'Extract only independently changing responsibilities.',
          ],
        },
      );
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      if (/\beval\s*\(|new Function\s*\(/.test(line))
        add(
          'dynamic-execution',
          file,
          i + 1,
          line,
          'Dynamic code evaluation is present. Trace the input to establish whether untrusted content can reach it.',
          {
            title: 'Audit dynamic execution boundaries',
            dimension: 'Security',
            patternId: 'security-slop',
            severity: 'high',
            why: 'Dynamic execution can turn an input-validation mistake into code execution. Verify reachability before deciding whether this is a vulnerability.',
            steps: [
              'Trace the evaluated input to its origin.',
              'Add tests for untrusted input at the boundary.',
              'Replace evaluation with explicit parsing where possible.',
            ],
          },
        );
      if (
        /catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(line) ||
        /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/.test(line)
      )
        add(
          'error-boundaries',
          file,
          i + 1,
          line,
          'An empty catch discards the failure without observable recovery.',
          {
            title: 'Make silent failures observable',
            dimension: 'Correctness',
            patternId: 'error-handling-slop',
            severity: 'high',
            why: 'Swallowed errors hide the cause of failed operations. Establish recovery and reporting at the boundary before patching individual callers.',
            steps: [
              'Identify which failures require retry, fallback, or propagation.',
              'Add a shared error reporting boundary.',
              'Test the failure paths and remove empty catches.',
            ],
          },
        );
    });
  }
  const code = files.filter((f) => !/\.(md|json|ya?ml)$/.test(f.path));
  if (code.length >= 5 && !files.some((f) => /(test|spec)[./_-]/i.test(f.path)))
    add(
      'test-seams',
      code[0],
      1,
      code[0].content.split('\n').slice(0, 5).join('\n'),
      'No test or spec filenames were observed in the scanned inventory. Tests may exist outside this scope.',
      {
        title: 'Establish a safety net before refactoring',
        dimension: 'Maintainability',
        patternId: 'testing-slop',
        severity: 'medium',
        why: 'No test files were found in the scanned scope. Protect critical behavior before moving shared code, and verify external test coverage first.',
        steps: [
          'Confirm whether a separate test suite exists.',
          'Identify the most important user flows.',
          'Add characterization tests around the first module to refactor.',
        ],
      },
    );
  const fingerprints = new Map<string, SourceFile[]>();
  for (const f of code) {
    const normalized = f.content.replace(/\s+/g, ' ').trim();
    if (normalized.length < 150) continue;
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    fingerprints.set(hash, [...(fingerprints.get(hash) || []), f]);
  }
  for (const matches of fingerprints.values())
    if (matches.length > 1)
      for (const f of matches)
        add(
          'duplicate-modules',
          f,
          1,
          f.content.slice(0, 300),
          'This file is identical to ' +
            matches
              .filter((m) => m !== f)
              .map((m) => m.path)
              .join(', ') +
            ' after whitespace normalization.',
          {
            title: 'Consolidate identical source modules',
            dimension: 'Maintainability',
            patternId: 'copy-paste-duplication',
            severity: 'medium',
            why: 'Identical modules can drift as fixes land in only one copy. Verify that the duplication is not intentional before selecting a shared owner.',
            steps: [
              'Confirm whether these files are generated or intentionally separate.',
              'Choose a shared owner for the common behavior.',
              'Update consumers and verify compatibility.',
            ],
          },
        );
  return rank(
    [...groups].map(([key, g]) => ({
      id: `${repoId}-${key}`,
      repoId,
      title: g.title,
      dimension: g.dimension,
      patternId: g.patternId,
      severity: g.severity,
      impact: g.severity === 'high' ? 8 : 5,
      risk: g.dimension === 'Security' ? 9 : 5,
      blastRadius: Math.min(10, g.evidence.length + 2),
      effort: 4,
      confidence: g.patternId === 'god-objects-god-functions' ? 65 : 80,
      findings: g.evidence.length,
      patterns: 1,
      why: g.why,
      steps: g.steps,
      dependencies: [],
      unlocks: 0,
      evidence: g.evidence.slice(0, 25),
      sources: [],
      status: 'open',
      score: 0,
    })),
    profile,
  );
}
export function healthScore(findings: Finding[]) {
  return Math.max(
    0,
    Math.round(
      100 -
        findings.reduce(
          (sum, f) =>
            sum +
            ({ critical: 22, high: 13, medium: 7, low: 3 }[f.severity] * f.confidence) / 100 +
            Math.log2(1 + f.findings),
          0,
        ),
    ),
  );
}
