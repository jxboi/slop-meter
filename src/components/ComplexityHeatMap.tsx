import { Grid3X3, Map } from 'lucide-react';
import type { Finding } from '../types';
import { buildComplexityHeatMap } from '../complexityHeatMap';
import { Empty, SectionTitle } from './ui';

const levelLabels = ['Low', 'Moderate', 'High', 'Concentrated'] as const;

export function ComplexityHeatMap({
  findings,
  onSelect,
}: {
  findings: Finding[];
  onSelect: (finding: Finding) => void;
}) {
  const groups = buildComplexityHeatMap(findings);
  const cells = groups.flatMap((group) => group.cells);
  const citedLocations = cells.reduce((sum, cell) => sum + cell.evidenceCount, 0);

  return (
    <section className="complexity-section" aria-label="Complexity heat map">
      <SectionTitle
        title="Where complexity collects"
        subtitle="Cited complexity evidence from the latest scan, grouped by codebase area."
        action={
          cells.length ? (
            <span className="complexity-map-count">
              <Grid3X3 size={14} />
              {cells.length} hotspot {cells.length === 1 ? 'file' : 'files'}
            </span>
          ) : undefined
        }
      />
      {!cells.length ? (
        <div className="panel complexity-empty">
          <Empty title="No cited complexity hotspots">
            The latest scan did not return source-linked findings in the Complexity dimension.
          </Empty>
        </div>
      ) : (
        <>
          <div className="complexity-summary" aria-label="Complexity heat map summary">
            <div>
              <strong>{cells.length}</strong>
              <span>files with signals</span>
            </div>
            <div>
              <strong>{citedLocations}</strong>
              <span>cited locations</span>
            </div>
            <div>
              <strong>{groups[0].area}</strong>
              <span>strongest area</span>
            </div>
          </div>
          <div className="panel complexity-map">
            <div className="complexity-map-heading">
              <div>
                <Map size={16} />
                <span>Repository heat map</span>
              </div>
              <div className="complexity-legend" aria-label="Signal strength legend">
                {levelLabels.map((label, index) => (
                  <span key={label}>
                    <i className={`heat-swatch heat-${index + 1}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="complexity-groups">
              {groups.map((group) => (
                <section className="complexity-group" key={group.area}>
                  <div className="complexity-group-heading">
                    <strong>{group.area}</strong>
                    <span>
                      {group.cells.length} {group.cells.length === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                  <div className="complexity-tiles">
                    {group.cells.map((cell) => {
                      const label = levelLabels[cell.level - 1];
                      const filename = cell.file.split('/').at(-1) || cell.file;
                      return (
                        <button
                          className={`complexity-tile heat-${cell.level}`}
                          key={cell.file}
                          onClick={() => onSelect(cell.findings[0])}
                          aria-label={`${cell.file}: ${label.toLowerCase()} complexity signal. Open ${cell.findings[0].title}.`}
                          title={`${cell.file}\n${cell.findings.map((finding) => finding.title).join('\n')}`}
                        >
                          <strong>{filename}</strong>
                          <span>{cell.file}</span>
                          <small>
                            {label} · {cell.evidenceCount} cited{' '}
                            {cell.evidenceCount === 1 ? 'location' : 'locations'}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <p className="complexity-map-note">
              Color combines evidence count, severity, confidence, and priority. It is a relative
              scan signal, not a cyclomatic-complexity measurement.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
