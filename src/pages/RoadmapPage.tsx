import { useState } from 'react';
import {
  ArrowRight,
  GitBranch,
  Clock3,
  CircleCheck,
  LockKeyhole,
  Archive,
  Check,
} from 'lucide-react';
import type { Workspace, Finding } from '../types';
import { Badge, SectionTitle, Empty } from '../components/ui';
import { patternById } from '../slopTaxonomy';

export function RoadmapPage({
  data,
  onFinding,
}: {
  data: Workspace;
  onFinding: (f: Finding) => void;
}) {
  const [repo, setRepo] = useState('all');
  const all = data.repos.flatMap((r) => r.findings);
  const findings = all.filter((f) => repo === 'all' || f.repoId === repo);
  const ready = (f: Finding) =>
    f.dependencies.every((d) => all.find((x) => x.id === d)?.status === 'resolved');
  const groups = [
    {
      name: 'Start here',
      subtitle: 'Independent changes with the highest impact',
      icon: CircleCheck,
      tone: 'green',
      items: findings.filter(
        (f) => (f.status === 'open' || f.status === 'in-progress') && ready(f),
      ),
    },
    {
      name: 'Up next',
      subtitle: 'Unlocked by the work that comes before',
      icon: LockKeyhole,
      tone: 'orange',
      items: findings.filter(
        (f) => (f.status === 'open' || f.status === 'in-progress') && !ready(f),
      ),
    },
    {
      name: 'Intentionally later',
      subtitle: 'Real problems. Better timing.',
      icon: Archive,
      tone: 'neutral',
      items: findings.filter((f) => f.status === 'deferred'),
    },
    {
      name: 'Resolved',
      subtitle: 'Rescan to verify the improvement',
      icon: Check,
      tone: 'green',
      items: findings.filter((f) => f.status === 'resolved'),
    },
  ];
  return (
    <>
      <div className="roadmap-intro">
        <GitBranch size={22} />
        <p>
          Severity tells you how bad a problem is.{' '}
          <strong>Priority tells you what to do next.</strong>
        </p>
        <select
          aria-label="Filter roadmap by repository"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        >
          <option value="all">All repositories</option>
          {data.repos.map((r) => (
            <option value={r.id} key={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="roadmap">
        {groups
          .filter((g) => g.items.length || g.name === 'Start here')
          .map((g, i) => (
            <section className="roadmap-phase" key={g.name}>
              <div className={`phase-marker ${g.tone}`}>
                <g.icon size={20} />
              </div>
              <div className="phase-content">
                <SectionTitle
                  title={g.name}
                  subtitle={g.subtitle}
                  action={
                    <Badge>
                      {g.items.length} {g.items.length === 1 ? 'decision' : 'decisions'}
                    </Badge>
                  }
                />
                {g.items.length ? (
                  g.items
                    .sort((a, b) => b.score - a.score)
                    .map((f) => (
                      <div className="roadmap-card" key={f.id}>
                        <button onClick={() => onFinding(f)}>
                          <div>
                            <span className="eyeline">
                              {data.repos.find((r) => r.id === f.repoId)?.name} <span>·</span>{' '}
                              {f.dimension} <span>·</span> {patternById.get(f.patternId)?.title}
                            </span>
                            <h3>{f.title}</h3>
                            <p>{f.deferReason && i === 2 ? f.deferReason : f.why}</p>
                            <div className="priority-meta">
                              <span>
                                <Clock3 />
                                {f.effort} hours
                              </span>
                              <span>{f.confidence}% confidence</span>
                              {f.status === 'in-progress' && (
                                <Badge tone="green">In progress</Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={19} />
                        </button>
                        {f.dependencies.length > 0 && (
                          <div className="roadmap-dependency">
                            <GitBranch size={14} />
                            After{' '}
                            {f.dependencies
                              .map((d) => all.find((x) => x.id === d)?.title || d)
                              .join(' + ')}
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <Empty title="Your next decision is on its way">
                    Run a scan or resolve prerequisite work to unlock your roadmap.
                  </Empty>
                )}
              </div>
            </section>
          ))}
      </div>
    </>
  );
}
