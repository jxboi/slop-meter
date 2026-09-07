import type { Workspace } from '../types';
import { useState } from 'react';
import { Save, Plus, Settings2 } from 'lucide-react';
import type { Profile } from '../types';
import { post } from '../api';
import { Badge, SectionTitle } from '../components/ui';
import { dimensionDescriptions, slopDimensions } from '../slopTaxonomy';
type Shared = {
  data: Workspace;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
export function ProfilesPage({ data, refresh, notify }: Shared) {
  const [selected, setSelected] = useState(
    data.profiles.find((p) => p.active)?.id || data.profiles[0]?.id,
  );
  const [draft, setDraft] = useState<Profile>(
      structuredClone(data.profiles.find((p) => p.id === selected)!),
    ),
    [busy, setBusy] = useState(false);
  const select = (p: Profile) => {
    setSelected(p.id);
    setDraft(structuredClone(p));
  };
  return (
    <div className="profile-layout">
      <aside className="profile-list">
        {data.profiles.map((p) => (
          <button
            key={p.id}
            className={selected === p.id ? 'profile-option selected' : 'profile-option'}
            onClick={() => select(p)}
          >
            <span className="profile-option-icon">
              <Settings2 size={19} />
            </span>
            <div>
              <strong>{p.name}</strong>
              <p>{p.description}</p>
              {p.active && <Badge tone="green">Default profile</Badge>}
            </div>
          </button>
        ))}
        <button
          className="button new-profile"
          onClick={() => {
            setSelected('new');
            setDraft({
              ...structuredClone(data.profiles[0]),
              id: '',
              name: 'My Slop Profile',
              description: 'Engineering priorities for our team.',
              active: false,
            });
          }}
        >
          <Plus size={16} />
          Create a profile
        </button>
      </aside>
      <form
        className="panel profile-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = await post<Profile>('/profiles', { ...draft, id: draft.id || undefined });
            await refresh();
            setSelected(p.id);
            setDraft(p);
            notify('Slop Profile saved. It will apply to future scans.');
          } catch (e) {
            notify((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <SectionTitle
          title="Define what good looks like"
          subtitle="Your codebase. Your engineering priorities."
        />
        <div className="form-columns">
          <label>
            Profile name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Description
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
        <h3 className="form-section-label">What matters to your team?</h3>
        <p className="field-help">
          Adjust the emphasis. These guide discovery, not a fixed checklist.{' '}
          <a href="#guide">Explore the built-in rubric.</a>
        </p>
        <div className="weight-grid">
          {slopDimensions.map((key) => {
            const value = draft.weights[key];
            return (
              <label className="weight" key={key} title={dimensionDescriptions[key]}>
                <span>
                  {key}
                  <strong>
                    {['Minimal', 'Low', 'Some', 'Balanced', 'High', 'Highest'][value]}
                  </strong>
                </span>
                <input
                  aria-label={`${key} emphasis`}
                  type="range"
                  min="0"
                  max="5"
                  value={value}
                  onChange={(e) =>
                    setDraft({ ...draft, weights: { ...draft.weights, [key]: +e.target.value } })
                  }
                />
              </label>
            );
          })}
        </div>
        <label>
          In your own words
          <textarea
            rows={3}
            value={draft.instructions}
            onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
            placeholder="What should the AI look for? What should it leave alone?"
          />
        </label>
        <label>
          Team-specific rules
          <textarea
            rows={3}
            value={draft.rules}
            onChange={(e) => setDraft({ ...draft, rules: e.target.value })}
            placeholder="For example: preserve public APIs and prefer incremental changes."
          />
        </label>
        <div className="form-bottom">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Use as default profile
          </label>
          <button className="button primary" disabled={busy}>
            <Save size={16} />
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
