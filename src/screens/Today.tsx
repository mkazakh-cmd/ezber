import { useEffect, useState } from 'preact/hooks';
import { db } from '../db';
import type { Focus, Settings } from '../settings';
import { dueCounts, newCountsToday, nextItem, type Item, type NewCounts } from '../srs/queue';
import { applyGrade, completeAyah, introduceHadith, introduceWord } from '../srs/actions';
import type { Grade } from '../srs/fsrs';
import { WordIntro, WordReview } from '../modes/WordCard';
import { AyahReview, AyahStudy, SurahReview } from '../modes/AyahStudy';
import { HadithIntro, HadithReview, HadithSrcReview } from '../modes/HadithCloze';
import { streak } from './Stats';

const TABS: { f: Focus; label: string }[] = [
  { f: 'all', label: 'Hepsi' },
  { f: 'ayah', label: 'Ayet' },
  { f: 'hadith', label: 'Hadis' },
  { f: 'word', label: 'İngilizce' },
];

export function Today({
  settings,
  update,
  goLibrary,
}: {
  settings: Settings;
  update: (s: Settings) => void;
  goLibrary: () => void;
}) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [due, setDue] = useState<Record<Focus, number>>({ all: 0, ayah: 0, hadith: 0, word: 0 });
  const [counts, setCounts] = useState<NewCounts>({ words: 0, ayahs: 0, hadiths: 0 });
  const [days, setDays] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [it, d, c, s] = await Promise.all([nextItem(settings), dueCounts(), newCountsToday(), streak()]);
      if (!alive) return;
      setItem(it);
      setDue(d);
      setCounts(c);
      setDays(s);
      window.scrollTo(0, 0);
    })();
    return () => {
      alive = false;
    };
  }, [tick, settings]);

  const reload = () => setTick((t) => t + 1);

  async function grade(r: Grade) {
    if (item?.type !== 'review') return;
    await applyGrade(item.card, r);
    reload();
  }

  /** Gösterilemeyen kartı (silinmiş sure vb.) değerlendirmeden yarına ertele. */
  async function skip() {
    if (item?.type !== 'review') return;
    const due = Date.now() + 24 * 60 * 60 * 1000;
    await db.cards.update(item.card.id, { due, fsrs: { ...item.card.fsrs, due } });
    reload();
  }

  const focus = settings.focus;
  const show = (f: Exclude<Focus, 'all'>) => focus === 'all' || focus === f;

  const header = (
    <div style={{ marginBottom: 12 }}>
      <div class="seg" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.f}
            role="tab"
            aria-selected={focus === t.f}
            class={focus === t.f ? 'on' : ''}
            onClick={() => focus !== t.f && update({ ...settings, focus: t.f })}
          >
            {t.label}
            {due[t.f] > 0 && <span class="badge">{due[t.f]}</span>}
          </button>
        ))}
      </div>
      <div class="row wrap small muted" style={{ gap: 10 }}>
        <span>Bugün yeni:</span>
        {show('ayah') && (
          <span>
            Ayet {counts.ayahs}/{settings.newAyahsPerDay}
          </span>
        )}
        {show('hadith') && (
          <span>
            Hadis {counts.hadiths}/{settings.newHadithsPerDay}
          </span>
        )}
        {show('word') && (
          <span>
            Kelime {counts.words}/{settings.newWordsPerDay}
          </span>
        )}
        <span class="spacer" />
        {days > 0 && <span title="Kesintisiz çalışılan gün">🔥 {days}</span>}
      </div>
    </div>
  );

  if (item === undefined) return null;

  if (item === null) {
    return (
      <div>
        {header}
        <div class="card stack center">
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h1>{focus === 'all' ? 'Bugünlük bu kadar' : `${TABS.find((t) => t.f === focus)!.label} bugünlük tamam`}</h1>
          <p class="muted">Vadesi gelen tekrar yok ve günlük yeni içerik kotası doldu.</p>
          {focus !== 'all' && (
            <button class="btn primary" onClick={() => update({ ...settings, focus: 'all' })}>
              {due.all > 0 ? `Diğer türlerde ${due.all} tekrar var · Hepsi'ne geç` : "Hepsi'ne geç"}
            </button>
          )}
          {show('ayah') && settings.activeSurah == null && (
            <>
              <p>Sure ezberine başlamak için Kütüphane'den bir sure seçin.</p>
              <button class="btn" onClick={goLibrary}>
                Kütüphane'ye git
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  let body;
  switch (item.type) {
    case 'newWord':
      body = <WordIntro word={item.word} onDone={() => introduceWord(item.word).then(reload)} />;
      break;
    case 'newAyah':
      body = (
        <AyahStudy
          surah={item.surah}
          ayah={item.ayah}
          settings={settings}
          onDone={() => completeAyah(item.surah, item.ayah).then(reload)}
        />
      );
      break;
    case 'newHadith':
      body = <HadithIntro hadith={item.hadith} onDone={() => introduceHadith(item.hadith).then(reload)} />;
      break;
    case 'review': {
      const c = item.card;
      if (c.kind === 'word') body = <WordReview card={c} onGrade={grade} onSkip={skip} />;
      else if (c.kind === 'ayah') body = <AyahReview card={c} settings={settings} onGrade={grade} onSkip={skip} />;
      else if (c.kind === 'surah') body = <SurahReview card={c} onGrade={grade} onSkip={skip} />;
      else if (c.kind === 'hadith') body = <HadithReview card={c} onGrade={grade} onSkip={skip} />;
      else body = <HadithSrcReview card={c} onGrade={grade} onSkip={skip} />;
    }
  }

  return (
    <div>
      {header}
      {body}
    </div>
  );
}
