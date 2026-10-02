import { describe, expect, it } from 'vitest';
import type { CardRow } from '../db';
import { grade, newCard, Rating, MAX_HADITH_LEVEL } from './fsrs';

const DAY = 86_400_000;
const T0 = new Date('2026-10-01T09:00:00').getTime();

/** Kartı "İyi" ile öğrenme adımlarından çıkarıp gün aralığına taşır. */
function graduate(kind: 'word' | 'hadith' = 'word') {
  let c = newCard('x', kind, T0);
  let t = T0;
  for (let i = 0; i < 5 && c.fsrs.state !== 2; i++) {
    c = grade(c, Rating.Good, t);
    t = c.due;
  }
  return { c, t };
}

describe('FSRS', () => {
  it('yeni kart hemen vadeli', () => {
    expect(newCard('x', 'word', T0).due).toBe(T0);
  });

  it('"Tekrar" kısa (dakikalar), "Kolay" uzun aralık verir', () => {
    const c = newCard('x', 'word', T0);
    const again = grade(c, Rating.Again, T0).due - T0;
    const easy = grade(c, Rating.Easy, T0).due - T0;
    expect(again).toBeLessThan(15 * 60_000);
    expect(easy).toBeGreaterThanOrEqual(DAY);
  });

  it('başarılı tekrarlarla aralık büyür', () => {
    let { c, t } = graduate();
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      c = grade(c, Rating.Good, t);
      gaps.push(c.due - t);
      t = c.due;
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it('oturmuş kart unutulunca aralık sıfırlanır ve hata sayılır', () => {
    let { c, t } = graduate();
    c = grade(c, Rating.Good, t);
    const before = c.fsrs.lapses;
    c = grade(c, Rating.Again, c.due);
    expect(c.fsrs.lapses).toBe(before + 1);
    expect(c.due - c.fsrs.last_review!).toBeLessThan(DAY);
  });

  it('hadis seviyesi İyi ile artar, Tekrar ile azalır, sınırlar içinde kalır', () => {
    let c: CardRow = { ...newCard('h:1', 'hadith', T0), level: 0 };
    c = grade(c, Rating.Good, T0);
    expect(c.level).toBe(1);
    c = grade(c, Rating.Again, T0);
    expect(c.level).toBe(0);
    c = grade(c, Rating.Again, T0);
    expect(c.level).toBe(0);
    for (let i = 0; i < 10; i++) c = grade(c, Rating.Easy, T0);
    expect(c.level).toBe(MAX_HADITH_LEVEL);
    c = grade(c, Rating.Hard, T0);
    expect(c.level).toBe(MAX_HADITH_LEVEL);
  });

  it('kelime kartında seviye alanı oluşmaz', () => {
    expect(grade(newCard('w', 'word', T0), Rating.Good, T0).level).toBeUndefined();
  });
});
