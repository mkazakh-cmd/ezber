import { db, type CardKind, type CardRow, type SurahRow } from '../db';
import type { Focus, Settings } from '../settings';
import type { Hadith, Word } from '../content/types';
import { WORDS } from '../content/words';
import { HADITHS } from '../content/hadith';

export type Item =
  | { type: 'review'; card: CardRow }
  | { type: 'newWord'; word: Word }
  | { type: 'newAyah'; surah: SurahRow; ayah: number }
  | { type: 'newHadith'; hadith: Hadith };

/** Öğrenme adımındaki kartlar (dakikalık aralıklar) bu kadar erken gösterilebilir. */
const LEARN_AHEAD_MS = 20 * 60 * 1000;

export function startOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfToday(now: number = Date.now()): number {
  return startOfToday(now) + 24 * 60 * 60 * 1000 - 1;
}

export interface NewCounts {
  words: number;
  ayahs: number;
  hadiths: number;
}

/** Bugün eklenmiş yeni içerik sayıları. */
export async function newCountsToday(now: number = Date.now()): Promise<NewCounts> {
  const since = startOfToday(now);
  const created = await db.cards.filter((c) => c.created >= since).toArray();
  return {
    words: created.filter((c) => c.kind === 'word' && c.id.endsWith(':en')).length,
    ayahs: created.filter((c) => c.kind === 'ayah').length,
    hadiths: created.filter((c) => c.kind === 'hadith').length,
  };
}

/** Her sekmenin kapsadığı kart türleri. */
const FOCUS_KINDS: Record<Exclude<Focus, 'all'>, CardKind[]> = {
  ayah: ['ayah', 'surah'],
  hadith: ['hadith', 'hadithSrc'],
  word: ['word'],
};

export function inFocus(kind: CardKind, focus: Focus): boolean {
  return focus === 'all' || FOCUS_KINDS[focus].includes(kind);
}

/** Kuyruğun başında hangi tekrar kartı olmalı: seçili türde vadesi en eski olan. */
export async function nextDueCard(now: number = Date.now(), focus: Focus = 'all'): Promise<CardRow | undefined> {
  return db.cards
    .where('due')
    .belowOrEqual(now)
    .filter((c) => inFocus(c.kind, focus))
    .first();
}

/** Vadesi gelmiş tekrar sayısı, sekme başına. */
export async function dueCounts(now: number = Date.now()): Promise<Record<Focus, number>> {
  const out: Record<Focus, number> = { all: 0, ayah: 0, hadith: 0, word: 0 };
  await db.cards
    .where('due')
    .belowOrEqual(now)
    .each((c) => {
      out.all++;
      for (const f of ['ayah', 'hadith', 'word'] as const) if (inFocus(c.kind, f)) out[f]++;
    });
  return out;
}

export async function nextNewWord(): Promise<Word | undefined> {
  const ids = new Set(await db.cards.where('kind').equals('word').primaryKeys());
  return WORDS.find((w) => !ids.has(`w:${w.w}:en`));
}

export async function nextNewHadith(): Promise<Hadith | undefined> {
  const ids = new Set(await db.cards.where('kind').equals('hadith').primaryKeys());
  return HADITHS.find((h) => !ids.has(`h:${h.n}`));
}

/** Etkin surede henüz ezberlenmemiş ilk ayet (1'den başlar). */
export async function nextNewAyah(settings: Settings): Promise<{ surah: SurahRow; ayah: number } | undefined> {
  if (settings.activeSurah == null) return undefined;
  const surah = await db.surahs.get(settings.activeSurah);
  if (!surah) return undefined;
  const prefix = `a:${surah.number}:`;
  const ids = new Set(await db.cards.where('kind').equals('ayah').primaryKeys());
  for (let i = 1; i <= surah.ayahCount; i++) {
    if (!ids.has(prefix + i)) return { surah, ayah: i };
  }
  return undefined;
}

/**
 * Sıradaki çalışma öğesi; yalnızca seçili sekmenin (settings.focus) türleri. Öncelik:
 * 1) vadesi gelmiş tekrarlar  2) yeni ayet  3) yeni hadis  4) yeni kelime
 * 5) yakında vadesi gelecek öğrenme kartları (beklememek için erken göster)
 */
export async function nextItem(settings: Settings, now: number = Date.now()): Promise<Item | null> {
  const focus = settings.focus;
  const want = (f: Exclude<Focus, 'all'>) => focus === 'all' || focus === f;

  const due = await nextDueCard(now, focus);
  if (due) return { type: 'review', card: due };

  const counts = await newCountsToday(now);
  if (want('ayah') && counts.ayahs < settings.newAyahsPerDay) {
    const a = await nextNewAyah(settings);
    if (a) return { type: 'newAyah', ...a };
  }
  if (want('hadith') && counts.hadiths < settings.newHadithsPerDay) {
    const h = await nextNewHadith();
    if (h) return { type: 'newHadith', hadith: h };
  }
  if (want('word') && counts.words < settings.newWordsPerDay) {
    const w = await nextNewWord();
    if (w) return { type: 'newWord', word: w };
  }

  const soon = await nextDueCard(now + LEARN_AHEAD_MS, focus);
  if (soon) return { type: 'review', card: soon };
  return null;
}
