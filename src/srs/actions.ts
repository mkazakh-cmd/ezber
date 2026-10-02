import { db, dayKey, type CardRow, type SurahRow } from '../db';
import type { Hadith, Word } from '../content/types';
import { grade, newCard, Rating, type Grade } from './fsrs';

async function logReview(cardId: string, rating: number, now: number) {
  await db.reviews.add({ cardId, ts: now, rating, day: dayKey(now) });
}

export async function applyGrade(card: CardRow, rating: Grade, now: number = Date.now()): Promise<CardRow> {
  const next = grade(card, rating, now);
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(next);
    await logReview(card.id, rating, now);
  });
  return next;
}

/** İlk tanışma: kart oluşturulur ve "İyi" ile ilk öğrenme adımına alınır. */
async function introduce(id: string, kind: CardRow['kind'], now: number, level?: number): Promise<CardRow> {
  const c = grade(newCard(id, kind, now), Rating.Good, now);
  if (level !== undefined) c.level = level;
  await db.cards.put(c);
  await logReview(id, Rating.Good, now);
  return c;
}

export async function introduceWord(word: Word, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await introduce(`w:${word.w}:en`, 'word', now);
    await introduce(`w:${word.w}:tr`, 'word', now);
  });
}

export async function completeAyah(surah: SurahRow, ayah: number, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await introduce(`a:${surah.number}:${ayah}`, 'ayah', now);
    if (ayah === surah.ayahCount && surah.ayahCount > 1) {
      // Sure bitti: baştan sona okuma kartı, ertesi günden itibaren
      const s = newCard(`s:${surah.number}`, 'surah', now);
      const tomorrow = now + 24 * 60 * 60 * 1000;
      s.due = tomorrow;
      s.fsrs.due = tomorrow;
      await db.cards.put(s);
    }
  });
}

export async function introduceHadith(h: Hadith, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await introduce(`h:${h.n}`, 'hadith', now, 0);
    await introduce(`h:${h.n}:src`, 'hadithSrc', now);
  });
}

/** Kart kimliğinden parçalar: "a:2:255" → ["a","2","255"] */
export function parseId(id: string): string[] {
  return id.split(':');
}
