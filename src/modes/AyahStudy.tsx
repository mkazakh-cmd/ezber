import { useEffect, useState } from 'preact/hooks';
import { db, type CardRow, type SurahRow } from '../db';
import type { Settings } from '../settings';
import { AyahAudio } from '../components/AyahAudio';
import { GradeBar } from '../components/GradeBar';
import { arabicFirstLetter } from '../text';
import type { Grade } from '../srs/fsrs';

const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

type WordMode = 'show' | 'hint' | 'hidden';

/** Ayeti kelime kelime çizer; gizli/ipuçlu kelimeye dokununca o kelime açılır. */
function ArabicWords({ text, mode, small }: { text: string; mode: WordMode; small?: boolean }) {
  const words = text.split(' ').filter(Boolean);
  const [open, setOpen] = useState<Set<number>>(new Set());
  useEffect(() => setOpen(new Set()), [text, mode]);

  return (
    <div class={'arabic' + (small ? ' small-ar' : '')}>
      {words.map((w, i) => {
        if (mode === 'show' || open.has(i)) return <span class="w" key={i}>{w}</span>;
        const reveal = () => setOpen(new Set(open).add(i));
        if (mode === 'hint')
          return (
            <span class="w hint" key={i} onClick={reveal}>
              {arabicFirstLetter(w)}…
            </span>
          );
        return (
          <span class="w hidden" key={i} onClick={reveal}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

function hasBasmala(surah: number, ayah: number) {
  return ayah === 1 && surah !== 1 && surah !== 9;
}

const STAGES = [
  { title: 'Dinle ve oku', help: 'Ayeti birkaç kez dinleyin, metne bakarak birlikte okuyun.' },
  { title: 'İpucuyla oku', help: 'Sadece ilk harfler görünüyor. Ayeti okuyun; takıldığınız kelimeye dokunun.' },
  { title: 'Ezberden oku', help: 'Metin gizli. Ezberden okuyun; takıldığınız kelimeye dokunun.' },
  { title: 'Bağlantı', help: 'Önceki ayetten devam ederek bu ayeti ezberden okuyun.' },
];

/** Yeni ayet: 4 aşamalı ezber. */
export function AyahStudy({
  surah,
  ayah,
  settings,
  onDone,
}: {
  surah: SurahRow;
  ayah: number;
  settings: Settings;
  onDone: () => void;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => setStage(0), [surah.number, ayah]);
  const text = surah.arabic[ayah - 1];
  const prev = ayah > 1 ? surah.arabic[ayah - 2] : null;
  const last = stage === STAGES.length - 1;

  return (
    <div>
      <div class="steps">
        {STAGES.map((_, i) => (
          <i key={i} class={i <= stage ? 'on' : ''} />
        ))}
      </div>
      <div class="card stack">
        <div class="row">
          <span class="tag">Yeni ayet</span>
          <span class="tag">
            {surah.name} {ayah}/{surah.ayahCount}
          </span>
        </div>
        <div>
          <strong>{STAGES[stage].title}</strong>
          <div class="muted small">{STAGES[stage].help}</div>
        </div>

        {stage === 3 && prev && (
          <div>
            <div class="muted small">Önceki ayet ({ayah - 1}):</div>
            <ArabicWords text={prev} mode="show" small />
          </div>
        )}
        {stage === 0 && hasBasmala(surah.number, ayah) && <div class="arabic small-ar basmala">{BASMALA}</div>}

        <ArabicWords text={text} mode={stage === 0 ? 'show' : stage === 1 ? 'hint' : 'hidden'} />
        {stage !== 2 && stage !== 3 && <div class="meal">{surah.meal[ayah - 1]}</div>}

        <AyahAudio
          reciter={settings.reciter}
          surah={surah.number}
          ayah={ayah}
          repeat={stage === 0 ? settings.audioRepeat : 1}
          rate={settings.audioRate}
          autoplay={stage === 0}
        />
      </div>
      <div class="actions row">
        {stage > 0 && (
          <button class="btn" onClick={() => setStage(stage - 1)}>
            Geri
          </button>
        )}
        <button class="btn primary block" onClick={() => (last ? onDone() : setStage(stage + 1))}>
          {last ? 'Ezberledim' : 'Sonraki aşama'}
        </button>
      </div>
    </div>
  );
}

function useSurah(n: number) {
  const [surah, setSurah] = useState<SurahRow | null | undefined>(undefined);
  useEffect(() => {
    db.surahs.get(n).then((s) => setSurah(s ?? null));
  }, [n]);
  return surah;
}

function MissingSurah({ onSkip }: { onSkip: () => void }) {
  return (
    <div class="card stack">
      <p>Bu kartın suresi telefondan silinmiş. Kütüphane'den sureyi yeniden indirin.</p>
      <button class="btn" onClick={onSkip}>
        Şimdilik geç
      </button>
    </div>
  );
}

/** Ayet tekrarı: önceki ayet ipucu, mevcut ayet gizli. */
export function AyahReview({
  card,
  settings,
  onGrade,
  onSkip,
}: {
  card: CardRow;
  settings: Settings;
  onGrade: (r: Grade) => void;
  onSkip: () => void;
}) {
  const [, s, a] = card.id.split(':');
  const ayah = Number(a);
  const surah = useSurah(Number(s));
  const [mode, setMode] = useState<WordMode>('hidden');
  useEffect(() => setMode('hidden'), [card.id]);

  if (surah === undefined) return null;
  if (surah === null) return <MissingSurah onSkip={onSkip} />;
  const shown = mode === 'show';

  return (
    <div>
      <div class="card stack">
        <div class="row">
          <span class="tag">Ayet tekrarı</span>
          <span class="tag">
            {surah.name} {ayah}
          </span>
        </div>
        {ayah > 1 ? (
          <div>
            <div class="muted small">Önceki ayet ({ayah - 1}), devamını okuyun:</div>
            <ArabicWords text={surah.arabic[ayah - 2]} mode="show" small />
          </div>
        ) : (
          <div class="muted small">Surenin ilk ayetini okuyun.</div>
        )}
        <ArabicWords text={surah.arabic[ayah - 1]} mode={mode} />
        <div class="meal">{surah.meal[ayah - 1]}</div>
        {shown && (
          <AyahAudio
            reciter={settings.reciter}
            surah={surah.number}
            ayah={ayah}
            repeat={1}
            rate={settings.audioRate}
          />
        )}
      </div>
      <div class="actions">
        {shown ? (
          <GradeBar card={card} onGrade={onGrade} />
        ) : (
          <div class="row">
            {mode === 'hidden' && (
              <button class="btn" onClick={() => setMode('hint')}>
                İpucu
              </button>
            )}
            <button class="btn primary block" onClick={() => setMode('show')}>
              Göster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Sure tekrarı: baştan sona ezberden okuma. */
export function SurahReview({
  card,
  onGrade,
  onSkip,
}: {
  card: CardRow;
  onGrade: (r: Grade) => void;
  onSkip: () => void;
}) {
  const surah = useSurah(Number(card.id.split(':')[1]));
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [card.id]);

  if (surah === undefined) return null;
  if (surah === null) return <MissingSurah onSkip={onSkip} />;

  return (
    <div>
      <div class="card stack">
        <span class="tag">Sure tekrarı</span>
        <div class="tr-big">{surah.name} suresi</div>
        <p class="muted">
          {surah.ayahCount} ayetin tamamını baştan sona ezberden okuyun. Bittiğinde metni açıp kontrol edin.
        </p>
        {shown && (
          <div class="stack">
            {hasBasmala(surah.number, 1) && <div class="arabic small-ar basmala">{BASMALA}</div>}
            {surah.arabic.map((t, i) => (
              <div key={i} class="arabic small-ar">
                {t} <span class="muted small">﴿{i + 1}﴾</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div class="actions">
        {shown ? (
          <GradeBar card={card} onGrade={onGrade} />
        ) : (
          <button class="btn primary block" onClick={() => setShown(true)}>
            Metni göster
          </button>
        )}
      </div>
    </div>
  );
}
