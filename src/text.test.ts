import { describe, expect, it } from 'vitest';
import { arabicFirstLetter, clozeIndices, tokenize, wordHint } from './text';

const TEXT = 'Ameller ancak niyetlere göredir. Herkese yalnızca niyet ettiği şey vardır.';

describe('tokenize', () => {
  it('birleştirince metnin aslını verir', () => {
    expect(tokenize(TEXT).map((t) => t.text).join('')).toBe(TEXT);
  });
  it('kesme işaretli kelimeyi bölmez', () => {
    expect(tokenize("Allah'ın elçisi").filter((t) => t.word).map((t) => t.text)).toEqual(["Allah'ın", 'elçisi']);
  });
});

describe('clozeIndices', () => {
  const tokens = tokenize(TEXT);
  const words = tokens.filter((t) => t.word).length;

  it('seviye arttıkça gizlenen küme büyür ve öncekini kapsar', () => {
    let prev = new Set<number>();
    for (let lv = 0; lv <= 4; lv++) {
      const cur = clozeIndices(tokens, lv, '1');
      expect(cur.size).toBeGreaterThanOrEqual(prev.size);
      for (const i of prev) expect(cur.has(i)).toBe(true);
      prev = cur;
    }
  });

  it('son seviyede tüm kelimeler gizli', () => {
    expect(clozeIndices(tokens, 4, '1').size).toBe(words);
  });

  it('ilk seviyede en az bir kelime gizli, boşluk/noktalama asla gizlenmez', () => {
    const s = clozeIndices(tokens, 0, '1');
    expect(s.size).toBeGreaterThan(0);
    for (const i of s) expect(tokens[i].word).toBe(true);
  });

  it('aynı tohum hep aynı sonucu verir', () => {
    expect([...clozeIndices(tokens, 1, '7')]).toEqual([...clozeIndices(tokens, 1, '7')]);
  });
});

describe('ipuçları', () => {
  it('Türkçe: ilk harf + alt çizgi', () => {
    expect(wordHint('niyet')).toBe('n____');
  });
  it('Arapça: ilk harf harekesiyle birlikte', () => {
    // قُلْ → ق + ötre
    expect(arabicFirstLetter('قُلْ')).toBe('قُ');
    // ٱللَّهُ → elif-vasla tek başına
    expect(arabicFirstLetter('ٱللَّهُ')).toBe('ٱ');
  });
});
