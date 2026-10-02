import { useEffect, useState } from 'preact/hooks';
import { db } from '../db';
import type { Settings } from '../settings';
import { dueCount, newCountsToday, nextItem, type Item, type NewCounts } from '../srs/queue';
import { applyGrade, completeAyah, introduceHadith, introduceWord } from '../srs/actions';
import type { Grade } from '../srs/fsrs';
import { WordIntro, WordReview } from '../modes/WordCard';
import { AyahReview, AyahStudy, SurahReview } from '../modes/AyahStudy';
import { HadithIntro, HadithReview, HadithSrcReview } from '../modes/HadithCloze';
import { streak } from './Stats';

export function Today({ settings, goLibrary }: { settings: Settings; goLibrary: () => void }) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [due, setDue] = useState(0);
  const [counts, setCounts] = useState<NewCounts>({ words: 0, ayahs: 0, hadiths: 0 });
  const [days, setDays] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [it, d, c, s] = await Promise.all([nextItem(settings), dueCount(), newCountsToday(), streak()]);
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

  const header = (
    <div class="row wrap small" style={{ marginBottom: 12, gap: 6 }}>
      <span class="tag" title="Vadesi gelmiş tekrar">↻ {due}</span>
      <span class="tag" title="Bugünkü yeni kelime">
        Kelime {counts.words}/{settings.newWordsPerDay}
      </span>
      <span class="tag" title="Bugünkü yeni ayet">
        Ayet {counts.ayahs}/{settings.newAyahsPerDay}
      </span>
      <span class="tag" title="Bugünkü yeni hadis">
        Hadis {counts.hadiths}/{settings.newHadithsPerDay}
      </span>
      <span class="spacer" />
      {days > 0 && <span title="Kesintisiz çalışılan gün">🔥 {days}</span>}
    </div>
  );

  if (item === undefined) return null;

  if (item === null) {
    return (
      <div>
        {header}
        <div class="card stack center">
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h1>Bugünlük bu kadar</h1>
          <p class="muted">Vadesi gelen tekrar yok ve günlük yeni içerik kotası doldu.</p>
          {settings.activeSurah == null && (
            <>
              <p>Sure ezberine başlamak için Kütüphane'den bir sure seçin.</p>
              <button class="btn primary" onClick={goLibrary}>
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
