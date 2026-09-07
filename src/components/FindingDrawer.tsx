import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Clock3,
  GitBranch,
  FileCode2,
  ShieldCheck,
  Copy,
  CheckCheck,
} from 'lucide-react';
import type { Finding, Repo } from '../types';
import { Modal, Badge } from './ui';
import { patternById } from '../slopTaxonomy';
export function FindingDrawer({
  finding: f,
  repos,
  onClose,
  onStatus,
  onGuide,
}: {
  finding: Finding;
  repos: Repo[];
  onClose: () => void;
  onStatus: (id: string, status: Finding['status']) => Promise<void>;
  onGuide: (patternId: Finding['patternId']) => void;
}) {
  const [tab, setTab] = useState('Reasoning'),
    [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(false);
  const repo = repos.find((r) => r.id === f.repoId);
  const dependencies = f.dependencies
    .map((id) => repos.flatMap((r) => r.findings).find((f) => f.id === id))
    .filter((f): f is Finding => !!f);
  return (
    <Modal title="Engineering decision" drawer onClose={onClose}>
      <div className="drawer-body">
        <div className="drawer-repo">
          <FileCode2 size={15} />
          {repo?.owner}/{repo?.name}
          <span>·</span>
          {f.dimension}
          {repo?.demo && <Badge>Sample</Badge>}
        </div>
        <h1>{f.title}</h1>
        <button className="finding-pattern" onClick={() => onGuide(f.patternId)}>
          {patternById.get(f.patternId)?.title || f.patternId}
          <ArrowUpRight size={14} />
        </button>
        <div className="drawer-badges">
          <Badge tone={f.severity === 'critical' ? 'red' : 'orange'}>{f.severity} severity</Badge>
          <Badge tone="green">Priority {f.score}/100</Badge>
          <Badge>{f.status.replace('-', ' ')}</Badge>
        </div>
        <div className="decision-summary">
          <div>
            <ShieldCheck size={17} />
            <strong>{f.confidence}%</strong>
            <small>Confidence</small>
          </div>
          <div>
            <Clock3 size={17} />
            <strong>{f.effort}h</strong>
            <small>Estimated effort</small>
          </div>
          <div>
            <GitBranch size={17} />
            <strong>{f.unlocks}</strong>
            <small>Improvements unlocked</small>
          </div>
        </div>
        <div className="tabs">
          {['Reasoning', 'Evidence', 'Action plan'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
              {t === 'Evidence' && <span>{f.evidence.length}</span>}
            </button>
          ))}
        </div>
        {tab === 'Reasoning' && (
          <div className="tab-content">
            <h3>Why this matters</h3>
            <p>{f.why}</p>
            {f.deferReason && (
              <div className="defer-box">
                <h3>This is bad. But don’t fix it yet.</h3>
                <p>{f.deferReason}</p>
              </div>
            )}
            <h3>Why this priority?</h3>
            <p>
              Impact {f.impact}/10, risk {f.risk}/10, and blast radius {f.blastRadius}/10 are
              balanced against {f.effort} hours of effort and {f.confidence}% confidence. Your
              profile weights and prerequisite work determine the order.
            </p>
            <h3>Dependencies</h3>
            {dependencies.length ? (
              dependencies.map((d) => (
                <div className="dependency" key={d.id}>
                  <GitBranch size={17} />
                  <span>{d.title}</span>
                  <Badge tone={d.status === 'resolved' ? 'green' : 'neutral'}>
                    {d.status === 'resolved' ? 'Complete' : 'Fix first'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="positive">
                <Check size={16} /> No prerequisites. This work can start independently.
              </p>
            )}
            <h3>Sources & context</h3>
            {f.sources.length ? (
              f.sources.map((s) => (
                <a className="source-link" key={s} href={s} target="_blank" rel="noreferrer">
                  {new URL(s).hostname}
                  <ArrowUpRight size={15} />
                </a>
              ))
            ) : (
              <p>
                No external source was cited. This recommendation is based on the scanned evidence.
              </p>
            )}
          </div>
        )}
        {tab === 'Evidence' && (
          <div className="tab-content">
            {repo?.demo && (
              <div className="info-box">Illustrative evidence from the sample workspace.</div>
            )}
            {f.evidence.map((e, i) => (
              <article className="evidence" key={i}>
                <div className="evidence-file">
                  <FileCode2 size={16} />
                  <span>{e.file}</span>
                  <small>Line {e.line}</small>
                </div>
                <pre>
                  <code>{e.snippet}</code>
                </pre>
                <p>{e.explanation}</p>
              </article>
            ))}
          </div>
        )}
        {tab === 'Action plan' && (
          <div className="tab-content">
            <h3>A safe path forward</h3>
            <ol className="action-steps">
              {f.steps.map((s, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
            <div className="info-box">
              After refactoring, rescan to measure the result. Marking this decision resolved does
              not change the measured health score.
            </div>
            <button
              className="button"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `# ${f.title}\n\n${f.why}\n\n${f.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                );
                setCopied(true);
              }}
            >
              {copied ? <CheckCheck size={16} /> : <Copy size={16} />}{' '}
              {copied ? 'Copied action plan' : 'Copy action plan'}
            </button>
          </div>
        )}
      </div>
      <div className="drawer-actions">
        <label>
          Status
          <select
            aria-label="Decision status"
            value={f.status}
            disabled={busy}
            onChange={async (e) => {
              setBusy(true);
              try {
                await onStatus(f.id, e.target.value as Finding['status']);
              } finally {
                setBusy(false);
              }
            }}
          >
            <option value="open">Ready to review</option>
            <option value="in-progress">In progress</option>
            <option value="deferred">Deferred</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onStatus(f.id, f.status === 'resolved' ? 'open' : 'in-progress');
            } finally {
              setBusy(false);
            }
          }}
        >
          {f.status === 'resolved'
            ? 'Reopen decision'
            : f.status === 'in-progress'
              ? 'Work in progress'
              : 'Start working'}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </Modal>
  );
}
