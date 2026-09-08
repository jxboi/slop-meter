import type { Finding } from './types.js';

export type ComplexityHeatCell = {
  file: string;
  area: string;
  evidenceCount: number;
  findings: Finding[];
  signal: number;
  level: 1 | 2 | 3 | 4;
};

export type ComplexityHeatGroup = {
  area: string;
  cells: ComplexityHeatCell[];
  signal: number;
};

const severityWeight: Record<Finding['severity'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function areaFor(file: string) {
  const [first, second] = file.split('/');
  if (!second) return 'Repository root';
  if (first === 'src' && file.split('/').length > 2) return `${first}/${second}`;
  return first;
}

export function buildComplexityHeatMap(findings: Finding[]): ComplexityHeatGroup[] {
  const cells = new Map<string, ComplexityHeatCell>();

  for (const finding of findings.filter((item) => item.dimension === 'Complexity')) {
    for (const evidence of finding.evidence) {
      const current = cells.get(evidence.file) || {
        file: evidence.file,
        area: areaFor(evidence.file),
        evidenceCount: 0,
        findings: [],
        signal: 0,
        level: 1 as const,
      };
      current.evidenceCount += 1;
      if (!current.findings.some((item) => item.id === finding.id)) current.findings.push(finding);
      current.signal +=
        severityWeight[finding.severity] *
        (0.55 + finding.confidence / 200) *
        (0.65 + finding.score / 200);
      cells.set(evidence.file, current);
    }
  }

  const groups = new Map<string, ComplexityHeatGroup>();
  for (const cell of cells.values()) {
    const normalized = Math.min(1, cell.signal / 5);
    cell.level = (normalized > 0.75 ? 4 : normalized > 0.5 ? 3 : normalized > 0.25 ? 2 : 1) as
      1 | 2 | 3 | 4;
    cell.findings.sort((a, b) => b.score - a.score);
    const group = groups.get(cell.area) || { area: cell.area, cells: [], signal: 0 };
    group.cells.push(cell);
    group.signal += cell.signal;
    groups.set(cell.area, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      cells: group.cells.sort((a, b) => b.signal - a.signal || a.file.localeCompare(b.file)),
    }))
    .sort((a, b) => b.signal - a.signal || a.area.localeCompare(b.area));
}
