/** Boşluk doldurmada gizlenmeye değmeyecek kısa/bağlaç kelimeler. */
const STOP = new Set([
  've', 'ile', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü', 'ne', 'için',
  'gibi', 'ama', 'fakat', 'veya', 'ya', 'her', 'en', 'çok', 'daha', 'ise', 'diye', 'olan',
]);

export interface Token {
  text: string;
  /** Kelime mi (boşluk/noktalama değil) */
  word: boolean;
}

/** Metni kelime ve aradaki boşluk/noktalama parçalarına ayırır; birleştirince aslı çıkar. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[\p{L}\p{M}\p{N}'’]+/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
    if (h < 0) h >>>= 0;
  }
  return h >>> 0;
}

/** Seviye başına gizlenen "önemli kelime" oranı. Seviye 4: tüm kelimeler. */
export const CLOZE_RATIOS = [0.25, 0.45, 0.65, 0.85, 1];

/**
 * Gizlenecek token indeksleri. Seçim sabit bir sıralamaya göre yapılır; böylece seviye
 * arttıkça gizlenen küme büyür, önceki boşluklar yerinde kalır.
 */
export function clozeIndices(tokens: Token[], level: number, seed: string): Set<number> {
  const lv = Math.max(0, Math.min(CLOZE_RATIOS.length - 1, level));
  const words = tokens.map((t, i) => ({ t, i })).filter((x) => x.t.word);
  if (lv === CLOZE_RATIOS.length - 1) return new Set(words.map((x) => x.i));
  const important = words.filter((x) => x.t.text.length >= 3 && !STOP.has(x.t.text.toLocaleLowerCase('tr')));
  const ranked = [...important].sort((a, b) => hash(seed + ':' + a.i) - hash(seed + ':' + b.i));
  const n = Math.max(1, Math.round(important.length * CLOZE_RATIOS[lv]));
  return new Set(ranked.slice(0, n).map((x) => x.i));
}

/** Türkçe kelime ipucu: ilk harf + kalan harf sayısı kadar alt çizgi. */
export function wordHint(w: string): string {
  const chars = [...w];
  return chars[0] + '_'.repeat(Math.max(0, chars.length - 1));
}

/**
 * Arapça kelimenin ilk harfi, üzerindeki harekeleriyle birlikte. Hareke ve diğer işaretler
 * Unicode'da "M" (birleşen işaret) kategorisindedir; ilk harften sonra gelenleri de alırız.
 */
export function arabicFirstLetter(w: string): string {
  const chars = [...w];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    if (i > 0 && !/\p{M}/u.test(chars[i])) break;
    out += chars[i];
  }
  return out;
}
