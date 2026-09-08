import type { ScanUsage } from '../src/types.js';

export const PRICING_VERSION = '2026-09-08';

type Pricing = NonNullable<ScanUsage['pricing']>;

function pricingFor(harness: string, model: string): Pricing | undefined {
  if (harness === 'openai' && /^gpt-5\.4(?:-\d{4}-\d{2}-\d{2})?$/.test(model)) {
    return {
      version: PRICING_VERSION,
      model,
      inputPerMillion: 2.5,
      cachedInputPerMillion: 0.25,
      cacheWriteInputPerMillion: 2.5,
      outputPerMillion: 15,
      longContextThreshold: 272_000,
      longContextInputMultiplier: 2,
      longContextOutputMultiplier: 1.5,
    };
  }
  if (harness === 'anthropic' && /^claude-sonnet-4-6(?:-\d{8})?$/.test(model)) {
    return {
      version: PRICING_VERSION,
      model,
      inputPerMillion: 3,
      cachedInputPerMillion: 0.3,
      cacheWriteInputPerMillion: 3.75,
      outputPerMillion: 15,
    };
  }
}

export function apiUsage(
  harness: 'openai' | 'anthropic',
  model: string,
  raw: Record<string, unknown> | undefined,
): ScanUsage {
  const details = (raw?.input_tokens_details || {}) as Record<string, unknown>;
  const totalInput = Number(raw?.input_tokens) || 0;
  const cachedInputTokens =
    harness === 'openai'
      ? Number(details.cached_tokens) || 0
      : Number(raw?.cache_read_input_tokens) || 0;
  const cacheWriteInputTokens =
    harness === 'anthropic' ? Number(raw?.cache_creation_input_tokens) || 0 : 0;
  const uncachedInputTokens =
    harness === 'openai' ? Math.max(0, totalInput - cachedInputTokens) : totalInput;
  const outputTokens = Number(raw?.output_tokens) || 0;
  const pricing = pricingFor(harness, model);
  const usage: ScanUsage = {
    uncachedInputTokens,
    cachedInputTokens,
    cacheWriteInputTokens,
    outputTokens,
  };
  if (!raw) return usage;
  if (!pricing) return usage;

  const inputTotal = uncachedInputTokens + cachedInputTokens + cacheWriteInputTokens;
  const longContext =
    pricing.longContextThreshold !== undefined && inputTotal > pricing.longContextThreshold;
  const inputMultiplier = longContext ? pricing.longContextInputMultiplier || 1 : 1;
  const outputMultiplier = longContext ? pricing.longContextOutputMultiplier || 1 : 1;
  usage.estimatedCostUsd =
    ((uncachedInputTokens * pricing.inputPerMillion +
      cachedInputTokens * pricing.cachedInputPerMillion +
      cacheWriteInputTokens * pricing.cacheWriteInputPerMillion) *
      inputMultiplier +
      outputTokens * pricing.outputPerMillion * outputMultiplier) /
    1_000_000;
  usage.pricing = pricing;
  return usage;
}

export function mergeScanUsage(current: ScanUsage | undefined, next: ScanUsage): ScanUsage {
  const priced =
    next.estimatedCostUsd !== undefined && (!current || current.estimatedCostUsd !== undefined);
  return {
    uncachedInputTokens: (current?.uncachedInputTokens || 0) + next.uncachedInputTokens,
    cachedInputTokens: (current?.cachedInputTokens || 0) + next.cachedInputTokens,
    cacheWriteInputTokens: (current?.cacheWriteInputTokens || 0) + next.cacheWriteInputTokens,
    outputTokens: (current?.outputTokens || 0) + next.outputTokens,
    estimatedCostUsd: priced
      ? (current?.estimatedCostUsd || 0) + next.estimatedCostUsd!
      : undefined,
    pricing: current?.pricing || next.pricing,
  };
}
