import type { CardRow } from '../db';
import { formatInterval, previewIntervals, Rating, type Grade } from '../srs/fsrs';

const BUTTONS: { r: Grade; label: string; cls: string }[] = [
  { r: Rating.Again, label: 'Tekrar', cls: 'again' },
  { r: Rating.Hard, label: 'Zor', cls: 'hard' },
  { r: Rating.Good, label: 'İyi', cls: 'good' },
  { r: Rating.Easy, label: 'Kolay', cls: 'easy' },
];

export function GradeBar({ card, onGrade }: { card: CardRow; onGrade: (r: Grade) => void }) {
  const iv = previewIntervals(card);
  return (
    <div class="grades">
      {BUTTONS.map((b) => (
        <button key={b.r} class={b.cls} onClick={() => onGrade(b.r)}>
          {b.label}
          <span>{formatInterval(iv[b.r])}</span>
        </button>
      ))}
    </div>
  );
}
