import Dexie, { type Table } from 'dexie';

export type CardKind = 'word' | 'ayah' | 'surah' | 'hadith' | 'hadithSrc';

/** FSRS durumunun IndexedDB'de tutulan hali (tarihler ms cinsinden sayı). */
export interface StoredFsrs {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number;
}

export interface CardRow {
  /** Örn. "w:apple:en", "w:apple:tr", "a:1:3", "s:1", "h:7", "h:7:src" */
  id: string;
  kind: CardKind;
  /** Hızlı sorgu için fsrs.due'nun kopyası */
  due: number;
  created: number;
  fsrs: StoredFsrs;
  /** Hadis boşluk doldurma seviyesi (0..4), artınca daha çok kelime gizlenir */
  level?: number;
}

export interface ReviewRow {
  id?: number;
  cardId: string;
  ts: number;
  rating: number;
  /** Yerel gün anahtarı "YYYY-MM-DD" — seri ve günlük sayımlar için */
  day: string;
}

export interface SurahRow {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  /** Mushaf genelindeki ilk ayetin numarası (ses dosyaları bu numarayla adlandırılır) */
  firstGlobal: number;
  arabic: string[];
  meal: string[];
  /** Ses indirildiyse hangi hafızla */
  audioReciter?: string;
}

export interface AudioRow {
  /** "<hafız>:<mushaf ayet no>" */
  key: string;
  blob: Blob;
}

export interface KV {
  key: string;
  value: unknown;
}

class EzberDB extends Dexie {
  cards!: Table<CardRow, string>;
  reviews!: Table<ReviewRow, number>;
  surahs!: Table<SurahRow, number>;
  audio!: Table<AudioRow, string>;
  kv!: Table<KV, string>;

  constructor() {
    super('ezber');
    this.version(1).stores({
      cards: 'id, kind, due',
      reviews: '++id, cardId, day',
      surahs: 'number',
      audio: 'key',
      kv: 'key',
    });
  }
}

export const db = new EzberDB();

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
