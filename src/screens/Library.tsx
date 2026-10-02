import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { db, type SurahRow } from '../db';
import type { Settings } from '../settings';
import { SURAHS, type SurahInfo } from '../content/surahList';
import { deleteSurah, downloadSurahAudio, downloadSurahText } from '../content/quranApi';
import { WORDS, WORDS_PER_LEVEL } from '../content/words';
import { HADITHS } from '../content/hadith';

type Tab = 'quran' | 'words' | 'hadith';

export function Library({ settings, update }: { settings: Settings; update: (s: Settings) => void }) {
  const [tab, setTab] = useState<Tab>('quran');
  return (
    <div>
      <h1>Kütüphane</h1>
      <div class="seg">
        <button class={tab === 'quran' ? 'on' : ''} onClick={() => setTab('quran')}>Sureler</button>
        <button class={tab === 'words' ? 'on' : ''} onClick={() => setTab('words')}>Kelimeler</button>
        <button class={tab === 'hadith' ? 'on' : ''} onClick={() => setTab('hadith')}>Hadisler</button>
      </div>
      {tab === 'quran' && <Quran settings={settings} update={update} />}
      {tab === 'words' && <Words />}
      {tab === 'hadith' && <Hadiths />}
    </div>
  );
}

/** Kart kimliklerinden sure başına ezberlenen ayet sayısı. */
async function ayahProgress(): Promise<Map<number, number>> {
  const ids = await db.cards.where('kind').equals('ayah').primaryKeys();
  const m = new Map<number, number>();
  for (const id of ids) {
    const s = Number(id.split(':')[1]);
    m.set(s, (m.get(s) ?? 0) + 1);
  }
  return m;
}

