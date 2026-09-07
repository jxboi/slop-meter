import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed';
import type { Workspace } from '../src/types';
export const dataDir = path.resolve(process.env.SLOP_DATA_DIR || '.data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const filename = path.join(dataDir, 'workspace.json');
export const state: Workspace = fs.existsSync(filename)
  ? JSON.parse(fs.readFileSync(filename, 'utf8'))
  : seed();
export function save() {
  const temp = filename + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(temp, filename);
}
for (const scan of state.scans)
  if (scan.status === 'running') {
    scan.status = 'failed';
    scan.error = 'The server restarted before this scan completed.';
    scan.phase = 'Interrupted';
  }
save();
