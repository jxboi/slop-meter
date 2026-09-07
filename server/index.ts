import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { state, save, dataDir } from './store';
import { inventory, baseline, healthScore } from './analyzer';
import { diagnose, harnesses, run } from './providers';
import type { Knowledge, Scan } from '../src/types';
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const host = req.headers.host?.split(':')[0];
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host || ''))
    return res.status(403).json({ error: 'Local access only.' });
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '1mb' }));
const jobs = new Map<string, AbortController>();
app.get('/api/workspace', (_req, res) =>
  res.json({
    ...state,
    knowledge: state.knowledge.map(({ content, ...k }) => ({
      ...k,
      characters: content?.length || 0,
    })),
  }),
);
app.get('/api/harnesses', async (_req, res) => res.json(await harnesses()));
app.post('/api/repos', async (req, res) => {
  const input = z
    .object({ location: z.string().trim().min(1).max(2000), source: z.enum(['github', 'local']) })
    .parse(req.body);
  let name,
    owner,
    location = input.location;
  if (input.source === 'github') {
    if (/^[\w.-]+\/[\w.-]+$/.test(location)) location = 'https://github.com/' + location;
    const match = location.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!match)
      throw new Error('Use a GitHub repository URL, such as https://github.com/owner/repo.');
    [, owner, name] = match;
    location = `https://github.com/${owner}/${name}`;
  } else {
    location = await fs.realpath(location.replace(/^~(?=\/)/, process.env.HOME || ''));
    if (!(await fs.stat(location)).isDirectory()) throw new Error('Choose a local directory.');
    name = path.basename(location);
    owner = 'local';
  }
  if (state.repos.some((r) => !r.demo && r.location === location))
    throw new Error('This repository is already in your workspace.');
  const repo = {
    id: crypto.randomUUID(),
    name,
    owner,
    source: input.source,
    location,
    stack: 'Not scanned yet',
    health: null,
    files: 0,
    lastScan: null,
    findings: [],
    trend: [],
  };
  state.repos.push(repo);
  save();
  res.status(201).json(repo);
});
app.delete('/api/repos/:id', (req, res) => {
  if (state.scans.some((s) => s.repoId === req.params.id && s.status === 'running'))
    throw new Error('Cancel the active scan before removing this repository.');
  state.repos = state.repos.filter((r) => r.id !== req.params.id);
  state.scans = state.scans.filter((s) => s.repoId !== req.params.id);
  save();
  res.json({ ok: true });
});
app.patch('/api/findings/:id', (req, res) => {
  const { status } = z
    .object({ status: z.enum(['open', 'in-progress', 'resolved', 'deferred']) })
    .parse(req.body);
  const finding = state.repos.flatMap((r) => r.findings).find((f) => f.id === req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found.' });
  finding.status = status;
  save();
  res.json(finding);
});
const profileSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500),
  instructions: z.string().max(5000),
  rules: z.string().max(5000),
  weights: z.record(z.string().max(60), z.number().int().min(0).max(5)),
  active: z.boolean(),
});
app.post('/api/profiles', (req, res) => {
  const profile = profileSchema.parse(req.body);
  const value = { ...profile, id: profile.id || crypto.randomUUID() };
  if (value.active) state.profiles.forEach((p) => (p.active = false));
  const idx = state.profiles.findIndex((p) => p.id === value.id);
  if (idx >= 0) state.profiles[idx] = value;
  else state.profiles.push(value);
  save();
  res.json(value);
});
app.patch('/api/settings', (req, res) => {
  const values = z
    .object({
      workspaceName: z.string().trim().min(1).max(80),
      defaultHarness: z.string(),
      defaultModel: z.string().max(150),
    })
    .parse(req.body);
  state.settings = values;
  save();
  res.json(values);
});
async function refreshKnowledge(k: Knowledge) {
  try {
    let response = await fetch(k.url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'SlopMeter/1.0 documentation-reader' },
      redirect: 'manual',
    });
    if (response.status >= 300 && response.status < 400) {
      const target = new URL(response.headers.get('location') || '', k.url);
      if (target.hostname !== new URL(k.url).hostname || target.protocol !== 'https:')
        throw new Error('Source redirected to a different host. Review its URL.');
      response = await fetch(target, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Source returned no content.');
    let html = '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.length > 1500000) {
        await reader.cancel();
        break;
      }
    }
    const clean = html
      .replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:nbsp|amp|lt|gt|quot);/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80000);
    if (clean.length < 100) throw new Error('The source did not return readable documentation.');
    k.content = clean;
    k.hash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12);
    k.fetchedAt = new Date().toISOString();
    delete k.error;
  } catch (e) {
    k.error = (e as Error).message;
  }
  save();
}
app.post('/api/knowledge/refresh', async (_req, res) => {
  await Promise.all(state.knowledge.map(refreshKnowledge));
  res.json({ ok: true });
});
app.post('/api/scans', async (req, res) => {
  const input = z
    .object({
      repoId: z.string(),
      harness: z.enum(['static', 'codex', 'claude', 'copilot', 'openai', 'anthropic']),
      model: z
        .string()
        .max(100)
        .regex(/^[\w./:@-]*$/),
      effort: z.enum(['low', 'medium', 'high']),
      depth: z.enum(['quick', 'standard', 'deep']),
      profileId: z.string(),
    })
    .parse(req.body);
  const repo = state.repos.find((r) => r.id === input.repoId);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (repo.demo)
    throw new Error('Sample repositories are illustrative. Add a real repository to run a scan.');
  if (state.scans.some((s) => s.repoId === repo.id && s.status === 'running'))
    throw new Error('A scan is already running for this repository.');
  if (jobs.size >= 2) throw new Error('Two scans are already running. Wait for one to finish.');
  const profile = state.profiles.find((p) => p.id === input.profileId);
  if (!profile) throw new Error('Choose an existing Slop Profile.');
  if (!(await harnesses()).find((h) => h.id === input.harness)?.available)
    throw new Error('This harness is not configured. Check Settings.');
  const controller = new AbortController(),
    scan: Scan = {
      ...input,
      id: crypto.randomUUID(),
      repoName: `${repo.owner}/${repo.name}`,
      startedAt: new Date().toISOString(),
      status: 'running',
      phase: 'Preparing repository',
      progress: 3,
      profileSnapshot: structuredClone(profile),
      knowledgeIds: [],
    };
  jobs.set(scan.id, controller);
  state.scans.unshift(scan);
  save();
  res.status(202).json(scan);
  const update = (phase: string, progress: number) => {
    controller.signal.throwIfAborted();
    scan.phase = phase;
    scan.progress = progress;
    save();
  };
  void (async () => {
    try {
      let root = repo.location;
      if (repo.source === 'github') {
        root = path.join(dataDir, 'repositories', repo.id, scan.id);
        await fs.mkdir(path.dirname(root), { recursive: true });
        update('Cloning repository snapshot', 8);
        await run(
          'git',
          [
            '-c',
            'core.hooksPath=/dev/null',
            'clone',
            '--depth',
            '1',
            '--single-branch',
            '--',
            repo.location + '.git',
            root,
          ],
          { signal: controller.signal, timeout: 180000 },
        );
      }
      update('Mapping files and dependencies', 15);
      try {
        scan.commit = (
          await run('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 5000 })
        ).trim();
      } catch {}
      const { files, skipped } = await inventory(root, controller.signal);
      if (!files.length)
        throw new Error('No supported source files found. Check the path and ignore rules.');
      let findings, coverage;
      if (input.harness === 'static') {
        update('Inspecting local baseline signals', 45);
        findings = baseline(files, repo.id, profile);
        coverage = `${files.length} source files inspected; ${skipped} entries excluded. Limited structural and lexical baseline. A high score is not assurance of security or correctness. Use an AI harness for contextual diagnosis.`;
      } else {
        update('Refreshing authoritative knowledge', 20);
        await Promise.all(
          state.knowledge
            .filter((k) => !k.fetchedAt || Date.now() - Date.parse(k.fetchedAt) > 86400000)
            .map(refreshKnowledge),
        );
        const result = await diagnose(
          files,
          repo.id,
          profile,
          state.knowledge,
          { ...input, signal: controller.signal },
          input.depth,
          update,
        );
        findings = result.findings;
        coverage = result.coverage;
      }
      update('Prioritizing the refactoring roadmap', 90);
      for (const f of findings) {
        const previous = repo.findings.find((p) => p.id === f.id);
        if (previous && previous.status !== 'resolved') f.status = previous.status;
      }
      const manifest = files.find((f) => f.path === 'package.json');
      let stack = 'Source repository';
      if (manifest) {
        try {
          const p = JSON.parse(manifest.content),
            deps = { ...p.dependencies, ...p.devDependencies };
          stack = [
            deps.typescript ? 'TypeScript' : 'JavaScript',
            deps.next ? 'Next.js' : deps.express ? 'Express' : deps.react ? 'React' : '',
          ]
            .filter(Boolean)
            .join(' · ');
        } catch {}
      }
      const now = new Date().toISOString(),
        health = healthScore(findings);
      controller.signal.throwIfAborted();
      Object.assign(repo, {
        files: files.length,
        stack,
        health,
        lastScan: now,
        findings,
        analysis: { harness: input.harness, coverage },
      });
      repo.trend.push({ date: now, value: health });
      Object.assign(scan, {
        status: 'completed',
        phase: 'Complete',
        progress: 100,
        completedAt: now,
        health,
        findingCount: findings.reduce((s, f) => s + f.findings, 0),
        coverage,
        findings: structuredClone(findings),
        knowledgeIds:
          input.harness === 'static'
            ? []
            : state.knowledge.filter((k) => k.content).map((k) => `${k.id}@${k.hash}`),
      });
      save();
    } catch (e) {
      scan.status = controller.signal.aborted ? 'cancelled' : 'failed';
      scan.phase = scan.status === 'cancelled' ? 'Cancelled' : 'Scan failed';
      scan.error = (e as Error).message;
      scan.completedAt = new Date().toISOString();
      save();
    } finally {
      jobs.delete(scan.id);
      if (repo.source === 'github')
        await fs
          .rm(path.join(dataDir, 'repositories', repo.id, scan.id), {
            recursive: true,
            force: true,
          })
          .catch(() => {});
    }
  })();
});
app.post('/api/scans/:id/cancel', (req, res) => {
  jobs.get(req.params.id)?.abort();
  res.json({ ok: true });
});
app.get('/api/export/:repoId', (req, res) => {
  const repo = state.repos.find((r) => r.id === req.params.repoId);
  if (!repo) return res.status(404).json({ error: 'Repository not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${repo.name}-roadmap.md"`);
  res
    .type('text/markdown')
    .send(
      `# ${repo.owner}/${repo.name} — Refactoring roadmap\n\n${repo.demo ? 'Illustrative sample analysis.' : 'Generated from the latest completed scan.'}\n\n` +
        repo.findings
          .map(
            (f, i) =>
              `## ${i + 1}. ${f.title}\n\n${f.why}\n\n- Severity: ${f.severity}\n- Priority score: ${f.score}/100\n- Confidence: ${f.confidence}%\n- Estimated effort: ${f.effort} hours\n- Status: ${f.status}\n- Prerequisites: ${f.dependencies.join(', ') || 'None'}\n\n${f.deferReason ? 'Defer rationale: ' + f.deferReason + '\n\n' : ''}${f.steps.map((s, j) => `${j + 1}. ${s}`).join('\n')}\n\n${f.evidence.map((e) => `### ${e.file}:${e.line}\n\n${e.explanation}\n\n\`\`\`\n${e.snippet}\n\`\`\``).join('\n\n')}`,
          )
          .join('\n\n'),
    );
});
app.use(express.static(path.resolve('dist')));
app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({
    error:
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : err.message,
  });
});
app.listen(Number(process.env.PORT || 4310), '127.0.0.1', () =>
  console.log('Slop Meter API ready at http://127.0.0.1:' + (process.env.PORT || 4310)),
);
