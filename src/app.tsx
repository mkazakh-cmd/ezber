import { useEffect, useState } from 'preact/hooks';
import { loadSettings, saveSettings, type Settings } from './settings';
import { Today } from './screens/Today';
import { Library } from './screens/Library';
import { Stats } from './screens/Stats';
import { SettingsScreen } from './screens/SettingsScreen';

type Tab = 'today' | 'library' | 'stats' | 'settings';

const ICONS: Record<Tab, string> = {
  today: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m0-12.8L7 7m10 10 1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  library: 'M4 19V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13',
  stats: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  settings: 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M16 4v4M10 10v4M18 16v4',
};
const LABELS: Record<Tab, string> = { today: 'Bugün', library: 'Kütüphane', stats: 'İstatistik', settings: 'Ayarlar' };

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [settings, setSettings] = useState<Settings>();

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  function update(s: Settings) {
    setSettings(s);
    saveSettings(s);
  }

  if (!settings) return null;

  return (
    <>
      <main>
        {tab === 'today' && <Today settings={settings} goLibrary={() => setTab('library')} />}
        {tab === 'library' && <Library settings={settings} update={update} />}
        {tab === 'stats' && <Stats />}
        {tab === 'settings' && <SettingsScreen settings={settings} update={update} />}
      </main>
      <nav class="tabs">
        {(Object.keys(LABELS) as Tab[]).map((t) => (
          <button key={t} class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d={ICONS[t]} />
            </svg>
            {LABELS[t]}
          </button>
        ))}
      </nav>
    </>
  );
}
