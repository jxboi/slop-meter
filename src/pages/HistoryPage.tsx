import type { Workspace } from '../types';
import { useState } from 'react';
import { ArrowRight, RefreshCw, Check, X } from 'lucide-react';
import type { Profile, Harness, Scan } from '../types';
import { post, relative } from '../api';
import { Badge, Empty, Modal } from '../components/ui';
import { patternById } from '../slopTaxonomy';
type Shared = {
  data: Workspace;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
export function HistoryPage({ data, refresh, notify }: Shared) {
  const [filter, setFilter] = useState('all'),
    [selected, setSelected] = useState<Scan | null>(null);
  const scans = data.scans.filter((s) => filter === 'all' || s.status === filter);
  return (
    <>
      <div className="list-toolbar">
        <span className="muted">Every scan is a snapshot of your codebase.</span>
        <select
          aria-label="Filter scan history"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All scans</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="panel table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Status</th>
              <th>Harness & model</th>
              <th>Depth</th>
              <th>Health</th>
              <th>Started</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.id}>
                <td>
                  <button className="repo-name" onClick={() => setSelected(s)}>
                    {s.repoName}
                  </button>
                  {s.demo && <small>Sample scan</small>}
                </td>
                <td>
                  <Badge
                    tone={
                      s.status === 'completed' ? 'green' : s.status === 'failed' ? 'red' : 'neutral'
                    }
                  >
                    {s.status === 'running' ? (
                      <RefreshCw size={12} className="spin" />
                    ) : s.status === 'completed' ? (
                      <Check size={12} />
                    ) : null}
                    {s.status}
                  </Badge>
                </td>
                <td>
                  {s.harness}
                  <small>{s.model || 'Default model'}</small>
                </td>
                <td className="capitalize">{s.depth}</td>
                <td>{s.health ?? '—'}</td>
                <td className="muted">{relative(s.startedAt)}</td>
                <td>
                  {s.status === 'running' ? (
                    <button
                      className="icon-button"
                      aria-label="Cancel scan"
                      onClick={async () => {
                        await post('/scans/' + s.id + '/cancel', {});
                        await refresh();
                        notify('Cancellation requested');
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label={`View scan for ${s.repoName}`}
                      onClick={() => setSelected(s)}
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!scans.length && (
          <Empty title="No scans here yet">
            Your completed and in-progress scans will appear here.
          </Empty>
        )}
      </div>
      {selected && (
        <Modal title="Scan details" wide onClose={() => setSelected(null)}>
          <div className="scan-detail">
            <Badge tone={selected.status === 'failed' ? 'red' : 'green'}>{selected.status}</Badge>
            <h3>{selected.repoName}</h3>
            <dl>
              <dt>Started</dt>
              <dd>{new Date(selected.startedAt).toLocaleString()}</dd>
              <dt>Harness</dt>
              <dd>
                {selected.harness} · {selected.model || 'Default model'}
              </dd>
              <dt>Depth / effort</dt>
              <dd>
                {selected.depth} / {selected.effort}
              </dd>
              <dt>Profile</dt>
              <dd>
                {selected.profileSnapshot?.name ||
                  data.profiles.find((p) => p.id === selected.profileId)?.name}
              </dd>
              <dt>Source commit</dt>
              <dd>{selected.commit?.slice(0, 12) || 'Local working tree / sample'}</dd>
              <dt>Knowledge snapshot</dt>
              <dd>{selected.knowledgeIds?.join(', ') || 'No live sources used'}</dd>
            </dl>
            {selected.error && <div className="form-error">{selected.error}</div>}
            <div className="info-box">{selected.coverage || selected.phase}</div>
            {selected.findings && (
              <>
                <h3>{selected.findings.length} root causes in this snapshot</h3>
                {selected.findings.map((f) => (
                  <div className="snapshot-row" key={f.id}>
                    <span>
                      {f.title}
                      <small>
                        {f.dimension} · {patternById.get(f.patternId)?.title}
                      </small>
                    </span>
                    <Badge>{f.confidence}%</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
