import { useEffect, useState } from 'preact/hooks';
import { db, dayKey } from '../db';
import { endOfToday, startOfToday } from '../srs/queue';
import { WORDS } from '../content/words';
import { HADITHS } from '../content/hadith';

const DAY = 24 * 60 * 60 * 1000;

/** Bugünden (bugün henüz çalışılmadıysa dünden) geriye kesintisiz çalışılan gün sayısı. */
export async function streak(now: number = Date.now()): Promise<number> {
  const days = new Set(await db.reviews.orderBy('day').uniqueKeys());
  let d = startOfToday(now);
  if (!days.has(dayKey(d))) d -= DAY;
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d -= DAY;
  }
  return n;
}

/** "Ezberlendi" sayılan eşik: öğrenme adımlarını geçmiş (Review durumu) kartlar. */
const STATE_REVIEW = 2;

interface Data {
  streak: number;
  words: number;
  wordsLearned: number;
  ayahs: number;
  ayahsLearned: number;
  surahs: number;
  hadiths: number;
  hadithsLearned: number;
  totalReviews: number;
  /** Önümüzdeki 7 gün, gün başına vadesi gelecek kart sayısı */
  ahead: number[];
  /** Son 7 gün, gün başına yapılan tekrar sayısı */
  past: number[];
}

const WEEKDAY = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function Stats() {
  const [d, setD] = useState<Data>();

  useEffect(() => {
    (async () => {
      const cards = await db.cards.toArray();
      const now = Date.now();
      const ahead = Array.from({ length: 7 }, () => 0);
      for (const c of cards) {
        const i = c.due <= endOfToday(now) ? 0 : Math.floor((c.due - startOfToday(now)) / DAY);
        if (i >= 0 && i < 7) ahead[i]++;
      }
      const past = await Promise.all(
        Array.from({ length: 7 }, (_, i) => db.reviews.where('day').equals(dayKey(now - (6 - i) * DAY)).count()),
      );
      const kind = (k: string) => cards.filter((c) => c.kind === k);
      const enWords = kind('word').filter((c) => c.id.endsWith(':en'));
      setD({
        streak: await streak(now),
        words: enWords.length,
        wordsLearned: enWords.filter((c) => c.fsrs.state === STATE_REVIEW).length,
        ayahs: kind('ayah').length,
        ayahsLearned: kind('ayah').filter((c) => c.fsrs.state === STATE_REVIEW).length,
        surahs: kind('surah').length,
        hadiths: kind('hadith').length,
        hadithsLearned: kind('hadith').filter((c) => c.fsrs.state === STATE_REVIEW).length,
        totalReviews: await db.reviews.count(),
        ahead,
        past,
      });
    })();
  }, []);

  if (!d) return null;
  const now = Date.now();

  return (
    <div>
      <h1>İstatistik</h1>
      <div class="stats-grid">
        <div class="card tight stat">
          <div class="v">🔥 {d.streak}</div>
          <div class="l">gün seri</div>
        </div>
        <div class="card tight stat">
          <div class="v">{d.totalReviews}</div>
          <div class="l">toplam tekrar</div>
        </div>
        <div class="card tight stat">
          <div class="v">{d.ayahs}</div>
          <div class="l">
            ayet ({d.ayahsLearned} oturmuş) · {d.surahs} sure tamam
          </div>
        </div>
        <div class="card tight stat">
          <div class="v">{d.words}</div>
          <div class="l">
            / {WORDS.length} kelime ({d.wordsLearned} oturmuş)
          </div>
        </div>
        <div class="card tight stat">
          <div class="v">{d.hadiths}</div>
          <div class="l">
            / {HADITHS.length} hadis ({d.hadithsLearned} oturmuş)
          </div>
        </div>
      </div>

      <h2>Önümüzdeki 7 gün</h2>
      <Bars values={d.ahead} labels={d.ahead.map((_, i) => (i === 0 ? 'Bugün' : WEEKDAY[new Date(now + i * DAY).getDay()]))} />

      <h2>Son 7 gün</h2>
      <Bars values={d.past} labels={d.past.map((_, i) => (i === 6 ? 'Bugün' : WEEKDAY[new Date(now - (6 - i) * DAY).getDay()]))} />

      <p class="muted small">"Oturmuş": öğrenme adımlarını geçip günlerle ölçülen tekrar aralığına girmiş kart.</p>
    </div>
  );
}

function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div class="card tight">
      <div class="bars">
        {values.map((v, i) => (
          <div key={i}>
            <span class="cnt">{v || ''}</span>
            <span class="bar" style={{ height: `${(v / max) * 85}%` }} />
            <span class="lbl">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
