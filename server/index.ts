import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as tar from 'tar';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { dataDir, hosted, loadWorkspace, saveWorkspace } from './store.js';
import { inventory, baseline, healthScore } from './analyzer.js';
import { diagnose, harnesses, run } from './providers.js';
import type { Knowledge, Repo, Scan, Workspace } from '../src/types.js';

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  const host = req.headers.host || '';
  const hostname = host
    .replace(/^\[/, '')
    .replace(/\](?::\d+)?$/, '')
    .split(':')[0];
  const origin = req.headers.origin;
  if (!hosted) {
    if (!['localhost', '127.0.0.1', '::1'].includes(hostname))
      return res.status(403).json({ error: 'Local access only.' });
    if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  } else if (origin) {
    const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    if (origin !== `${protocol}://${host}`)
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

if (hosted) {
  app.use(
    clerkMiddleware((req) => ({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      authorizedParties: [`https://${req.headers.host}`],
    })),
  );
}

app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, runtime: hosted ? 'hosted' : 'local' }));
app.use('/api', (req, res, next) => {
  if (!hosted) {
    res.locals.userId = 'local';
    return next();
  }
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to access this workspace.' });
  res.locals.userId = userId;
  next();
});

const jobs = new Map<string, AbortController>();
const userId = (res: express.Response) => String(res.locals.userId);

function publicWorkspace(state: Workspace) {
  return {
    ...state,
    knowledge: state.knowledge.map(({ content, ...knowledge }) => ({
      ...knowledge,
      characters: content?.length || 0,
    })),
    runtime: {
      hosted,
      localRepositories: !hosted,
      persistent: hosted,
    },
  };
}

app.get('/api/workspace', async (_req, res) => {
  const state = await loadWorkspace(userId(res));
  res.json(publicWorkspace(state));
});

app.get('/api/harnesses', async (_req, res) => res.json(await harnesses()));

app.post('/api/repos', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  const input = z
    .object({ location: z.string().trim().min(1).max(2000), source: z.enum(['github', 'local']) })
    .parse(req.body);
  if (hosted && input.source === 'local')
    throw new Error(
      'Hosted workspaces support GitHub repositories. Use local mode for directories.',
    );

  let name: string;
  let owner: string;
  let location = input.location;
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
  if (state.repos.some((repo) => !repo.demo && repo.location === location))
    throw new Error('This repository is already in your workspace.');
  const repo: Repo = {
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
  await saveWorkspace(ownerId, state);
  res.status(201).json(repo);
});

app.delete('/api/repos/:id', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  if (state.scans.some((scan) => scan.repoId === req.params.id && scan.status === 'running'))
    throw new Error('Cancel the active scan before removing this repository.');
  state.repos = state.repos.filter((repo) => repo.id !== req.params.id);
  state.scans = state.scans.filter((scan) => scan.repoId !== req.params.id);
  await saveWorkspace(ownerId, state);
  res.json({ ok: true });
});

app.patch('/api/findings/:id', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  const { status } = z
    .object({ status: z.enum(['open', 'in-progress', 'resolved', 'deferred']) })
    .parse(req.body);
  const finding = state.repos
    .flatMap((repo) => repo.findings)
    .find((item) => item.id === req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found.' });
  finding.status = status;
  await saveWorkspace(ownerId, state);
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

app.post('/api/profiles', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  const profile = profileSchema.parse(req.body);
  const value = { ...profile, id: profile.id || crypto.randomUUID() };
  if (value.active) state.profiles.forEach((item) => (item.active = false));
  const index = state.profiles.findIndex((item) => item.id === value.id);
  if (index >= 0) state.profiles[index] = value;
  else state.profiles.push(value);
  await saveWorkspace(ownerId, state);
  res.json(value);
});

app.patch('/api/settings', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  state.settings = z
    .object({
      workspaceName: z.string().trim().min(1).max(80),
      defaultHarness: z.string(),
      defaultModel: z.string().max(150),
    })
    .parse(req.body);
  await saveWorkspace(ownerId, state);
  res.json(state.settings);
});

