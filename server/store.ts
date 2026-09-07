import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { get, put } from '@vercel/blob';
import { seed } from './seed.js';
import type { Workspace } from '../src/types.js';

export const hosted = process.env.VERCEL === '1';
export const dataDir = hosted
  ? path.join(os.tmpdir(), 'slop-meter')
  : path.resolve(process.env.SLOP_DATA_DIR || '.data');

const localFilename = path.join(dataDir, 'workspace.json');
let localState: Workspace | undefined;
const writes = new Map<string, Promise<void>>();

function recoverInterruptedScans(workspace: Workspace) {
  if (hosted) return workspace;
  for (const scan of workspace.scans) {
    if (scan.status !== 'running') continue;
    scan.status = 'failed';
    scan.error = 'The server restarted before this scan completed.';
    scan.phase = 'Interrupted';
  }
  return workspace;
}

function saveLocal(workspace: Workspace) {
  const temp = localFilename + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(workspace, null, 2), { mode: 0o600 });
  fs.renameSync(temp, localFilename);
}

function loadLocal() {
  if (localState) return localState;
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  localState = recoverInterruptedScans(
    fs.existsSync(localFilename) ? JSON.parse(fs.readFileSync(localFilename, 'utf8')) : seed(),
  );
  saveLocal(localState);
  return localState;
}

function workspacePath(userId: string) {
  const id = crypto.createHash('sha256').update(userId).digest('hex');
  return `workspaces/${id}.json`;
}

export async function loadWorkspace(userId: string): Promise<Workspace> {
  if (!hosted) return loadLocal();
  const result = await get(workspacePath(userId), { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return seed();
  return JSON.parse(await new Response(result.stream).text()) as Workspace;
}

export async function saveWorkspace(userId: string, workspace: Workspace): Promise<void> {
  if (!hosted) {
    localState = workspace;
    saveLocal(workspace);
    return;
  }

  const snapshot = JSON.stringify(workspace);
  const previous = writes.get(userId) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      await put(workspacePath(userId), snapshot, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
      });
    });
  writes.set(userId, current);
  try {
    await current;
  } finally {
    if (writes.get(userId) === current) writes.delete(userId);
  }
}
