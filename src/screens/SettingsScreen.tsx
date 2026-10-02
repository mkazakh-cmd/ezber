import { useEffect, useState } from 'preact/hooks';
import { db, dayKey } from '../db';
import { RECITERS, type Settings } from '../settings';
import { audioBytes } from '../content/quranApi';

const BACKUP_VERSION = 1;

/** Ses dosyaları hariç tüm veriyi JSON olarak indirir (sesler yeniden indirilebilir). */
async function exportBackup() {
  const data = {
    app: 'ezber',
    version: BACKUP_VERSION,
    exported: new Date().toISOString(),
    cards: await db.cards.toArray(),
    reviews: await db.reviews.toArray(),
    kv: await db.kv.toArray(),
    surahs: await db.surahs.toArray(),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ezber-yedek-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file: File): Promise<string> {
  const data = JSON.parse(await file.text());
  if (data.app !== 'ezber' || !Array.isArray(data.cards)) throw new Error('Bu bir Ezber yedek dosyası değil');
  await db.transaction('rw', [db.cards, db.reviews, db.kv, db.surahs], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.kv.clear(), db.surahs.clear()]);
    await db.cards.bulkPut(data.cards);
    await db.reviews.bulkPut(data.reviews ?? []);
    await db.kv.bulkPut(data.kv ?? []);
    // Ses kaydı yedekte yok; surelerin "ses indirildi" işaretini kaldır
    await db.surahs.bulkPut((data.surahs ?? []).map((s: { audioReciter?: string }) => ({ ...s, audioReciter: undefined })));
  });
  return `${data.cards.length} kart geri yüklendi.`;
}

function Num({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label class="field">
      <span>
        {label}: <strong>{value}</strong>
      </span>
      <input type="range" min={min} max={max} value={value} onInput={(e) => onChange(Number(e.currentTarget.value))} />
    </label>
  );
}

export function SettingsScreen({ settings, update }: { settings: Settings; update: (s: Settings) => void }) {
  const [msg, setMsg] = useState('');
  const [bytes, setBytes] = useState(0);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    audioBytes().then(setBytes);
    navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update({ ...settings, [k]: v });

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!confirm('Mevcut tüm ilerleme silinip yedektekiyle değiştirilecek. Devam edilsin mi?')) return;
    try {
      setMsg(await importBackup(f));
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      setMsg(`Hata: ${(err as Error).message}`);
    }
  }

  async function persist() {
    const ok = await navigator.storage?.persist?.();
    setPersisted(!!ok);
  }

  return (
    <div>
      <h1>Ayarlar</h1>

      <h2>Günlük yeni içerik</h2>
      <div class="card tight">
        <Num label="Yeni kelime" value={settings.newWordsPerDay} min={0} max={40} onChange={(v) => set('newWordsPerDay', v)} />
        <Num label="Yeni ayet" value={settings.newAyahsPerDay} min={0} max={20} onChange={(v) => set('newAyahsPerDay', v)} />
        <Num label="Yeni hadis" value={settings.newHadithsPerDay} min={0} max={5} onChange={(v) => set('newHadithsPerDay', v)} />
      </div>

      <h2>Kur'an sesi</h2>
      <div class="card tight">
        <label class="field">
          <span>Hafız</span>
          <select value={settings.reciter} onChange={(e) => set('reciter', e.currentTarget.value)}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <p class="muted small">Hafızı değiştirirseniz, internetsiz dinlemek için sesleri Kütüphane'den yeniden indirin.</p>
        <Num label="Dinleme aşamasında tekrar" value={settings.audioRepeat} min={1} max={10} onChange={(v) => set('audioRepeat', v)} />
        <label class="field">
          <span>Hız</span>
          <select value={String(settings.audioRate)} onChange={(e) => set('audioRate', Number(e.currentTarget.value))}>
            <option value="0.75">Yavaş (0.75×)</option>
            <option value="0.9">Biraz yavaş (0.9×)</option>
            <option value="1">Normal</option>
          </select>
        </label>
        <p class="muted small">İndirilmiş sesler: {(bytes / 1024 / 1024).toFixed(1)} MB</p>
      </div>

      <h2>Yedek</h2>
      <div class="card tight stack">
        <p class="muted small">
          İlerlemeniz yalnızca bu telefonda durur. Ara sıra yedek alıp Drive'a veya bilgisayara kaydedin.
        </p>
        <button class="btn block" onClick={exportBackup}>
          Yedeği indir
        </button>
        <label class="btn block center" style={{ display: 'block' }}>
          Yedekten geri yükle
          <input type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
        </label>
        {persisted === false && (
          <button class="btn block" onClick={persist}>
            Verileri kalıcı yap (tarayıcı temizliğinde silinmesin)
          </button>
        )}
        {persisted && <p class="muted small">✓ Veriler kalıcı depolamada.</p>}
        {msg && <p>{msg}</p>}
      </div>

      <p class="muted small center" style={{ marginTop: 24 }}>
        Kur'an metni ve Diyanet meali: alquran.cloud · Sesler: everyayah.com · Kelime listesi: NGSL (CC BY-SA 4.0)
      </p>
    </div>
  );
}
