import type { Workspace } from '../types';
import { useState } from 'react';
import { Clock3, RefreshCw, ExternalLink, Check, FileCode2, ShieldCheck } from 'lucide-react';
import { post, relative } from '../api';
import { Badge } from '../components/ui';
type Shared = {
  data: Workspace;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
export function KnowledgePage({ data, refresh, notify }: Shared) {
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('All sources');
  return (
    <>
      <div className="knowledge-banner">
        <div className="knowledge-mark">
          <RefreshCw size={26} />
        </div>
        <div>
          <h2>Good advice keeps learning.</h2>
          <p>
            Authoritative guidance, refreshed before AI scans and matched against your repository’s
            dependencies.
          </p>
        </div>
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await post('/knowledge/refresh', {});
              await refresh();
              notify('Source refresh complete. Check each source for its status.');
            } catch (e) {
              notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw className={busy ? 'spin' : ''} size={16} />
          {busy ? 'Refreshing…' : 'Refresh sources'}
        </button>
      </div>
      <div className="source-filters">
        {['All sources', ...new Set(data.knowledge.map((k) => k.category))].map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="knowledge-list">
        {data.knowledge
          .filter((k) => category === 'All sources' || k.category === category)
          .map((k) => (
            <article className="knowledge-card" key={k.id}>
              <div className="source-logo">
                {k.category === 'Security' ? <ShieldCheck size={23} /> : <FileCode2 size={23} />}
              </div>
              <div className="source-info">
                <div>
                  <h3>{k.title}</h3>
                  <Badge>{k.category}</Badge>
                </div>
                <p>{k.context}</p>
                <a href={k.url} target="_blank" rel="noreferrer">
                  {new URL(k.url).hostname}
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="source-status">
                {k.error ? (
                  <Badge tone="orange">Refresh failed</Badge>
                ) : k.fetchedAt ? (
                  <Badge tone="green">
                    <Check size={12} />
                    Retrieved
                  </Badge>
                ) : (
                  <Badge>Not fetched yet</Badge>
                )}
                <small>
                  {k.error ||
                    (k.fetchedAt
                      ? `Updated ${relative(k.fetchedAt)}`
                      : 'Fetched on your next AI scan')}
                </small>
                {k.hash && <code>{k.hash}</code>}
              </div>
            </article>
          ))}
      </div>
      <div className="info-box page-note">
        <Clock3 size={18} />
        Each AI scan records source versions and retrieval times. Live documentation is context, not
        proof that a recommendation applies to every framework version.
      </div>
    </>
  );
}
