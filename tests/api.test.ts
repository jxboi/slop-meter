import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
test('real API: add local repo → scan → evidence → resolve → refactor → rescan → history and persistence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'slop-integration-'));
  const data = path.join(root, 'data'),
    repo = path.join(root, 'repo');
  await fs.mkdir(repo);
  await fs.writeFile(
    path.join(repo, 'app.ts'),
    'export function run(input: string) {\n  try { return eval(input); } catch {}\n}',
  );
  const port = 14500 + Math.floor(Math.random() * 3000),
    url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), SLOP_DATA_DIR: data },
    stdio: 'pipe',
  });
  let serverError = '';
  server.stderr.on('data', (d) => (serverError += d));
  async function request(route: string, method = 'GET', body?: unknown) {
    const res = await fetch(url + '/api' + route, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }
  async function finish(id: string) {
    for (let i = 0; i < 100; i++) {
      const workspace = (await request('/workspace')).body;
      const scan = workspace.scans.find((s: { id: string }) => s.id === id);
      if (scan.status !== 'running') return scan;
      await delay(50);
    }
    throw new Error('Scan did not finish');
  }
  try {
    let started = false;
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(url + '/api/workspace');
        started = true;
        break;
      } catch {
        await delay(50);
      }
    }
    assert.ok(started, serverError);
    const added = await request('/repos', 'POST', { source: 'local', location: repo });
    assert.equal(added.status, 201);
    const id = added.body.id;
    assert.equal(
      (await request('/repos', 'POST', { source: 'local', location: repo })).status,
      400,
    );
    assert.equal(
      (await request('/repos', 'POST', { source: 'github', location: 'https://evil.example/repo' }))
        .status,
      400,
    );
    const denied = await fetch(url + '/api/settings', {
      method: 'PATCH',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(denied.status, 403);
    const input = {
      repoId: id,
      harness: 'static',
      model: '',
      effort: 'medium',
      depth: 'standard',
      profileId: 'balanced',
    };
    const first = await request('/scans', 'POST', input);
    assert.equal(first.status, 202);
    const completed = await finish(first.body.id);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.findings.length, 2);
    assert.match(completed.coverage, /Limited structural/);
    const before = (await request('/workspace')).body.repos.find(
      (r: { id: string }) => r.id === id,
    );
    assert.ok(before.health < 100);
    assert.equal(before.findings[0].evidence[0].line, 2);
    assert.ok(before.findings.every((finding: { dimension?: string }) => finding.dimension));
    assert.ok(before.findings.every((finding: { patternId?: string }) => finding.patternId));
    const firstExportResponse = await fetch(url + '/api/export/' + id);
    const firstExport = await firstExportResponse.text();
    assert.match(firstExport, /Dimension:/);
    assert.match(firstExport, /Pattern:/);
    await request('/findings/' + before.findings[0].id, 'PATCH', { status: 'resolved' });
    const after = (await request('/workspace')).body.repos.find((r: { id: string }) => r.id === id);
    assert.equal(before.health, after.health, 'manual resolution must not change measured score');
    await fs.writeFile(
      path.join(repo, 'app.ts'),
      'export function run(input: string) {\n  return JSON.parse(input);\n}',
    );
    const second = await request('/scans', 'POST', input);
    assert.equal((await finish(second.body.id)).status, 'completed');
    const final = (await request('/workspace')).body.repos.find((r: { id: string }) => r.id === id);
    assert.equal(final.health, 100);
    assert.equal(final.findings.length, 0);
    assert.equal(final.trend.length, 2);
    const exportResponse = await fetch(url + '/api/export/' + id);
    assert.equal(exportResponse.status, 200);
    assert.match(await exportResponse.text(), /Refactoring roadmap/);
    const stored = JSON.parse(await fs.readFile(path.join(data, 'workspace.json'), 'utf8'));
    assert.equal(stored.scans.filter((s: { repoId: string }) => s.repoId === id).length, 2);
    assert.equal(
      stored.scans.find((s: { id: string }) => s.id === first.body.id).findings.length,
      2,
      'historical evidence must stay immutable',
    );
  } finally {
    server.kill();
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once('exit', () => resolve());
    });
    await fs.rm(root, { recursive: true, force: true });
  }
});
