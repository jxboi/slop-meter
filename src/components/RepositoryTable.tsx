import { Github, Monitor, ArrowUpRight } from 'lucide-react';
import type { Repo } from '../types';
import { relative } from '../api';
import { Empty } from './ui';
export function RepositoryTable({
  repos,
  onSelect,
}: {
  repos: Repo[];
  onSelect: (repo: Repo) => void;
}) {
  return repos.length ? (
    <div className="table-scroll">
      <table className="repo-table">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Health</th>
            <th>Top priority</th>
            <th>Last scan</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {repos.map((r) => (
            <tr key={r.id} onClick={() => onSelect(r)}>
              <td>
                <div className="repo-cell">
                  <span className="repo-symbol">
                    {r.source === 'github' ? <Github size={20} /> : <Monitor size={20} />}
                  </span>
                  <div>
                    <button className="repo-name" onClick={() => onSelect(r)}>
                      {r.name}
                    </button>
                    <small>{r.stack}</small>
                  </div>
                  {r.demo && <span className="sample-dot" title="Sample repository" />}
                </div>
              </td>
              <td>
                <div className="health-cell">
                  <strong>{r.health ?? '—'}</strong>
                  <div className="health-track">
                    <span
                      style={{
                        width: `${r.health || 0}%`,
                        background: r.health !== null && r.health >= 80 ? '#7a9170' : '#667851',
                      }}
                    />
                  </div>
                </div>
              </td>
              <td>
                <span
                  className={`health-label ${(r.health ?? 0) < 65 ? 'attention' : (r.health ?? 0) < 80 ? 'improving' : 'healthy'}`}
                >
                  <i />
                  {r.health === null
                    ? 'Ready to scan'
                    : r.health < 65
                      ? 'Needs attention'
                      : r.health < 80
                        ? 'Improving'
                        : 'Healthy'}
                </span>
                <small className="priority-caption">
                  {r.findings.find((f) => f.status === 'open')?.title ||
                    (r.lastScan ? 'No open priorities' : 'Find your starting point')}
                </small>
              </td>
              <td className="muted nowrap">{relative(r.lastScan)}</td>
              <td>
                <ArrowUpRight size={16} className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="A clearer codebase starts here"
      action={<span>Add a repository to build your first roadmap.</span>}
    >
      Connect GitHub or a local project.
    </Empty>
  );
}
