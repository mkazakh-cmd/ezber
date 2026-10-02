import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import { WORDS } from '../content/words';
import { HADITHS } from '../content/hadith';
import { introduceHadith, introduceWord } from './actions';
import { dueCounts, nextItem, nextNewWord } from './queue';

const DAY = 86_400_000;
const T0 = new Date('2026-10-01T09:00:00').getTime();
const S = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('yeni kelime sırası', () => {
  it('ilk 100 kelime öğrenildiyse ertesi gün 101. kelimeden devam eder', async () => {
    for (const w of WORDS.slice(0, 100)) await introduceWord(w, T0);
    expect(await nextNewWord()).toEqual(WORDS[100]);

    // Ertesi gün: önce vadesi gelen tekrarlar, kota açılınca sıradaki yeni kelime 101.
    const tomorrow = T0 + DAY;
    let item = await nextItem(S({ focus: 'word' }), tomorrow);
    expect(item?.type).toBe('review');
    await db.cards.toCollection().modify((c) => {
      c.due = tomorrow + 10 * DAY;
    });
    item = await nextItem(S({ focus: 'word' }), tomorrow);
    expect(item).toEqual({ type: 'newWord', word: WORDS[100] });
  });
});

describe('sekme seçimi', () => {
  beforeEach(async () => {
    await introduceWord(WORDS[0], T0);
    await introduceHadith(HADITHS[0], T0);
  });
  const later = T0 + 2 * DAY;

  it('İngilizce sekmesinde yalnız kelime kartı gelir', async () => {
    const item = await nextItem(S({ focus: 'word' }), later);
    expect(item?.type).toBe('review');
    expect(item?.type === 'review' && item.card.kind).toBe('word');
  });

  it('Hadis sekmesinde yalnız hadis kartları gelir', async () => {
    const item = await nextItem(S({ focus: 'hadith' }), later);
    expect(item?.type === 'review' && ['hadith', 'hadithSrc'].includes(item.card.kind)).toBe(true);
  });

  it('Ayet sekmesi, sure seçilmemişse ve ayet kartı yoksa boştur (başka tür göstermez)', async () => {
    expect(await nextItem(S({ focus: 'ayah' }), later)).toBeNull();
  });

  it('sekme başına bekleyen tekrar sayıları doğru', async () => {
    expect(await dueCounts(later)).toEqual({ all: 4, ayah: 0, hadith: 2, word: 2 });
  });

  it('Hadis sekmesinde kota doluysa yeni kelime önermez', async () => {
    await db.cards.toCollection().modify((c) => {
      c.due = later + 10 * DAY;
    });
    // Hadis kotası (1) bugün doldu; kelime kotası boş olsa da hadis sekmesi kelime vermez
    expect(await nextItem(S({ focus: 'hadith' }), T0 + 60_000)).toBeNull();
    expect((await nextItem(S({ focus: 'word' }), T0 + 60_000))?.type).toBe('newWord');
  });
});
