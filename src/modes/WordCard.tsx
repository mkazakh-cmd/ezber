import { useEffect, useState } from 'preact/hooks';
import type { CardRow } from '../db';
import type { Word } from '../content/types';
import { WORDS } from '../content/words';
import { GradeBar } from '../components/GradeBar';
import type { Grade } from '../srs/fsrs';

const BY_WORD = new Map(WORDS.map((w) => [w.w, w]));

const POS: Record<string, string> = {
  n: 'isim', v: 'fiil', adj: 'sıfat', adv: 'zarf', prep: 'edat', pron: 'zamir',
  conj: 'bağlaç', det: 'belirleyici', num: 'sayı', int: 'ünlem', aux: 'yardımcı fiil',
};

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function Speaker({ text }: { text: string }) {
  return (
    <button class="btn ghost" onClick={() => speak(text)} aria-label="Telaffuzu dinle">
      🔊
    </button>
  );
}

function Details({ word }: { word: Word }) {
  return (
    <div class="stack">
      <div class="tr-big">{word.tr}</div>
      <div>
        <div class="example row">
          <span>{word.ex}</span>
          <Speaker text={word.ex} />
        </div>
        <div class="muted small">{word.exTr}</div>
      </div>
    </div>
  );
}

/** Yeni kelimeyle ilk tanışma. */
export function WordIntro({ word, onDone }: { word: Word; onDone: () => void }) {
  useEffect(() => speak(word.w), [word.w]);
  return (
    <div>
      <div class="card stack">
        <div class="row">
          <span class="tag">Yeni kelime</span>
          <span class="tag">{POS[word.pos] ?? word.pos}</span>
        </div>
        <div class="row">
          <div class="word-big">{word.w}</div>
          <Speaker text={word.w} />
        </div>
        <Details word={word} />
      </div>
      <div class="actions">
        <button class="btn primary block" onClick={onDone}>
          Öğrendim, devam
        </button>
      </div>
    </div>
  );
}

/** Tekrar kartı: ":en" İngilizce→Türkçe, ":tr" Türkçe→İngilizce. */
export function WordReview({
  card,
  onGrade,
  onSkip,
}: {
  card: CardRow;
  onGrade: (r: Grade) => void;
  onSkip: () => void;
}) {
  const [, w, dir] = card.id.split(':');
  const word = BY_WORD.get(w);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
    if (word && dir === 'en') speak(word.w);
  }, [card.id]);

  if (!word) {
    // Kelime listesinden çıkarılmış eski bir kart: atla
    return (
      <div class="card">
        <p>Bu kelime artık listede yok: {w}</p>
        <button class="btn" onClick={onSkip}>Geç</button>
      </div>
    );
  }

  function reveal() {
    setShown(true);
    if (dir === 'tr') speak(word!.w);
  }

  return (
    <div>
      <div class="card stack">
        <div class="row">
          <span class="tag">{dir === 'en' ? 'İngilizce → Türkçe' : 'Türkçe → İngilizce'}</span>
          <span class="tag">{POS[word.pos] ?? word.pos}</span>
        </div>
        {dir === 'en' ? (
          <div class="row">
            <div class="word-big">{word.w}</div>
            <Speaker text={word.w} />
          </div>
        ) : (
          <div class="tr-big">{word.tr}</div>
        )}
        {shown &&
          (dir === 'en' ? (
            <Details word={word} />
          ) : (
            <div class="stack">
              <div class="row">
                <div class="word-big">{word.w}</div>
                <Speaker text={word.w} />
              </div>
              <div class="example">{word.ex}</div>
              <div class="muted small">{word.exTr}</div>
            </div>
          ))}
      </div>
      <div class="actions">
        {shown ? (
          <GradeBar card={card} onGrade={onGrade} />
        ) : (
          <button class="btn primary block" onClick={reveal}>
            Cevabı göster
          </button>
        )}
      </div>
    </div>
  );
}
