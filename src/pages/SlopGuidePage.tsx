import { useMemo, useState } from 'react';
import {
  Bug,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Gauge,
  Layers3,
  Puzzle,
  Scale,
  Search,
  ShieldCheck,
  Wrench,
  Workflow,
} from 'lucide-react';
import {
  dimensionDescriptions,
  patternById,
  patternsByDimension,
  slopDimensions,
  slopPatterns,
  type SlopDimension,
  type SlopPatternId,
} from '../slopTaxonomy';

const icons = {
  Complexity: Workflow,
  Maintainability: Wrench,
  Correctness: Bug,
  Architecture: Layers3,
  Security: ShieldCheck,
  Performance: Gauge,
  'Repository Fit': Puzzle,
  'AI Fingerprints': Fingerprint,
} satisfies Record<SlopDimension, typeof Puzzle>;

export function SlopGuidePage({ initialPattern }: { initialPattern?: string }) {
  const directPattern = patternById.get(initialPattern as SlopPatternId);
  const [dimension, setDimension] = useState<SlopDimension>(
    directPattern?.dimension || 'Repository Fit',
  );
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<SlopPatternId | null>(directPattern?.id || null);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return patternsByDimension[dimension];
    return slopPatterns.filter((pattern) =>
      [pattern.title, pattern.dimension, ...pattern.examples]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [dimension, query]);
  const Icon = icons[dimension];
  return (
    <div className="guide-page">
      <section className="guide-principle">
        <span className="guide-principle-icon">
          <Scale size={29} />
        </span>
        <div>
          <h2>“Does this code introduce more complexity than the value it provides?”</h2>
          <p>
            Repository Fit carries the most weight. When code doesn’t align with the existing
            codebase, it creates friction that compounds over time.
          </p>
        </div>
      </section>
      <div className="guide-frame">
        <aside className="guide-index" aria-label="Slop dimensions">
          <label className="guide-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 40 patterns"
              aria-label="Search 40 patterns"
            />
          </label>
          <p className="guide-count">
            40 patterns <span>·</span> 8 dimensions
          </p>
          <nav>
            {slopDimensions.map((item) => {
              const DimensionIcon = icons[item];
              return (
                <button
                  key={item}
                  className={item === dimension && !query ? 'active' : ''}
                  onClick={() => {
                    setDimension(item);
                    setQuery('');
                    setExpanded(null);
                  }}
                  aria-current={item === dimension && !query ? 'page' : undefined}
                >
                  <DimensionIcon size={19} />
                  <span>{item}</span>
                  <ChevronRight className="guide-dimension-arrow" size={16} />
                </button>
              );
            })}
          </nav>
        </aside>
        <section className="guide-detail" aria-live="polite">
          <header>
            <span className="guide-detail-icon">
              {query ? <Search size={27} /> : <Icon size={29} />}
            </span>
            <div>
              <h2>{query ? 'Search results' : dimension}</h2>
              <p>
                {query
                  ? `${matches.length} ${matches.length === 1 ? 'pattern' : 'patterns'} match “${query.trim()}”.`
                  : dimensionDescriptions[dimension]}
              </p>
            </div>
          </header>
          <div className="guide-patterns">
            <h3>{query ? 'Matching patterns' : 'Common patterns'}</h3>
            {matches.length ? (
              <div className="guide-pattern-list">
                {matches.map((pattern) => {
                  const open = expanded === pattern.id;
                  return (
                    <article className={open ? 'open' : ''} key={pattern.id} id={pattern.id}>
                      <button
                        aria-expanded={open}
                        aria-controls={`${pattern.id}-examples`}
                        onClick={() => {
                          setDimension(pattern.dimension);
                          setExpanded(open ? null : pattern.id);
                        }}
                      >
                        <span className="guide-pattern-number">
                          {String(slopPatterns.indexOf(pattern) + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <strong>{pattern.title}</strong>
                          {query && <small>{pattern.dimension}</small>}
                        </span>
                        <ChevronDown size={17} />
                      </button>
                      {open && (
                        <ul id={`${pattern.id}-examples`}>
                          {pattern.examples.map((example) => (
                            <li key={example}>{example}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="guide-empty">
                <Search size={23} />
                <h3>No matching patterns</h3>
                <p>Try a broader term such as testing, naming, dependency, or error.</p>
                <button onClick={() => setQuery('')}>Clear search</button>
              </div>
            )}
          </div>
          <footer>
            <div>
              <h3>Used in scans</h3>
              <p>
                Every finding is assigned one dimension and one pattern. The rubric guides
                discovery; source evidence still determines what becomes a recommendation.
              </p>
            </div>
            <a href="#knowledge">
              Learn more in Living knowledge <span aria-hidden="true">→</span>
            </a>
          </footer>
        </section>
      </div>
    </div>
  );
}
