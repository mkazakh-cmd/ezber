import { db, type SurahRow } from '../db';
import { surahName } from './surahList';

const API = 'https://api.alquran.cloud/v1';
const AUDIO = 'https://everyayah.com/data';

interface ApiAyah {
  number: number;
  numberInSurah: number;
  text: string;
}
interface ApiEdition {
  englishName: string;
  numberOfAyahs: number;
  ayahs: ApiAyah[];
}

/**
 * quran-uthmani baskısında Fâtiha ve Tevbe dışındaki surelerin 1. ayetinin başına besmele
 * eklenmiş geliyor. Besmele ayetin parçası değil; ezber ekranında ayrı gösterilir.
 */
function stripBasmala(text: string): string {
  const words = text.split(' ');
  if (words.length > 4 && words[0].startsWith('بِسْمِ')) return words.slice(4).join(' ');
  return text;
}

export async function downloadSurahText(n: number): Promise<SurahRow> {
  const res = await fetch(`${API}/surah/${n}/editions/quran-uthmani,tr.diyanet`);
  if (!res.ok) throw new Error(`Sure indirilemedi (HTTP ${res.status})`);
  const json = (await res.json()) as { data: [ApiEdition, ApiEdition] };
  const [ar, tr] = json.data;
  const arabic = ar.ayahs.map((a) => a.text);
  if (n !== 1 && n !== 9) arabic[0] = stripBasmala(arabic[0]);
  const row: SurahRow = {
    number: n,
    name: surahName(n),
    englishName: ar.englishName,
    ayahCount: ar.numberOfAyahs,
    firstGlobal: ar.ayahs[0].number,
    arabic,
    meal: tr.ayahs.map((a) => a.text),
  };
  const existing = await db.surahs.get(n);
  await db.surahs.put({ ...row, audioReciter: existing?.audioReciter });
  return row;
}

function audioUrl(reciter: string, surah: number, ayah: number): string {
  const p = (x: number) => String(x).padStart(3, '0');
  return `${AUDIO}/${reciter}/${p(surah)}${p(ayah)}.mp3`;
}

export function audioKey(reciter: string, surah: number, ayah: number): string {
  return `${reciter}:${surah}:${ayah}`;
}

/** Surenin tüm ayet seslerini indirip IndexedDB'ye yazar. */
export async function downloadSurahAudio(
  surah: SurahRow,
  reciter: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = surah.ayahCount;
  let done = 0;
  // Aynı anda 4 indirme: hızlı ama sunucuyu yormayan bir denge
  const queue = Array.from({ length: total }, (_, i) => i + 1);
  async function worker() {
    for (let a = queue.shift(); a !== undefined; a = queue.shift()) {
      const key = audioKey(reciter, surah.number, a);
      if (!(await db.audio.get(key))) {
        const res = await fetch(audioUrl(reciter, surah.number, a));
        if (!res.ok) throw new Error(`Ses indirilemedi: ${surah.name} ${a} (HTTP ${res.status})`);
        await db.audio.put({ key, blob: await res.blob() });
      }
      done++;
      onProgress?.(done, total);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await db.surahs.update(surah.number, { audioReciter: reciter });
}

/**
 * Çalınabilir ses adresi: indirilmişse telefondaki kopya, değilse internetten.
 * Dönen blob: adresini kullanan, işi bitince URL.revokeObjectURL ile serbest bırakmalı.
 */
export async function ayahAudioSrc(reciter: string, surah: number, ayah: number): Promise<string> {
  const row = await db.audio.get(audioKey(reciter, surah, ayah));
  if (row) return URL.createObjectURL(row.blob);
  return audioUrl(reciter, surah, ayah);
}

export async function deleteSurah(n: number): Promise<void> {
  await db.surahs.delete(n);
  await db.audio.filter((r) => r.key.split(':')[1] === String(n)).delete();
}

/** İndirilmiş seslerin kapladığı toplam alan (bayt). */
export async function audioBytes(): Promise<number> {
  let sum = 0;
  await db.audio.each((r) => (sum += r.blob.size));
  return sum;
}
