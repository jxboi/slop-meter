import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComplexityHeatMap } from '../src/complexityHeatMap';
import type { Finding } from '../src/types';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'complexity-1',
    repoId: 'repo',
    title: 'Reduce indirection',
    dimension: 'Complexity',
    patternId: 'unnecessary-abstractions',
    severity: 'medium',
    impact: 5,
    risk: 4,
    blastRadius: 3,
    effort: 4,
    confidence: 80,
    findings: 1,
    patterns: 1,
    why: 'Why',
    steps: [],
    dependencies: [],
    unlocks: 0,
    evidence: [
      { file: 'src/services/account.ts', line: 1, snippet: 'code', explanation: 'Evidence' },
    ],
    sources: [],
    status: 'open',
    score: 60,
    ...overrides,
  };
}

test('complexity heat map groups cited files and ignores other dimensions', () => {
  const groups = buildComplexityHeatMap([
    finding(),
    finding({
      id: 'complexity-2',
      severity: 'high',
      evidence: [
        { file: 'src/services/account.ts', line: 20, snippet: 'code', explanation: 'Evidence' },
        { file: 'server/index.ts', line: 10, snippet: 'code', explanation: 'Evidence' },
      ],
    }),
    finding({ id: 'security', dimension: 'Security', evidence: [] }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.area),
    ['src/services', 'server'],
  );
  assert.equal(groups[0].cells[0].file, 'src/services/account.ts');
  assert.equal(groups[0].cells[0].evidenceCount, 2);
  assert.deepEqual(
    groups[0].cells[0].findings.map((item) => item.id),
    ['complexity-1', 'complexity-2'],
  );
});

test('complexity heat map orders stronger files first and handles empty input', () => {
  const low = finding({
    id: 'low',
    severity: 'low',
    confidence: 60,
    score: 20,
    evidence: [{ file: 'src/a.ts', line: 1, snippet: 'a', explanation: 'Low' }],
  });
  const high = finding({
    id: 'high',
    severity: 'critical',
    confidence: 100,
    score: 95,
    evidence: [{ file: 'src/b.ts', line: 1, snippet: 'b', explanation: 'High' }],
  });

  assert.deepEqual(
    buildComplexityHeatMap([low, high])[0].cells.map((cell) => cell.file),
    ['src/b.ts', 'src/a.ts'],
  );
  assert.deepEqual(buildComplexityHeatMap([]), []);
});
