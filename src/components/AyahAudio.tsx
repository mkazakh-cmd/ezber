import { useEffect, useRef, useState } from 'preact/hooks';
import { ayahAudioSrc } from '../content/quranApi';

interface Props {
  reciter: string;
  surah: number;
  ayah: number;
  /** Kaç kez arka arkaya çalınsın */
  repeat: number;
  rate: number;
  autoplay?: boolean;
}

/** Ayet sesini istenen sayıda tekrar eden oynatıcı. */
export function AyahAudio({ reciter, surah, ayah, repeat, rate, autoplay }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    setError(false);
    setRound(0);
    ayahAudioSrc(reciter, surah, ayah).then((u) => {
      if (cancelled) {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
        return;
      }
      url = u;
      setSrc(u);
    });
    return () => {
      cancelled = true;
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [reciter, surah, ayah]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    el.playbackRate = rate;
    if (autoplay) el.play().catch(() => setPlaying(false));
  }, [src]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      setRound(0);
      el.currentTime = 0;
      el.playbackRate = rate;
      el.play().catch(() => setError(true));
    }
  }

  function onEnded() {
    const next = round + 1;
    if (next < repeat && ref.current) {
      setRound(next);
      ref.current.currentTime = 0;
      ref.current.play().catch(() => setPlaying(false));
    } else {
      setRound(0);
    }
  }

  return (
    <div class="row">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onError={() => setError(true)}
      />
      <button class="btn" onClick={toggle} disabled={!src} aria-label={playing ? 'Durdur' : 'Dinle'}>
        {playing ? '⏸ Durdur' : '▶ Dinle'}
      </button>
      <span class="muted small">
        {error ? 'Ses yüklenemedi (internet yok ve indirilmemiş)' : playing ? `${round + 1}/${repeat}` : `${repeat} kez`}
      </span>
    </div>
  );
}
