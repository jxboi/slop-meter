import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { seed } from './seed.js';
import type { Workspace } from '../src/types.js';
import { normalizeWorkspace } from './migrate.js';

export const hosted = process.env.VERCEL === '1';
export const dataDir = hosted
  ? path.join(os.tmpdir(), 'slop-meter')
  : path.resolve(process.env.SLOP_DATA_DIR || '.data');

const localFilename = path.join(dataDir, 'workspace.json');
let localState: Workspace | undefined;

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
  normalizeWorkspace(localState as Workspace & Record<string, unknown>);
  saveLocal(localState);
  return localState;
}

function workspacePath(userId: string) {
  const id = crypto.createHash('sha256').update(userId).digest('hex');
  return `workspaces/${id}.json`;
}

export async function loadWorkspace(userId: string): Promise<Workspace> {
  if (!hosted) return loadLocal();
  const result = await readHosted(userId);
  if (!result) return seed();
  const { workspace, etag } = result;
  if (normalizeWorkspace(workspace as Workspace & Record<string, unknown>)) {
    try {
      await persistHosted(userId, workspace, etag);
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError)) throw error;
    }
  }
  return workspace;
}

async function readHosted(userId: string) {
  const result = await get(workspacePath(userId), { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return {
    workspace: JSON.parse(await new Response(result.stream).text()) as Workspace,
    etag: result.blob.etag,
  };
}

async function persistHosted(userId: string, workspace: Workspace, etag?: string) {
  await put(workspacePath(userId), JSON.stringify(workspace), {
    access: 'private',
    addRandomSuffix: false,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function optimisticUpdate<State, Result>(
  read: () => Promise<{ state: State; version?: string }>,
  write: (state: State, version?: string) => Promise<void>,
  mutate: (state: State) => Result,
  isConflict: (error: unknown, version?: string) => boolean,
  attempts = 8,
): Promise<Result> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { state, version } = await read();
    const result = mutate(state);
    try {
      await write(state, version);
      return result;
    } catch (error) {
      if (!isConflict(error, version) || attempt === attempts - 1) throw error;
    }
  }
  throw new Error('Optimistic update exhausted its retry budget.');
}

export async function updateWorkspace<T>(
  userId: string,
  mutate: (workspace: Workspace) => T,
): Promise<T> {
  if (!hosted) {
    const workspace = loadLocal();
    const result = mutate(workspace);
    normalizeWorkspace(workspace as Workspace & Record<string, unknown>);
    localState = workspace;
    saveLocal(workspace);
    return result;
  }

  return optimisticUpdate(
    async () => {
      const current = await readHosted(userId);
      const state = current?.workspace || seed();
      normalizeWorkspace(state as Workspace & Record<string, unknown>);
      return { state, version: current?.etag };
    },
    (state, version) => persistHosted(userId, state, version),
    mutate,
    (error) => error instanceof BlobPreconditionFailedError,
  );
}
