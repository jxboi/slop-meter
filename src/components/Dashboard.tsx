import {
  ArrowUpRight,
  ArrowUp,
  ListFilter,
  Workflow,
  Crosshair,
  ArrowDown,
  Info,
} from 'lucide-react';
import type { Workspace, Finding, Repo } from '../types';
import { SectionTitle, LinkButton } from './ui';
import { PriorityList } from './Priorities';
import { RepositoryTable } from './RepositoryTable';
import { HealthChart } from './HealthChart';
export function Metrics({ repos }: { repos: Repo[] }) {
  const findings = repos.flatMap((r) => r.findings).filter((f) => f.status !== 'resolved');
  const scored = repos.filter((r) => r.health !== null);
  const health = scored.length
    ? Math.round(scored.reduce((s, r) => s + r.health!, 0) / scored.length)
    : null;
  const spark = scored[0]?.trend || [];
  const sparkMin = Math.min(...spark.map((t) => t.value), 0);
  const sparkMax = Math.max(...spark.map((t) => t.value), 1);
  const sparkPoints = spark
    .map(
      (t, i) =>
        `${(i / Math.max(1, spark.length - 1)) * 126},${33 - ((t.value - sparkMin) / (sparkMax - sparkMin)) * 30}`,
    )
    .join(' ');
  const ready = findings.filter(
    (f) =>
      f.status !== 'deferred' &&
      f.dependencies.every(
        (d) => repos.flatMap((r) => r.findings).find((x) => x.id === d)?.status === 'resolved',
      ),
  ).length;
  const previous = scored.filter((r) => r.trend.length > 1);
  const delta = previous.length
    ? Math.round(
        previous.reduce((s, r) => s + r.trend.at(-1)!.value - r.trend[0].value, 0) /
          previous.length,
      )
    : 0;
  return (
    <section className="metrics">
      <div className="metric">
        <span>
          Workspace health <Info size={12} />
        </span>
        <div className="metric-value">
          {health ?? '—'}
          <small>/100</small>
          <svg viewBox="0 0 130 35" className="sparkline" aria-hidden="true">
            <polyline points={sparkPoints} fill="none" stroke="currentColor" strokeWidth="2" />
            {spark.length > 0 && (
              <circle
                cx={spark.length === 1 ? 0 : 126}
                cy={33 - ((spark.at(-1)!.value - sparkMin) / (sparkMax - sparkMin)) * 30}
                r="3"
                fill="currentColor"
              />
            )}
          </svg>
        </div>
        <small className="positive">
          <ArrowUp size={13} />
          {previous.length
            ? `${delta >= 0 ? '+' : ''}${delta} since first scan`
            : 'Your baseline starts with a scan'}
        </small>
      </div>
      <div className="metric">
        <span>Repositories</span>
        <div className="metric-value">
          {repos.length}
          <span className="metric-icon">
            <Workflow size={23} />
          </span>
        </div>
        <small>
          {repos.filter((r) => r.source === 'github').length} GitHub <i>·</i>{' '}
          {repos.filter((r) => r.source === 'local').length} local
        </small>
      </div>
      <div className="metric">
        <span>Root causes</span>
        <div className="metric-value">{findings.length}</div>
        <small>
          Across {findings.reduce((s, f) => s + f.findings, 0).toLocaleString()} findings
        </small>
      </div>
      <div className="metric">
        <span>Priorities</span>
        <div className="metric-value">{findings.filter((f) => f.status !== 'deferred').length}</div>
        <small>
          <span className="tiny-dot" />
          {ready} ready to start
        </small>
      </div>
    </section>
  );
}
export function Dashboard({
  data,
  onFinding,
  onRepo,
  navigate,
}: {
  data: Workspace;
  onFinding: (f: Finding) => void;
  onRepo: (r: Repo) => void;
  navigate: (page: string) => void;
}) {
  const findings = data.repos.flatMap((r) => r.findings).filter((f) => f.status !== 'resolved');
  const ready = (f: Finding) =>
    f.dependencies.every(
      (id) => data.repos.flatMap((r) => r.findings).find((d) => d.id === id)?.status === 'resolved',
    );
  const priorities = findings
    .filter((f) => f.status !== 'deferred')
    .sort((a, b) => Number(ready(b)) - Number(ready(a)) || b.score - a.score)
    .slice(0, 3);
  return (
    <>
      <Metrics repos={data.repos} />
      <div className="dashboard-grid">
        <section className="priorities-panel">
          <SectionTitle
            title="What to fix first"
            subtitle="Biggest impact. Right order."
            action={<LinkButton onClick={() => navigate('roadmap')}>View roadmap</LinkButton>}
          />
          <PriorityList findings={priorities} repos={data.repos} onSelect={onFinding} />
        </section>
        <aside className="insights">
          <HealthChart repos={data.repos} />
          <section className="panel bigger-picture">
            <SectionTitle title="The bigger picture" />
            <div className="compression">
              <div>
                <span className="compression-icon">
                  <ListFilter size={18} />
                </span>
                <strong>
                  {findings.reduce((s, f) => s + f.findings, 0)} <span>findings</span>
                </strong>
                <small>Individual signals</small>
              </div>
              <ArrowDown className="flow-arrow" size={13} />
              <div>
                <span className="compression-icon">
                  <Workflow size={18} />
                </span>
                <strong>
                  {findings.reduce((s, f) => s + f.patterns, 0)} <span>patterns</span>
                </strong>
                <small>Connected symptoms</small>
              </div>
              <ArrowDown className="flow-arrow" size={13} />
              <div>
                <span className="compression-icon">
                  <Crosshair size={18} />
                </span>
                <strong>
                  {findings.length} <span>root causes</span>
                </strong>
                <small>Decisions that matter</small>
              </div>
            </div>
            <div className="compression-footer">
              <span>Fewer warnings. Clearer decisions.</span>
              <ArrowUpRight size={15} />
            </div>
          </section>
        </aside>
      </div>
      <section className="repositories-section">
        <SectionTitle
          title="Your repositories"
          action={<LinkButton onClick={() => navigate('repositories')}>View all</LinkButton>}
        />
        <RepositoryTable repos={data.repos} onSelect={onRepo} />
      </section>
      <div className="dashboard-footer">
        <span>Understand the mess. Find your starting point.</span>
        <span>
          Scan <ArrowRightSmall /> Refactor <ArrowRightSmall /> Rescan <ArrowRightSmall /> Improve
        </span>
      </div>
    </>
  );
}
function ArrowRightSmall() {
  return <span className="muted">→</span>;
}
