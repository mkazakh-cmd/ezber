import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import type { CardKind, CardRow, StoredFsrs } from '../db';

export { Rating };
export type { Grade };

const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 });

export function toStored(c: Card): StoredFsrs {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime(),
  };
}

export function fromStored(s: StoredFsrs): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review === undefined ? undefined : new Date(s.last_review),
  };
}

export function newCard(id: string, kind: CardKind, now: number = Date.now()): CardRow {
  const fs = toStored(createEmptyCard(new Date(now)));
  return { id, kind, due: fs.due, created: now, fsrs: fs };
}

/** Kartı değerlendirir ve yeni halini döner (veritabanına yazmaz). */
export function grade(card: CardRow, rating: Grade, now: number = Date.now()): CardRow {
  const { card: next } = scheduler.next(fromStored(card.fsrs), new Date(now), rating);
  const fs = toStored(next);
  let level = card.level;
  if (card.kind === 'hadith') {
    const cur = level ?? 0;
    if (rating === Rating.Again) level = Math.max(0, cur - 1);
    else if (rating === Rating.Good || rating === Rating.Easy) level = Math.min(MAX_HADITH_LEVEL, cur + 1);
    else level = cur;
  }
  return { ...card, fsrs: fs, due: fs.due, level };
}

export const MAX_HADITH_LEVEL = 4;

/** Her düğmenin altında gösterilecek "bir sonraki tekrar" süresi. */
export function previewIntervals(card: CardRow, now: number = Date.now()): Record<Grade, number> {
  const p = scheduler.repeat(fromStored(card.fsrs), new Date(now));
  return {
    [Rating.Again]: p[Rating.Again].card.due.getTime() - now,
    [Rating.Hard]: p[Rating.Hard].card.due.getTime() - now,
    [Rating.Good]: p[Rating.Good].card.due.getTime() - now,
    [Rating.Easy]: p[Rating.Easy].card.due.getTime() - now,
  } as Record<Grade, number>;
}

export function formatInterval(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} dk`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} gün`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} ay`;
  return `${(d / 365).toFixed(1)} yıl`;
}
