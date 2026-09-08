import test from 'node:test';
import assert from 'node:assert/strict';
import { optimisticUpdate } from '../server/store.js';

test('optimistic updates retry conflicts without losing a concurrent change', async () => {
  let persisted = { repositories: ['existing'], settingsVersion: 1 };
  let version = 1;
  let firstWrite = true;

  const result = await optimisticUpdate(
    async () => ({ state: structuredClone(persisted), version: String(version) }),
    async (next, expectedVersion) => {
      if (firstWrite) {
        firstWrite = false;
        persisted = { ...persisted, settingsVersion: 2 };
        version++;
      }
      if (expectedVersion !== String(version)) throw new Error('conflict');
      persisted = structuredClone(next);
      version++;
    },
    (state) => {
      state.repositories.push('new');
      return state.repositories.length;
    },
    (error) => error instanceof Error && error.message === 'conflict',
  );

  assert.equal(result, 2);
  assert.deepEqual(persisted, { repositories: ['existing', 'new'], settingsVersion: 2 });
});
