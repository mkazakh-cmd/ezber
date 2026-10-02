import type { Word } from './types';
import raw from './words.json';

/** NGSL sıklık sırasına göre; 100'lük seviyelere bölünür. */
export const WORDS: Word[] = raw as Word[];
export const WORDS_PER_LEVEL = 100;

export function levelOf(index: number): number {
  return Math.floor(index / WORDS_PER_LEVEL) + 1;
}
