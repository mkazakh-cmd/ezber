import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CardRow } from '../db';
import type { Hadith } from '../content/types';
import { HADITHS } from '../content/hadith';
import { GradeBar } from '../components/GradeBar';
import { CLOZE_RATIOS, clozeIndices, tokenize, wordHint } from '../text';
import type { Grade } from '../srs/fsrs';

const BY_N = new Map(HADITHS.map((h) => [h.n, h]));

function Source({ h }: { h: Hadith }) {
  return (
    <div class="muted small">
      Ravi: {h.narrator} · Kaynak: {h.source}
    </div>
  );
}

export function HadithIntro({ hadith, onDone }: { hadith: Hadith; onDone: () => void }) {
  return (
    <div>
      <div class="card stack">
        <div class="row">
          <span class="tag">Yeni hadis</span>
          <span class="tag">{hadith.n}. hadis</span>
        </div>
        <div class="tr-big">{hadith.title}</div>
        <div class="cloze">{hadith.text}</div>
        <Source h={hadith} />
        <p class="muted small">Metni birkaç kez sesli okuyun. Sonraki tekrarlarda kelimeler giderek gizlenecek.</p>
      </div>
      <div class="actions">
        <button class="btn primary block" onClick={onDone}>
          Okudum, devam
        </button>
      </div>
    </div>
  );
}

function Missing({ onSkip }: { onSkip: () => void }) {
  return (
    <div class="card stack">
      <p>Bu hadis artık listede yok.</p>
      <button class="btn" onClick={onSkip}>Geç</button>
    </div>
  );
}

/** Boşluk doldurma: seviye arttıkça daha çok kelime gizlenir. */
export function HadithReview({
  card,
  onGrade,
  onSkip,
}: {
  card: CardRow;
  onGrade: (r: Grade) => void;
  onSkip: () => void;
}) {
  const h = BY_N.get(Number(card.id.split(':')[1]));
  const level = card.level ?? 0;
  const tokens = useMemo(() => (h ? tokenize(h.text) : []), [h]);
  const hidden = useMemo(() => (h ? clozeIndices(tokens, level, String(h.n)) : new Set<number>()), [tokens, level]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setOpen(new Set());
    setShown(false);
  }, [card.id]);

  if (!h) return <Missing onSkip={onSkip} />;

  return (
    <div>
      <div class="card stack">
        <div class="row">
          <span class="tag">Hadis tekrarı</span>
          <span class="tag">
            Seviye {level + 1}/{CLOZE_RATIOS.length}
          </span>
        </div>
        <div class="tr-big">{h.title}</div>
        <div class="cloze">
          {tokens.map((t, i) => {
            if (!hidden.has(i)) return <span key={i}>{t.text}</span>;
            const isOpen = shown || open.has(i);
            return (
              <button
                key={i}
                class={'blank' + (isOpen ? ' open' : '')}
                onClick={() => setOpen(new Set(open).add(i))}
              >
                {isOpen ? t.text : wordHint(t.text)}
              </button>
            );
          })}
        </div>
        {shown && <Source h={h} />}
        {!shown && <div class="muted small">Boşlukları içinizden tamamlayın; takıldığınız boşluğa dokunun.</div>}
      </div>
      <div class="actions">
        {shown ? (
          <GradeBar card={card} onGrade={onGrade} />
        ) : (
          <button class="btn primary block" onClick={() => setShown(true)}>
            Tamamını göster
          </button>
        )}
      </div>
    </div>
  );
}

/** "Bu hadisin ravisi ve kaynağı?" kartı. */
export function HadithSrcReview({
  card,
  onGrade,
  onSkip,
}: {
  card: CardRow;
  onGrade: (r: Grade) => void;
  onSkip: () => void;
}) {
  const h = BY_N.get(Number(card.id.split(':')[1]));
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [card.id]);
  if (!h) return <Missing onSkip={onSkip} />;

  return (
    <div>
      <div class="card stack">
        <span class="tag">Hadis kaynağı</span>
        <div class="tr-big">{h.title}</div>
        <div class="muted">{h.text.length > 140 ? h.text.slice(0, 140) + '…' : h.text}</div>
        <p>
          <strong>Bu hadisi kim rivayet etmiş, kaynağı nedir?</strong>
        </p>
        {shown && (
          <div class="stack">
            <div>
              <span class="muted">Ravi:</span> <strong>{h.narrator}</strong>
            </div>
            <div>
              <span class="muted">Kaynak:</span> <strong>{h.source}</strong>
            </div>
          </div>
        )}
      </div>
      <div class="actions">
        {shown ? (
          <GradeBar card={card} onGrade={onGrade} />
        ) : (
          <button class="btn primary block" onClick={() => setShown(true)}>
            Cevabı göster
          </button>
        )}
      </div>
    </div>
  );
}