async function refreshKnowledge(knowledge: Knowledge) {
  try {
    let response = await fetch(knowledge.url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'SlopMeter/1.0 documentation-reader' },
      redirect: 'manual',
    });
    if (response.status >= 300 && response.status < 400) {
      const target = new URL(response.headers.get('location') || '', knowledge.url);
      if (target.hostname !== new URL(knowledge.url).hostname || target.protocol !== 'https:')
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
      if (html.length > 1_500_000) {
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
      .slice(0, 80_000);
    if (clean.length < 100) throw new Error('The source did not return readable documentation.');
    knowledge.content = clean;
    knowledge.hash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12);
    knowledge.fetchedAt = new Date().toISOString();
    delete knowledge.error;
  } catch (error) {
    knowledge.error = (error as Error).message;
  }
}

app.post('/api/knowledge/refresh', async (_req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  await Promise.all(state.knowledge.map(refreshKnowledge));
  await saveWorkspace(ownerId, state);
  res.json({ ok: true });
});

async function downloadGitHubSnapshot(repo: Repo, root: string, signal: AbortSignal) {
  const archive = path.join(dataDir, `${crypto.randomUUID()}.tgz`);
  const response = await fetch(
    `https://codeload.github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/tar.gz/HEAD`,
    {
      signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
      headers: { 'User-Agent': 'SlopMeter/1.0 repository-reader' },
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'Repository not found. Hosted scans currently support public GitHub repositories.'
        : `GitHub returned HTTP ${response.status} while downloading the repository.`,
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error('GitHub returned no repository archive.');
  const file = await fs.open(archive, 'w', 0o600);
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 60_000_000) {
        await reader.cancel();
        throw new Error('Repository archive exceeds the 60 MB hosted scan limit.');
      }
      await file.write(value);
    }
  } finally {
    await file.close();
  }
  await fs.mkdir(root, { recursive: true });
  try {
    await tar.x({ file: archive, cwd: root, strip: 1, strict: true, preservePaths: false });
  } finally {
    await fs.rm(archive, { force: true });
  }
}

