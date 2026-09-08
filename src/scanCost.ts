import type { Scan } from './types';

export function scanCostUsd(scan: Scan) {
  if (scan.harness === 'static') return 0;
  return scan.usage?.estimatedCostUsd ?? null;
}

export function costPerFindingUsd(scan: Scan) {
  const cost = scanCostUsd(scan);
  if (cost === null || scan.status !== 'completed' || scan.findingCount === undefined) return null;
  return scan.findingCount > 0 ? cost / scan.findingCount : cost;
}

export function formatUsd(value: number | null) {
  if (value === null) return '—';
  if (value > 0 && value < 0.0001) return '<$0.0001';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);
}
