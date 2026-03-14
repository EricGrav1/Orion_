import { useEffect, useId, useMemo, useState } from 'react';
import type { FlipCardContent } from '../../../types/blocks.types';

interface FlipCardBlockProps {
  content: FlipCardContent;
  isSelected: boolean;
  onChange: (content: Partial<FlipCardContent>) => void;
}

export function FlipCardBlock({ content, isSelected, onChange }: FlipCardBlockProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const id = useId();

  const frontTitle = content.frontTitle || 'Front';
  const backTitle = content.backTitle || 'Back';
  const frontBody = content.frontBody || '';
  const backBody = content.backBody || '';

  useEffect(() => {
    if (!isSelected) setIsFlipped(false);
  }, [isSelected]);

  const ariaLabel = useMemo(() => (isFlipped ? `Flip card back: ${backTitle}` : `Flip card front: ${frontTitle}`), [
    backTitle,
    frontTitle,
    isFlipped,
  ]);

  const toggle = () => setIsFlipped((prev) => !prev);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div className="flipcard-shell">
      <button
        type="button"
        className={`flipcard ${isFlipped ? 'flipped' : ''}`}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-controls={`flipcard-${id}`}
      >
        <span className="sr-only">Flip card</span>
        <span className="card-face front" id={`flipcard-${id}`}>
          <span className="face-head">{frontTitle}</span>
          <span className="face-body">{frontBody}</span>
          <span className="face-hint">Click to reveal</span>
        </span>
        <span className="card-face back">
          <span className="face-head">{backTitle}</span>
          <span className="face-body">{backBody}</span>
          <span className="face-hint">Click to flip back</span>
        </span>
      </button>

      {isSelected && (
        <div className="controls">
          <div className="grid">
            <label>
              Front title
              <input value={content.frontTitle} onChange={(e) => onChange({ frontTitle: e.target.value })} />
            </label>
            <label>
              Back title
              <input value={content.backTitle} onChange={(e) => onChange({ backTitle: e.target.value })} />
            </label>
          </div>
          <label>
            Front body
            <textarea rows={3} value={content.frontBody} onChange={(e) => onChange({ frontBody: e.target.value })} />
          </label>
          <label>
            Back body
            <textarea rows={3} value={content.backBody} onChange={(e) => onChange({ backBody: e.target.value })} />
          </label>
        </div>
      )}

      <style>{`
        .flipcard-shell { display: grid; gap: 0.85rem; }
        .flipcard {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          padding: 0;
          background: transparent;
          cursor: pointer;
          perspective: 1200px;
        }
        .card-face {
          display: grid;
          gap: 0.5rem;
          padding: 1.05rem 1.05rem 0.95rem;
          border-radius: 18px;
          background: radial-gradient(circle at 18% 16%, rgba(122,201,255,0.12), rgba(255,255,255,0.04));
          color: rgba(255,255,255,0.92);
          min-height: 160px;
          backface-visibility: hidden;
          transform-style: preserve-3d;
          transition: transform 380ms ease;
        }
        .card-face.back {
          background: radial-gradient(circle at 82% 18%, rgba(212,168,75,0.14), rgba(255,255,255,0.04));
          transform: rotateY(180deg) translateZ(1px);
          position: absolute;
          inset: 0;
        }
        .card-face.front { transform: rotateY(0deg) translateZ(1px); }
        .flipcard { position: relative; display: block; text-align: left; }
        .flipcard.flipped .card-face.front { transform: rotateY(-180deg) translateZ(1px); }
        .flipcard.flipped .card-face.back { transform: rotateY(0deg) translateZ(1px); }
        .face-head { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }
        .face-body { color: rgba(255,255,255,0.72); line-height: 1.55; white-space: pre-wrap; }
        .face-hint { margin-top: auto; color: rgba(255,255,255,0.55); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
        .controls { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; display: grid; gap: 0.65rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        label { display: grid; gap: 0.3rem; font-size: 0.8rem; color: rgba(255,255,255,0.7); }
        input, textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.9);
          padding: 0.5rem 0.6rem;
          resize: vertical;
          font: inherit;
        }
        @media (max-width: 620px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