function Quran({ settings, update }: { settings: Settings; update: (s: Settings) => void }) {
  const [progress, setProgress] = useState(new Map<number, number>());
  const [downloaded, setDownloaded] = useState(new Map<number, SurahRow>());
  const [open, setOpen] = useState<SurahInfo | null>(null);
  const [filter, setFilter] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ayahProgress().then(setProgress);
    db.surahs.toArray().then((rows) => setDownloaded(new Map(rows.map((r) => [r.number, r]))));
  }, [tick]);

  if (open)
    return (
      <SurahDetail
        info={open}
        row={downloaded.get(open.number)}
        learned={progress.get(open.number) ?? 0}
        settings={settings}
        update={update}
        back={() => {
          setOpen(null);
          setTick((t) => t + 1);
        }}
      />
    );

  const q = filter.trim().toLocaleLowerCase('tr');
  const list = SURAHS.filter((s) => !q || s.name.toLocaleLowerCase('tr').includes(q) || String(s.number) === q);
  // Kısa sureler (Amme cüzü) ezbere en uygun başlangıç; sondan başa sırala seçeneği yerine ipucu
  return (
    <div>
      <input placeholder="Sure ara (ad veya numara)" value={filter} onInput={(e) => setFilter(e.currentTarget.value)} />
      <p class="muted small">İpucu: ezbere kısa surelerden (Nâs, Felak, İhlâs…) başlamak kolaylık sağlar.</p>
      <ul class="list">
        {list.map((s) => {
          const learned = progress.get(s.number) ?? 0;
          const isActive = settings.activeSurah === s.number;
          return (
            <li key={s.number} onClick={() => setOpen(s)}>
              <span class="num">{s.number}</span>
              <div style={{ flex: 1 }}>
                <div>
                  {s.name} {isActive && <span class="tag">ezberleniyor</span>}
                  {downloaded.has(s.number) && !isActive && <span class="tag">indirildi</span>}
                </div>
                <div class="muted small">
                  {learned}/{s.ayahCount} ayet
                </div>
                {learned > 0 && (
                  <div class="progress">
                    <div style={{ width: `${(learned / s.ayahCount) * 100}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SurahDetail({
  info,
  row,
  learned,
  settings,
  update,
  back,
}: {
  info: SurahInfo;
  row: SurahRow | undefined;
  learned: number;
  settings: Settings;
  update: (s: Settings) => void;
  back: () => void;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [surah, setSurah] = useState(row);
  const isActive = settings.activeSurah === info.number;
  const audioOk = surah?.audioReciter === settings.reciter;

  async function download() {
    setBusy(true);
    try {
      setStatus('Metin ve meal indiriliyor…');
      const s = await downloadSurahText(info.number);
      setStatus('Sesler indiriliyor…');
      await downloadSurahAudio(s, settings.reciter, (d, t) => setStatus(`Sesler indiriliyor… ${d}/${t}`));
      setSurah(await db.surahs.get(info.number));
      setStatus('Hazır. İnternetsiz çalışabilirsiniz.');
      return true;
    } catch (e) {
      setStatus(`Hata: ${(e as Error).message}. İnternet bağlantısını kontrol edip yeniden deneyin.`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!audioOk && !(await download())) return;
    update({ ...settings, activeSurah: info.number });
  }

  async function remove() {
    if (!confirm(`${info.name} suresinin metni ve sesleri telefondan silinsin mi? Ezber ilerlemeniz korunur.`)) return;
    await deleteSurah(info.number);
    if (isActive) update({ ...settings, activeSurah: null });
    setSurah(undefined);
    setStatus('Silindi.');
  }

  return (
    <div class="stack">
      <button class="btn ghost" onClick={back}>
        ← Sureler
      </button>
      <div class="card stack">
        <div class="tr-big">
          {info.number}. {info.name}
        </div>
        <div class="muted">
          {info.ayahCount} ayet · {learned} ayet ezberlendi
        </div>
        {isActive ? (
          <p>
            Bu sure şu an ezberleniyor. Her gün {settings.newAyahsPerDay} yeni ayet "Bugün" ekranına gelir.
          </p>
        ) : (
          <button class="btn primary block" disabled={busy} onClick={start}>
            {learned > 0 ? 'Ezbere devam et' : 'Ezbere başla'}
          </button>
        )}
        {surah && !audioOk && !busy && (
          <button class="btn block" onClick={download}>
            Sesleri seçili hafızla indir
          </button>
        )}
        {status && <div class="muted small">{status}</div>}
        {surah && (
          <button class="btn danger ghost" disabled={busy} onClick={remove}>
            Telefondan sil
          </button>
        )}
      </div>
      {surah && (
        <div class="card stack">
          {surah.arabic.map((t, i) => (
            <div key={i}>
              <div class="arabic small-ar">
                {t} <span class="muted small">﴿{i + 1}﴾</span>
              </div>
              <div class="meal">{surah.meal[i]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Words() {
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    db.cards
      .where('kind')
      .equals('word')
      .primaryKeys()
      .then((ids) => setKnown(new Set(ids.filter((i) => i.endsWith(':en')).map((i) => i.split(':')[1]))));
  }, []);

  const levels = Math.ceil(WORDS.length / WORDS_PER_LEVEL);
  return (
    <div>
      <p class="muted small">
        En sık kullanılan İngilizce kelimeler (NGSL listesi), sıklık sırasıyla. Yeni kelimeler bu sırayla gelir.
      </p>
      <ul class="list">
        {Array.from({ length: levels }, (_, l) => {
          const slice = WORDS.slice(l * WORDS_PER_LEVEL, (l + 1) * WORDS_PER_LEVEL);
          const k = slice.filter((w) => known.has(w.w)).length;
          return (
            <Fragment key={l}>
              <li onClick={() => setOpen(open === l ? null : l)}>
                <span class="num">{l + 1}</span>
                <div style={{ flex: 1 }}>
                  <div>Seviye {l + 1}</div>
                  <div class="muted small">
                    {k}/{slice.length} kelime
                  </div>
                  <div class="progress">
                    <div style={{ width: `${(k / slice.length) * 100}%` }} />
                  </div>
                </div>
              </li>
              {open === l && (
                <li key={`d${l}`} style={{ display: 'block' }}>
                  {slice.map((w) => (
                    <div key={w.w} class="row small" style={{ padding: '4px 0' }}>
                      <span style={{ width: 18 }}>{known.has(w.w) ? '✓' : ''}</span>
                      <strong>{w.w}</strong>
                      <span class="muted">{w.tr}</span>
                    </div>
                  ))}
                </li>
              )}
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}

function Hadiths() {
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    db.cards
      .where('kind')
      .equals('hadith')
      .primaryKeys()
      .then((ids) => setKnown(new Set(ids.map((i) => Number(i.split(':')[1])))));
  }, []);
  return (
    <div>
      <p class="muted small">İmam Nevevî'nin Kırk Hadis'i. Yeni hadisler bu sırayla gelir.</p>
      <ul class="list">
        {HADITHS.map((h) => (
          <Fragment key={h.n}>
            <li onClick={() => setOpen(open === h.n ? null : h.n)}>
              <span class="num">{h.n}</span>
              <div style={{ flex: 1 }}>
                {h.title} {known.has(h.n) && <span class="tag">✓</span>}
              </div>
            </li>
            {open === h.n && (
              <li key={`d${h.n}`} style={{ display: 'block' }}>
                <p>{h.text}</p>
                <div class="muted small">
                  Ravi: {h.narrator} · Kaynak: {h.source}
                </div>
              </li>
            )}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
