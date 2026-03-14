import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

type Star = {
  isBright: boolean;
  style: CSSProperties;
};

function mulberry32(seed: number) {
  let state = seed | 0;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(count: number, seed: number): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const rand = mulberry32(seed + index * 1013);
    const isBright = rand() > 0.85;
    const size = isBright ? rand() * 2 + 2 : rand() * 1.5 + 0.5;
    const duration = rand() * 3 + 2;
    const delay = rand() * 5;

    return {
      isBright,
      style: {
        '--x': `${rand() * 100}%`,
        '--y': `${rand() * 100}%`,
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--delay': `${delay}s`,
      } as CSSProperties,
    };
  });
}

export const StarField = memo(function StarField({
  count = 180,
  seed = 1337,
  className = 'star-field',
}: {
  count?: number;
  seed?: number;
  className?: string;
}) {
  const stars = useMemo(() => makeStars(count, seed), [count, seed]);

  return (
    <div className={className} aria-hidden="true">
      {stars.map((star, i) => (
        <div
          key={i}
          className={`star ${star.isBright ? 'bright' : ''}`}
          style={star.style}
        />
      ))}
    </div>
  );
});
