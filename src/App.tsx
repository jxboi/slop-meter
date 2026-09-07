import { useCallback, useEffect, useState } from 'react';
import { UserButton } from '@clerk/react';
import {
  House,
  FolderGit2,
  GitBranch,
  History,
  SlidersHorizontal,
  BookOpen,
  BookMarked,
  Settings,
  ChevronsUpDown,
  Building2,
  Plus,
  ScanLine,
  ChevronRight,
  ArrowUpRight,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  MessageSquare,
  CircleHelp,
} from 'lucide-react';
import type { Workspace, Harness, Finding, Repo, Scan } from './types';
import { api, post } from './api';
import { Logo, Loading, Modal } from './components/ui';
import { Dashboard } from './components/Dashboard';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepositoryPage } from './pages/RepositoryPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { SettingsPage } from './pages/SettingsPage';
import { SlopGuidePage } from './pages/SlopGuidePage';
import { AddRepository, ScanModal } from './components/ScanModal';
import { FindingDrawer } from './components/FindingDrawer';
const nav = [
  { id: 'overview', name: 'Overview', icon: House },
  { id: 'repositories', name: 'Repositories', icon: FolderGit2 },
  { id: 'roadmap', name: 'Refactoring roadmap', icon: GitBranch },
  { id: 'history', name: 'Scan history', icon: History },
  { id: 'profiles', name: 'Slop profiles', icon: SlidersHorizontal },
  { id: 'knowledge', name: 'Living knowledge', icon: BookOpen },
  { id: 'guide', name: 'Slop guide', icon: BookMarked },
  { id: 'settings', name: 'Settings', icon: Settings },
];
const headings: Record<string, [string, string]> = {
  overview: [
    'A little less slop. A lot more direction.',
    'Your codebase, understood. Here’s where to make a difference.',
  ],
  repositories: [
    'Every repository. One clear direction.',
    'Connect your projects and see where your attention matters most.',
  ],
  roadmap: [
    'A plan for the mess.',
    'A few engineering decisions, in the order that makes a difference.',
  ],
  history: [
    'Progress has a history.',
    'Every scan, every decision, every step toward a healthier codebase.',
  ],
  profiles: ['Good code is contextual.', 'Tell Slop Meter what matters to your team.'],
  knowledge: [
    'Knowledge that keeps up.',
    'Current sources. Relevant context. Better engineering decisions.',
  ],
  guide: [
    'Know the smell. Find the cause.',
    'A practical rubric for spotting code that looks complete but makes the repository harder to change.',
  ],
  settings: ['Make yourself at home.', 'Your workspace, your tools, your way of working.'],
};
export default function App({
  hosted = false,
  userName = 'Your workspace',
  userEmail = 'Personal environment',
}: {
  hosted?: boolean;
  userName?: string;
  userEmail?: string;
}) {
  const [data, setData] = useState<Workspace | null>(null),
    [harnesses, setHarnesses] = useState<Harness[]>([]),
    [error, setError] = useState(''),
    [page, setPage] = useState(location.hash.slice(1) || 'overview'),
    [modal, setModal] = useState<'add' | 'scan' | 'help' | null>(null),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [scanRepo, setScanRepo] = useState<string>(),
    [sidebar, setSidebar] = useState(false),
    [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null),
    [removing, setRemoving] = useState<Repo | null>(null);
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const refresh = useCallback(async () => {
    setData(await api<Workspace>('/workspace'));
  }, []);
  useEffect(() => {
    Promise.all([refresh(), api<Harness[]>('/harnesses').then(setHarnesses)]).catch((e) =>
      setError(e.message),
    );
    const hash = () => {
      setPage(location.hash.slice(1) || 'overview');
      setSidebar(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, [refresh]);
  const running = data?.scans.filter((s) => s.status === 'running') || [];
  useEffect(() => {
    if (!running.length) return;
    const timer = setInterval(() => void refresh().catch((e) => notify(e.message, true)), 1500);
    return () => clearInterval(timer);
  }, [running.length, refresh, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = useCallback((p: string) => {
    location.hash = p;
    setPage(p);
    setSidebar(false);
    window.scrollTo(0, 0);
  }, []);
  const close = useCallback(() => setModal(null), []),
    closeFinding = useCallback(() => setSelectedId(null), []);
  const onFinding = (f: Finding) => setSelectedId(f.id),
    onRepo = (r: Repo) => navigate('repo/' + r.id);
  const onScan = (id?: string) => {
    setScanRepo(id);
    setModal('scan');
  };
  if (error)
    return (
      <main className="boot-error">
        <Logo />
        <h1>Let’s reconnect your workspace.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!data) return <Loading />;
  const repo = page.startsWith('repo/')
    ? data.repos.find((r) => r.id === page.slice(5))
    : undefined;
  const active = page.startsWith('repo/')
    ? 'repositories'
    : page.startsWith('guide/')
      ? 'guide'
      : nav.some((n) => n.id === page)
        ? page
        : 'overview';
  const heading = repo
    ? [`${repo.owner} / ${repo.name}`, 'Your codebase, understood. Here’s what to fix first.']
    : headings[active];
  const selected = data.repos.flatMap((r) => r.findings).find((f) => f.id === selectedId);
  const shared = { data, refresh, notify };
  async function updateStatus(id: string, status: Finding['status']) {
    try {
      await api('/findings/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refresh();
      notify(
        status === 'resolved'
          ? 'Decision resolved. Rescan to verify the improvement.'
          : 'Decision status updated',
      );
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  return (
    <div className="app-shell">
      {sidebar && <div className="mobile-scrim" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <button className="brand" onClick={() => navigate('overview')}>
          <Logo />
          <span>
            slop meter<span className="brand-period">.</span>
          </span>
        </button>
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">
            <Building2 size={16} />
          </span>
          <span>{data.settings.workspaceName}</span>
          <ChevronsUpDown size={14} />
        </button>
        <nav aria-label="Main navigation">
          {nav.map((n, i) => (
            <div key={n.id}>
              {i === 4 && <div className="nav-label">Configuration</div>}
              <button
                className={`nav-item ${active === n.id ? 'active' : ''}`}
                onClick={() => navigate(n.id)}
                aria-current={active === n.id ? 'page' : undefined}
              >
                <n.icon size={19} />
                <span>{n.name}</span>
                {n.id === 'repositories' && <span className="nav-count">{data.repos.length}</span>}
                {n.id === 'history' && running.length > 0 && <span className="tiny-dot pulsing" />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-mark">
              <GitBranch size={16} />
            </span>
            <p>
              Big codebase.
              <br />
              <strong>Small, deliberate steps.</strong>
            </p>
            <button aria-label="Learn about Slop Meter" onClick={() => setModal('help')}>
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="local-status">
            <span className="tiny-dot" />
            <span>{hosted ? 'Cloud workspace' : 'Local workspace'}</span>
            <span className="version">v1.0</span>
          </div>
          <div className="user-button">
            {hosted ? <UserButton /> : <span className="user-avatar">Y</span>}
            <div className="user-copy">
              <strong>{userName}</strong>
              <small>{userEmail}</small>
            </div>
            {!hosted && <ChevronsUpDown size={14} />}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebar(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            <button onClick={() => navigate('overview')}>Workspace</button>
            <ChevronRight size={13} />
            <span>{repo ? repo.name : nav.find((n) => n.id === active)?.name}</span>
          </div>
          <div className="topbar-right">
            {data.repos.some((r) => r.demo) && (
              <span className="sample-label">
                <span className="tiny-dot" />
                Includes sample data
              </span>
            )}
            <button className="feedback" onClick={() => setModal('help')}>
              <CircleHelp size={16} />
              Quick guide
            </button>
          </div>
        </header>
        <main>
          <div className={`page-heading ${active === 'guide' ? 'guide-page-heading' : ''}`}>
            <div>
              <h1>{heading[0]}</h1>
              <p>{heading[1]}</p>
            </div>
            {['overview', 'repositories'].includes(active) && !repo && (
              <div className="heading-actions">
                <button className="button" onClick={() => setModal('add')}>
                  <Plus size={16} />
                  Add repository
                </button>
                <button className="button primary" onClick={() => onScan()}>
                  <ScanLine size={16} />
                  Run scan
                </button>
              </div>
            )}
            {repo && (
              <button className="button primary" onClick={() => onScan(repo.id)}>
                <ScanLine size={16} />
                Run scan
              </button>
            )}
          </div>
          {running.map((s) => (
            <div className="scan-progress" key={s.id}>
              <LoaderCircle size={18} className="spin" />
              <div>
                <strong>{s.repoName}</strong>
                <span>{s.phase}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: s.progress + '%' }} />
              </div>
              <small>{s.progress}%</small>
              <button className="text-button" onClick={() => navigate('history')}>
                View scan
                <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
          {repo && data.scans.find((s) => s.repoId === repo.id)?.status === 'failed' && (
            <div className="form-error scan-failure">
              <AlertCircle size={18} />
              <div>
                <strong>The latest scan could not finish.</strong>
                <p>{data.scans.find((s) => s.repoId === repo.id)?.error}</p>
              </div>
              <button className="text-button" onClick={() => navigate('history')}>
                View scan history
              </button>
            </div>
          )}
          {repo ? (
            <RepositoryPage
              repo={repo}
              onFinding={onFinding}
              onScan={() => onScan(repo.id)}
              onRemove={() => setRemoving(repo)}
            />
          ) : active === 'overview' ? (
            <Dashboard data={data} onFinding={onFinding} onRepo={onRepo} navigate={navigate} />
          ) : active === 'repositories' ? (
            <RepositoriesPage data={data} onRepo={onRepo} onAdd={() => setModal('add')} />
          ) : active === 'roadmap' ? (
            <RoadmapPage data={data} onFinding={onFinding} />
          ) : active === 'history' ? (
            <HistoryPage {...shared} />
          ) : active === 'profiles' ? (
            <ProfilesPage {...shared} />
          ) : active === 'knowledge' ? (
            <KnowledgePage {...shared} />
          ) : active === 'guide' ? (
            <SlopGuidePage
              key={page}
              initialPattern={page.startsWith('guide/') ? page.slice(6) : undefined}
            />
          ) : (
            <SettingsPage {...shared} harnesses={harnesses} />
          )}
        </main>
      </div>
      {toast && (
        <div className={`toast ${toast.error ? 'error' : ''}`} role="status">
          {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
      {modal === 'add' && (
        <AddRepository
          hosted={hosted}
          onClose={close}
          onAdded={async (r) => {
            await refresh();
            close();
            onRepo(r);
            notify('Repository added. Ready for your first scan.');
          }}
        />
      )}
      {modal === 'scan' && (
        <ScanModal
          data={data}
          harnesses={harnesses}
          repoId={scanRepo}
          onClose={close}
          onAdd={() => setModal('add')}
          onStarted={async (s: Scan) => {
            await refresh();
            close();
            navigate('repo/' + s.repoId);
            notify('Scan started. Your roadmap is on its way.');
          }}
        />
      )}
      {selected && (
        <FindingDrawer
          finding={selected}
          repos={data.repos}
          onClose={closeFinding}
          onStatus={updateStatus}
          onGuide={(patternId) => {
            closeFinding();
            navigate(`guide/${patternId}`);
          }}
        />
      )}{' '}
      {modal === 'help' && (
        <Modal title="A little direction goes a long way." onClose={close}>
          <div className="help-content">
            <Logo />
            <p>Give Slop Meter a mess. It tells you where to start.</p>
            <ol>
              <li>
                <strong>Add your codebase.</strong>
                <span>Connect a GitHub repository{hosted ? '.' : ' or a local directory.'}</span>
              </li>
              <li>
                <strong>Choose how to understand it.</strong>
                <span>
                  Use a private local baseline, or connect an AI harness for contextual diagnosis.
                  Tune your Slop Profile.
                </span>
              </li>
              <li>
                <strong>Make a few engineering decisions.</strong>
                <span>
                  Review root causes, follow the evidence, and work through the roadmap in order.
                </span>
              </li>
              <li>
                <strong>Refactor, rescan, repeat.</strong>
                <span>
                  Track decisions and measure improvements with comparable scans. Slop Meter
                  provides direction; you make the code changes.
                </span>
              </li>
            </ol>
            <div className="info-box">
              <MessageSquare size={18} />
              The Acme repositories are an illustrative sample workspace. Add your own repository to
              analyze real code.
            </div>
            <button className="button primary" onClick={() => setModal('add')}>
              Add your first repository
              <Plus size={16} />
            </button>
          </div>
        </Modal>
      )}
      {removing && (
        <Modal title="Remove repository?" onClose={() => setRemoving(null)}>
          <p className="modal-intro">
            Remove {removing.owner}/{removing.name} and its scan history from this workspace? Your
            source repository will not be changed.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setRemoving(null)}>
              Keep repository
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await api('/repos/' + removing.id, { method: 'DELETE' });
                  await refresh();
                  setRemoving(null);
                  navigate('repositories');
                  notify('Repository removed from workspace');
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              Remove repository
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
