import type { Finding, Profile, Workspace } from '../src/types.js';
import {
  isSlopDimension,
  isSlopPatternId,
  patternById,
  slopDimensions,
  type SlopDimension,
  type SlopPatternId,
} from '../src/slopTaxonomy.js';

export const WORKSPACE_SCHEMA_VERSION = 2;

const legacyFindingMap: Record<string, [SlopDimension, SlopPatternId]> = {
  Architecture: ['Architecture', 'poor-architecture-boundaries'],
  Security: ['Security', 'security-slop'],
  Simplicity: ['Complexity', 'complexity-without-value'],
  Testing: ['Maintainability', 'testing-slop'],
  Duplication: ['Maintainability', 'copy-paste-duplication'],
  Performance: ['Performance', 'performance-slop'],
  Naming: ['Maintainability', 'meaningless-naming'],
  Reliability: ['Correctness', 'error-handling-slop'],
};

const findingIdPatterns: Record<string, SlopPatternId> = {
  'module-boundaries': 'god-objects-god-functions',
  'dynamic-execution': 'security-slop',
  'error-boundaries': 'error-handling-slop',
  'test-seams': 'testing-slop',
  'duplicate-modules': 'copy-paste-duplication',
  'service-boundary': 'poor-architecture-boundaries',
  'auth-boundary': 'security-slop',
  'data-fetching': 'copy-paste-duplication',
  'error-contract': 'error-handling-slop',
  'token-cleanup': 'unnecessary-abstractions',
};

function profileWeights(source: Record<string, number> = {}) {
  const value = (key: string, fallback = 3) =>
    Number.isInteger(source[key]) ? Math.max(0, Math.min(5, source[key])) : fallback;
  const average = (...keys: string[]) =>
    Math.round(keys.reduce((sum, key) => sum + value(key), 0) / keys.length);
  return {
    Complexity: value('Complexity', value('Simplicity', 4)),
    Maintainability: value('Maintainability', average('Testing', 'Duplication', 'Naming')),
    Correctness: value('Correctness', value('Reliability', value('Testing', 4))),
    Architecture: value('Architecture', 4),
    Security: value('Security', 4),
    Performance: value('Performance', 3),
    'Repository Fit': value(
      'Repository Fit',
      Math.max(value('Architecture', 4), value('Naming', 2)),
    ),
    'AI Fingerprints': value(
      'AI Fingerprints',
      Math.round((value('Simplicity', 4) + value('Naming', 2)) / 2),
    ),
  } satisfies Profile['weights'];
}

function normalizeFinding(finding: Finding & Record<string, unknown>) {
  let changed = false;
  const category = typeof finding.category === 'string' ? finding.category : undefined;
  let dimension = isSlopDimension(finding.dimension) ? finding.dimension : undefined;
  let patternId = isSlopPatternId(finding.patternId) ? finding.patternId : undefined;

  if (patternId && (!dimension || patternById.get(patternId)?.dimension !== dimension)) {
    dimension = patternById.get(patternId)?.dimension;
    changed = true;
  }
  if (!patternId) {
    const suffix = Object.keys(findingIdPatterns).find((key) => finding.id.endsWith(key));
    patternId = suffix ? findingIdPatterns[suffix] : legacyFindingMap[category || '']?.[1];
    patternId ||= 'complexity-without-value';
    changed = true;
  }
  if (!dimension) {
    dimension = patternById.get(patternId)?.dimension || legacyFindingMap[category || '']?.[0];
    dimension ||= 'Complexity';
    changed = true;
  }
  if (category && !finding.legacyCategory) {
    finding.legacyCategory = category;
    changed = true;
  }
  if ('category' in finding) {
    delete finding.category;
    changed = true;
  }
  if (finding.dimension !== dimension) {
    finding.dimension = dimension;
    changed = true;
  }
  if (finding.patternId !== patternId) {
    finding.patternId = patternId;
    changed = true;
  }
  return changed;
}

export function normalizeWorkspace(workspace: Workspace & Record<string, unknown>) {
  let changed = workspace.schemaVersion !== WORKSPACE_SCHEMA_VERSION;
  for (const repo of workspace.repos || []) {
    for (const finding of repo.findings || []) {
      changed = normalizeFinding(finding as Finding & Record<string, unknown>) || changed;
    }
  }
  for (const scan of workspace.scans || []) {
    for (const finding of scan.findings || []) {
      changed = normalizeFinding(finding as Finding & Record<string, unknown>) || changed;
    }
    if (scan.profileSnapshot) {
      const weights = profileWeights(scan.profileSnapshot.weights as Record<string, number>);
      if (JSON.stringify(weights) !== JSON.stringify(scan.profileSnapshot.weights)) {
        scan.profileSnapshot.weights = weights;
        changed = true;
      }
    }
  }
  for (const profile of workspace.profiles || []) {
    const weights = profileWeights(profile.weights as Record<string, number>);
    if (
      slopDimensions.some((dimension) => profile.weights[dimension] !== weights[dimension]) ||
      Object.keys(profile.weights).length !== slopDimensions.length
    ) {
      profile.weights = weights;
      changed = true;
    }
  }
  workspace.schemaVersion = WORKSPACE_SCHEMA_VERSION;
  return changed;
}
