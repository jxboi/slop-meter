import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUsage, mergeScanUsage } from '../server/cost';
import { costPerFindingUsd, formatUsd, scanCostUsd } from '../src/scanCost';
import type { Scan } from '../src/types';

test('OpenAI pricing separates cached input and applies long-context rates per call', () => {
  const normal = apiUsage('openai', 'gpt-5.4', {
    input_tokens: 1_000_000,
    input_tokens_details: { cached_tokens: 200_000 },
    output_tokens: 100_000,
  });
  assert.equal(normal.uncachedInputTokens, 800_000);
  assert.equal(normal.cachedInputTokens, 200_000);
  assert.equal(normal.estimatedCostUsd, 6.35);
});

test('Anthropic pricing and scan accumulation include every provider call', () => {
  const first = apiUsage('anthropic', 'claude-sonnet-4-6', {
    input_tokens: 100_000,
    cache_creation_input_tokens: 10_000,
    cache_read_input_tokens: 20_000,
    output_tokens: 10_000,
  });
  const total = mergeScanUsage(first, first);
  assert.equal(first.estimatedCostUsd, 0.4935);
  assert.equal(total.uncachedInputTokens, 200_000);
  assert.equal(total.estimatedCostUsd, 0.987);
});

test('unknown models retain usage without inventing a cost', () => {
  const usage = apiUsage('openai', 'custom-model', {
    input_tokens: 100,
    output_tokens: 20,
  });
  assert.equal(usage.uncachedInputTokens, 100);
  assert.equal(usage.estimatedCostUsd, undefined);
  assert.equal(usage.pricing, undefined);
});

test('scan cost helpers cover static, unavailable, findings, and zero findings', () => {
  const base = {
    id: 'scan',
    repoId: 'repo',
    repoName: 'owner/repo',
    startedAt: new Date().toISOString(),
    status: 'completed',
    phase: 'Complete',
    progress: 100,
    harness: 'openai',
    model: 'gpt-5.4',
    effort: 'medium',
    depth: 'quick',
    profileId: 'balanced',
  } satisfies Scan;
  const paid = {
    ...base,
    findingCount: 4,
    usage: { ...apiUsage('openai', 'gpt-5.4', { input_tokens: 400_000, output_tokens: 0 }) },
  };
  assert.equal(costPerFindingUsd(paid), scanCostUsd(paid)! / 4);
  assert.equal(costPerFindingUsd({ ...paid, findingCount: 0 }), scanCostUsd(paid));
  assert.equal(scanCostUsd({ ...base, harness: 'static' }), 0);
  assert.equal(scanCostUsd({ ...base, harness: 'codex' }), null);
  assert.equal(formatUsd(null), '—');
  assert.equal(formatUsd(0), '$0.00');
  assert.equal(formatUsd(0.00001), '<$0.0001');
});
