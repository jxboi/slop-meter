import { useState } from 'react';
import { CircleDashed, Save } from 'lucide-react';
import type { Workspace, Harness } from '../types';
import { api } from '../api';
import { Badge, SectionTitle } from '../components/ui';
type Shared = {
  data: Workspace;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
export function SettingsPage({
  data,
  refresh,
  notify,
  harnesses,
}: Shared & { harnesses: Harness[] }) {
  const [settings, setSettings] = useState(data.settings),
    [busy, setBusy] = useState(false);
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <SectionTitle
          title="Your workspace"
          subtitle="A local home for clearer engineering decisions."
        />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('/settings', { method: 'PATCH', body: JSON.stringify(settings) });
              await refresh();
              notify('Workspace settings saved');
            } catch (e) {
              notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Workspace name
            <input
              value={settings.workspaceName}
              required
              onChange={(e) => setSettings({ ...settings, workspaceName: e.target.value })}
            />
          </label>
          <div className="form-columns">
            <label>
              Default harness
              <select
                value={settings.defaultHarness}
                onChange={(e) => setSettings({ ...settings, defaultHarness: e.target.value })}
              >
                {harnesses.map((h) => (
                  <option value={h.id} key={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Default model
              <input
                value={settings.defaultModel}
                onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                placeholder="Use harness default"
              />
            </label>
          </div>
          <button className="button primary" disabled={busy}>
            <Save size={16} />
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>
      <section className="panel settings-panel">
        <SectionTitle
          title="Your AI, your choice"
          subtitle="Connect through local CLIs or server-side API credentials."
        />
        {harnesses.map((h) => (
          <div className="harness-row" key={h.id}>
            <span className="harness-icon">
              {h.id === 'static' ? <MonitorIcon /> : <span>{h.name.charAt(0)}</span>}
            </span>
            <div>
              <strong>{h.name}</strong>
              <p>{h.detail}</p>
            </div>
            <Badge tone={h.available ? 'green' : 'neutral'}>
              {h.available ? 'Available' : 'Not configured'}
            </Badge>
          </div>
        ))}
        <div className="info-box">
          CLI availability confirms installation, not authentication. Sign in through your chosen
          CLI before scanning. API credentials are read from the server environment and never sent
          to the browser.
        </div>
      </section>
    </div>
  );
}
function MonitorIcon() {
  return <CircleDashed size={20} />;
}
