import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanRequestSchema, splitScanRequest } from '../server/scanRequest';

test('per-scan API keys are removed from data prepared for persistence', () => {
  const secret = 'sk-private-byok-test-key';
  const { apiKey, input } = splitScanRequest(
    scanRequestSchema.parse({
      repoId: 'repo',
      harness: 'openai',
      model: 'gpt-5.4',
      effort: 'medium',
      depth: 'quick',
      profileId: 'profile',
      apiKey: secret,
    }),
  );

  assert.equal(apiKey, secret);
  assert.equal('apiKey' in input, false);
  assert.equal(JSON.stringify(input).includes(secret), false);
});