app.post('/api/scans', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
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
  const repo = state.repos.find((item) => item.id === input.repoId);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });
  if (repo.demo)
    throw new Error('Sample repositories are illustrative. Add a real repository to run a scan.');
  if (state.scans.some((scan) => scan.repoId === repo.id && scan.status === 'running'))
    throw new Error('A scan is already running for this repository.');
  if (state.scans.filter((scan) => scan.status === 'running').length >= 2)
    throw new Error('Two scans are already running. Wait for one to finish.');
  const profile = state.profiles.find((item) => item.id === input.profileId);
  if (!profile) throw new Error('Choose an existing Slop Profile.');
  if (!(await harnesses()).find((item) => item.id === input.harness)?.available)
    throw new Error('This harness is not configured. Check Settings.');

  const controller = new AbortController();
  const scan: Scan = {
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
  const jobId = `${ownerId}:${scan.id}`;
  jobs.set(jobId, controller);
  state.scans.unshift(scan);
  await saveWorkspace(ownerId, state);
  res.status(202).json(scan);

  const update = (phase: string, progress: number) => {
    controller.signal.throwIfAborted();
    scan.phase = phase;
    scan.progress = progress;
    void saveWorkspace(ownerId, state);
  };
  const task = (async () => {
    let root = repo.location;
    try {
      if (repo.source === 'github') {
        root = path.join(dataDir, 'repositories', repo.id, scan.id);
        await fs.mkdir(path.dirname(root), { recursive: true });
        update('Downloading repository snapshot', 8);
        if (hosted) {
          await downloadGitHubSnapshot(repo, root, controller.signal);
        } else {
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
      }
      update('Mapping files and dependencies', 15);
      if (!hosted) {
        try {
          scan.commit = (
            await run('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 5000 })
          ).trim();
        } catch {}
      }
      const { files, skipped } = await inventory(root, controller.signal);
      if (!files.length)
        throw new Error('No supported source files found. Check the path and ignore rules.');
      let findings;
      let coverage;
      if (input.harness === 'static') {
        update('Inspecting baseline signals', 45);
        findings = baseline(files, repo.id, profile);
        coverage = `${files.length} source files inspected; ${skipped} entries excluded. Limited structural and lexical baseline. A high score is not assurance of security or correctness. Use an AI harness for contextual diagnosis.`;
      } else {
        update('Refreshing authoritative knowledge', 20);
        await Promise.all(
          state.knowledge
            .filter(
              (knowledge) =>
                !knowledge.fetchedAt || Date.now() - Date.parse(knowledge.fetchedAt) > 86_400_000,
            )
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
      for (const finding of findings) {
        const previous = repo.findings.find((item) => item.id === finding.id);
        if (previous && previous.status !== 'resolved') finding.status = previous.status;
      }
      const manifest = files.find((file) => file.path === 'package.json');
      let stack = 'Source repository';
      if (manifest) {
        try {
          const packageJson = JSON.parse(manifest.content);
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          stack = [
            dependencies.typescript ? 'TypeScript' : 'JavaScript',
            dependencies.next
              ? 'Next.js'
              : dependencies.express
                ? 'Express'
                : dependencies.react
                  ? 'React'
                  : '',
          ]
            .filter(Boolean)
            .join(' · ');
        } catch {}
      }
      const now = new Date().toISOString();
      const health = healthScore(findings);
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
        findingCount: findings.reduce((sum, finding) => sum + finding.findings, 0),
        coverage,
        findings: structuredClone(findings),
        knowledgeIds:
          input.harness === 'static'
            ? []
            : state.knowledge
                .filter((knowledge) => knowledge.content)
                .map((knowledge) => `${knowledge.id}@${knowledge.hash}`),
      });
      await saveWorkspace(ownerId, state);
    } catch (error) {
      scan.status = controller.signal.aborted ? 'cancelled' : 'failed';
      scan.phase = scan.status === 'cancelled' ? 'Cancelled' : 'Scan failed';
      scan.error = (error as Error).message;
      scan.completedAt = new Date().toISOString();
      await saveWorkspace(ownerId, state);
    } finally {
      jobs.delete(jobId);
      if (repo.source === 'github')
        await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
    }
  })();
  if (hosted) waitUntil(task);
  else void task;
});

app.post('/api/scans/:id/cancel', async (req, res) => {
  const ownerId = userId(res);
  const state = await loadWorkspace(ownerId);
  const scan = state.scans.find((item) => item.id === req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  jobs.get(`${ownerId}:${scan.id}`)?.abort();
  if (scan.status === 'running') {
    scan.status = 'cancelled';
    scan.phase = 'Cancelled';
    scan.completedAt = new Date().toISOString();
    await saveWorkspace(ownerId, state);
  }
  res.json({ ok: true });
});

app.get('/api/export/:repoId', async (req, res) => {
  const state = await loadWorkspace(userId(res));
  const repo = state.repos.find((item) => item.id === req.params.repoId);
  if (!repo) return res.status(404).json({ error: 'Repository not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${repo.name}-roadmap.md"`);
  res
    .type('text/markdown')
    .send(
      `# ${repo.owner}/${repo.name} — Refactoring roadmap\n\n${repo.demo ? 'Illustrative sample analysis.' : 'Generated from the latest completed scan.'}\n\n` +
        repo.findings
          .map(
            (finding, index) =>
              `## ${index + 1}. ${finding.title}\n\n${finding.why}\n\n- Severity: ${finding.severity}\n- Priority score: ${finding.score}/100\n- Confidence: ${finding.confidence}%\n- Estimated effort: ${finding.effort} hours\n- Status: ${finding.status}\n- Prerequisites: ${finding.dependencies.join(', ') || 'None'}\n\n${finding.deferReason ? 'Defer rationale: ' + finding.deferReason + '\n\n' : ''}${finding.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`).join('\n')}\n\n${finding.evidence.map((evidence) => `### ${evidence.file}:${evidence.line}\n\n${evidence.explanation}\n\n\`\`\`\n${evidence.snippet}\n\`\`\``).join('\n\n')}`,
          )
          .join('\n\n'),
    );
});

if (!hosted) {
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
}

app.use(
  (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({
      error:
        error instanceof z.ZodError
          ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
          : error.message,
    });
  },
);

if (!hosted) {
  app.listen(Number(process.env.PORT || 4310), '127.0.0.1', () =>
    console.log('Slop Meter API ready at http://127.0.0.1:' + (process.env.PORT || 4310)),
  );
}

export default app;
