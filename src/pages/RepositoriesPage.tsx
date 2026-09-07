import { useState } from 'react';
import { Search, Plus, ShieldCheck } from 'lucide-react';
import type { Workspace, Repo } from '../types';
import { RepositoryTable } from '../components/RepositoryTable';

export function RepositoriesPage({
  data,
  onRepo,
  onAdd,
}: {
  data: Workspace;
  onRepo: (r: Repo) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState(''),
    [source, setSource] = useState('all');
  const repos = data.repos.filter(
    (r) =>
      (r.name + ' ' + r.owner + ' ' + r.stack).toLowerCase().includes(search.toLowerCase()) &&
      (source === 'all' || r.source === source),
  );
  return (
    <>
      <div className="list-toolbar">
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="Search repositories"
            placeholder="Find a repository…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Repository source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">All sources</option>
          <option value="github">GitHub</option>
          <option value="local">Local</option>
        </select>
        <span className="muted">{repos.length} repositories</span>
        <button className="button" onClick={onAdd}>
          <Plus size={16} />
          Add repository
        </button>
      </div>
      <section className="panel">
        <RepositoryTable repos={repos} onSelect={onRepo} />
      </section>
      <div className="info-box page-note">
        <ShieldCheck size={19} />
        Your repositories stay on your machine. You choose which harness sees source excerpts.
      </div>
    </>
  );
}
