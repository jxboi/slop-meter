import { useState } from 'react';
import { Github, Monitor, ArrowRight, ScanLine, ShieldCheck } from 'lucide-react';
import type { Workspace, Harness, Repo, Scan } from '../types';
import { post } from '../api';
import { Modal } from './ui';
export function AddRepository({
  hosted = false,
  onClose,
  onAdded,
}: {
  hosted?: boolean;
  onClose: () => void;
  onAdded: (repo: Repo) => void;
}) {
  const [source, setSource] = useState<'github' | 'local'>('github'),
    [location, setLocation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal title="Add a repository" onClose={onClose}>
      <p className="modal-intro">Give us a mess. We’ll help you find your starting point.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            onAdded(await post<Repo>('/repos', { source, location }));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="segmented">
          <button
            type="button"
            className={source === 'github' ? 'selected' : ''}
            onClick={() => {
              setSource('github');
              setLocation('');
            }}
          >
            <Github size={17} />
            GitHub repository
          </button>
          {!hosted && (
            <button
              type="button"
              className={source === 'local' ? 'selected' : ''}
              onClick={() => {
                setSource('local');
                setLocation('');
              }}
            >
              <Monitor size={17} />
              Local directory
            </button>
          )}
        </div>
        <label>
          {source === 'github' ? 'Repository URL' : 'Absolute directory path'}
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              source === 'github'
                ? 'https://github.com/your-team/your-project'
                : '/Users/you/projects/your-project'
            }
          />
        </label>
        <p className="field-help">
          {source === 'github'
            ? hosted
              ? 'Hosted scans currently support public GitHub repositories.'
              : 'Public repositories work immediately. Private repositories use your local Git credentials.'
            : 'The directory must be on the machine running Slop Meter.'}
        </p>
        <div className="info-box">
          <ShieldCheck size={19} />
          <span>Scans inspect source code. Repository scripts are never executed.</span>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Adding repository…' : 'Add repository'}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ScanModal({
  data,
  harnesses,
  repoId,
  onClose,
  onStarted,
  onAdd,
}: {
  data: Workspace;
  harnesses: Harness[];
  repoId?: string;
  onClose: () => void;
  onStarted: (scan: Scan) => void;
  onAdd: () => void;
}) {
  const real = data.repos.filter((r) => !r.demo);
  const [repo, setRepo] = useState(
      repoId && real.some((r) => r.id === repoId) ? repoId : real[0]?.id || '',
    ),
    [harness, setHarness] = useState(data.settings.defaultHarness),
    [model, setModel] = useState(data.settings.defaultModel),
    [effort, setEffort] = useState('medium'),
    [depth, setDepth] = useState('standard'),
    [profile, setProfile] = useState(
      data.profiles.find((p) => p.active)?.id || data.profiles[0]?.id,
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const active = harnesses.find((h) => h.id === harness);
  return (
    <Modal title="Understand your codebase" onClose={onClose}>
      <p className="modal-intro">One scan. A clearer picture of what to do next.</p>
      {!real.length ? (
        <div className="empty">
          <ScanLine size={32} />
          <h3>Ready for your own starting point?</h3>
          <p>
            The sample workspace shows what an analysis looks like. Add a real repository to start
            scanning.
          </p>
          <button className="button primary" onClick={onAdd}>
            Add a repository
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              onStarted(
                await post<Scan>('/scans', {
                  repoId: repo,
                  harness,
                  model,
                  effort,
                  depth,
                  profileId: profile,
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Repository
            <select value={repo} onChange={(e) => setRepo(e.target.value)}>
              {real.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.owner}/{r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-columns">
            <label>
              AI harness
              <select
                value={harness}
                onChange={(e) => {
                  setHarness(e.target.value);
                  setModel('');
                }}
              >
                {harnesses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.available ? '' : ' · Not configured'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Slop Profile
              <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                {data.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-help">{active?.detail}</p>
          {harness !== 'static' && (
            <div className="form-columns">
              <label>
                Model
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    harness === 'openai'
                      ? 'gpt-5.4'
                      : harness === 'anthropic'
                        ? 'claude-sonnet-4-6'
                        : 'Use harness default'
                  }
                />
              </label>
              <label>
                Thinking effort
                <select
                  disabled={harness === 'copilot'}
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
          )}
          <label>Scan depth</label>
          <div className="depth-options">
            {[
              ['quick', 'Quick', 'Broad first look'],
              ['standard', 'Standard', 'Balanced diagnosis'],
              ['deep', 'Deep', 'More context, more detail'],
            ].map(([id, name, desc]) => (
              <button
                type="button"
                className={depth === id ? 'depth selected' : 'depth'}
                key={id}
                onClick={() => setDepth(id)}
              >
                <span className="radio-dot" />
                <strong>{name}</strong>
                <small>{desc}</small>
              </button>
            ))}
          </div>
          <div className="info-box">
            <ShieldCheck size={19} />
            <span>
              {harness === 'static'
                ? 'Local baseline checks structural signals without AI. Scan depth applies to AI context; baseline inspects all eligible files.'
                : 'Selected source excerpts are sent to your chosen harness. Ignored files and symlinks are excluded; common credential patterns are redacted. Large repositories use bounded sampling.'}
              {harness === 'copilot' ? ' Copilot controls its own reasoning effort.' : ''}
            </span>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || !active?.available}>
              <ScanLine size={16} />
              {busy ? 'Starting scan…' : 'Start scan'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
