import { ArrowRight, AlertTriangle, Clock3, GitBranch, LockKeyhole, Check } from 'lucide-react';
import type { Finding, Repo } from '../types';
import { Badge, Empty } from './ui';
export function PriorityCard({
  finding: f,
  index,
  repo,
  onClick,
}: {
  finding: Finding;
  index: number;
  repo?: Repo;
  onClick: () => void;
}) {
  return (
    <button
      className={`priority-card ${f.status === 'resolved' ? 'resolved' : ''}`}
      onClick={onClick}
    >
      <span className="priority-number">
        {f.status === 'resolved' ? <Check size={21} /> : String(index + 1).padStart(2, '0')}
      </span>
      <div className="priority-content">
        <div className="priority-title">
          <h3>{f.title}</h3>
          <Badge
            tone={f.severity === 'critical' ? 'red' : f.severity === 'high' ? 'orange' : 'neutral'}
          >
            {f.severity === 'critical'
              ? 'Critical'
              : f.severity === 'high'
                ? 'High impact'
                : f.severity === 'low'
                  ? 'Low impact'
                  : 'Medium impact'}
          </Badge>
        </div>
        <div className="priority-repo">
          {repo?.owner}/{repo?.name}
          <span>·</span>
          {f.category}
          {f.status === 'in-progress' && <Badge tone="green">In progress</Badge>}
        </div>
        <p>{f.why}</p>
        <div className="priority-meta">
          <span>
            <AlertTriangle />
            {f.findings} {f.findings === 1 ? 'finding' : 'findings'}
          </span>
          <span>
            <Clock3 />
            {f.effort} hours
          </span>
          <span>
            {f.dependencies.length ? <LockKeyhole /> : <GitBranch />}
            {f.dependencies.length
              ? 'Has prerequisites'
              : f.unlocks
                ? `Unlocks ${f.unlocks} improvements`
                : 'Independent change'}
          </span>
        </div>
      </div>
      <ArrowRight size={19} className="priority-arrow" />
    </button>
  );
}
export function PriorityList({
  findings,
  repos,
  onSelect,
}: {
  findings: Finding[];
  repos: Repo[];
  onSelect: (finding: Finding) => void;
}) {
  return (
    <div className="priority-list">
      {findings.length ? (
        findings.map((f, i) => (
          <PriorityCard
            key={f.id}
            finding={f}
            index={i}
            repo={repos.find((r) => r.id === f.repoId)}
            onClick={() => onSelect(f)}
          />
        ))
      ) : (
        <Empty title="Room to make progress">
          Run a scan to discover your next engineering decision.
        </Empty>
      )}
    </div>
  );
}
