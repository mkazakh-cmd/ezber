import { getKV, setKV } from './db';

/** Bugün ekranında hangi tür çalışılıyor. */
export type Focus = 'all' | 'ayah' | 'hadith' | 'word';

export interface Settings {
  newWordsPerDay: number;
  newAyahsPerDay: number;
  newHadithsPerDay: number;
  reciter: string;
  /** Şu an ezberlenen sure (null = seçilmedi) */
  activeSurah: number | null;
  /** Ayet çalışmasında sesi kaç kez tekrar çal */
  audioRepeat: number;
  /** Ses hızı (0.75 = yavaş) */
  audioRate: number;
  /** Bugün ekranındaki seçili sekme; uygulama yeniden açılınca buradan devam eder */
  focus: Focus;
}

export const DEFAULT_SETTINGS: Settings = {
  newWordsPerDay: 10,
  newAyahsPerDay: 3,
  newHadithsPerDay: 1,
  reciter: 'Alafasy_128kbps',
  activeSurah: null,
  audioRepeat: 3,
  audioRate: 1,
  focus: 'all',
};

/** everyayah.com klasör adları (CORS açık, sesler telefona indirilebiliyor). */
export const RECITERS: { id: string; name: string }[] = [
  { id: 'Alafasy_128kbps', name: 'Mişari Raşid el-Afasi' },
  { id: 'Husary_128kbps', name: 'Mahmud Halil el-Husari' },
  { id: 'Husary_128kbps_Mujawwad', name: 'el-Husari (Mücevved)' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Muhammed Sıddık el-Minşavi' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdulbasit Abdussamed' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Mahir el-Muaykli' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman es-Sudeys' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Suud eş-Şureym' },
];

export async function loadSettings(): Promise<Settings> {
  const saved = await getKV<Partial<Settings>>('settings', {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(s: Settings): Promise<void> {
  await setKV('settings', s);
}
