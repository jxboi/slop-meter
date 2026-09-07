import { useState } from 'react';
import { Download, Trash2, ScanLine, ShieldCheck } from 'lucide-react';
import type { Repo, Finding } from '../types';
import { api, relative } from '../api';
import { PriorityList } from '../components/Priorities';
import { HealthChart } from '../components/HealthChart';
import { Badge, SectionTitle } from '../components/ui';

export function RepositoryPage({
  repo,
  onFinding,
  onScan,
  onRemove,
}: {
  repo: Repo;
  onFinding: (f: Finding) => void;
  onScan: () => void;
  onRemove: () => void;
}) {
  const [tab, setTab] = useState('Priorities');
  return (
    <>
      <div className="repo-overview">
        <div className="repo-health-large">
          <span
            className="health-ring"
            style={{ '--score': `${(repo.health || 0) * 3.6}deg` } as React.CSSProperties}
          >
            <strong>
              {repo.health ?? '—'}
              <small>/100</small>
            </strong>
          </span>
          <div>
            <h2>
              {repo.health === null
                ? 'Your starting point awaits'
                : repo.analysis?.harness === 'static'
                  ? 'Baseline inspection complete'
                  : repo.health >= 80
                    ? 'A solid foundation'
                    : repo.health >= 65
                      ? 'Moving in the right direction'
                      : 'A few decisions can change a lot'}
            </h2>
            <p>
              {repo.files.toLocaleString()} {repo.files === 1 ? 'file' : 'files'} <span>·</span>{' '}
              {repo.stack} <span>·</span> {relative(repo.lastScan)}
            </p>
            <Badge tone={repo.demo ? 'neutral' : 'green'}>
              {repo.demo
                ? 'Sample repository'
                : repo.source === 'local'
                  ? 'Local repository'
                  : 'GitHub repository'}
            </Badge>
          </div>
        </div>
        <button className="button" onClick={onScan}>
          <ScanLine size={16} />
          Rescan repository
        </button>
      </div>
      {repo.analysis?.harness === 'static' && (
        <div className="info-box baseline-scope">
          <ShieldCheck size={18} />
          <span>
            Local baseline · Limited structural signals. This score does not establish security or
            correctness. Run an AI scan for contextual diagnosis.
          </span>
        </div>
      )}
      <div className="tabs page-tabs">
        {['Priorities', 'Health trend', 'Repository details'].map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <a className="export-link" href={`/api/export/${repo.id}`} download>
          <Download size={15} />
          Export roadmap
        </a>
      </div>
      {tab === 'Priorities' && (
        <>
          <SectionTitle
            title="What should you fix first?"
            subtitle="Start with the cause. Work through the dependencies."
          />
          <PriorityList findings={repo.findings} repos={[repo]} onSelect={onFinding} />
        </>
      )}
      {tab === 'Health trend' && (
        <div className="trend-full">
          <HealthChart repos={[repo]} />
          <div className="info-box">
            Health is measured on completed scans. Compare scans using the same harness, scope, and
            profile for meaningful trends.
          </div>
        </div>
      )}
      {tab === 'Repository details' && (
        <section className="panel detail-settings">
          <h3>Repository context</h3>
          <dl>
            <dt>Source</dt>
            <dd>{repo.location}</dd>
            <dt>Stack</dt>
            <dd>{repo.stack}</dd>
            <dt>Files inspected</dt>
            <dd>{repo.files.toLocaleString()}</dd>
            <dt>Last scan</dt>
            <dd>{repo.lastScan ? new Date(repo.lastScan).toLocaleString() : 'Not scanned yet'}</dd>
          </dl>
          <button className="button danger" onClick={onRemove}>
            <Trash2 size={16} />
            Remove from workspace
          </button>
          <p className="field-help">
            Removes this repository and its scan history from Slop Meter. Source files are kept.
          </p>
        </section>
      )}
    </>
  );
}
