import { useMemo } from 'react';
import type { ButtonContent } from '../../../types/blocks.types';

interface ButtonBlockProps {
  content: ButtonContent;
  isSelected: boolean;
  onChange: (content: Partial<ButtonContent>) => void;
}

export function ButtonBlock({ content, isSelected, onChange }: ButtonBlockProps) {
  const alignClass = useMemo(() => {
    if (content.align === 'center') return 'align-center';
    if (content.align === 'right') return 'align-right';
    return 'align-left';
  }, [content.align]);

  const styleClass = content.style === 'secondary' ? 'secondary' : 'primary';

  return (
    <div className={`button-block ${alignClass}`}>
      <a
        className={`btn ${styleClass}`}
        href={content.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content.label || 'Button'}
      </a>

      {isSelected && (
        <div className="controls">
          <label>
            Label
            <input
              value={content.label}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="Button label"
            />
          </label>
          <label>
            URL
            <input
              value={content.url}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://..."
            />
          </label>
          <div className="row">
            <label>
              Style
              <select value={content.style} onChange={(event) => onChange({ style: event.target.value as ButtonContent['style'] })}>
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
              </select>
            </label>
            <label>
              Align
              <select value={content.align} onChange={(event) => onChange({ align: event.target.value as ButtonContent['align'] })}>
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <style>{`
        .button-block { display: grid; gap: 0.85rem; }
        .button-block.align-left { justify-items: start; }
        .button-block.align-center { justify-items: center; }
        .button-block.align-right { justify-items: end; }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.6rem 0.9rem;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform 0.15s ease, border-color 0.2s ease;
        }
        .btn:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.22); }
        .btn.primary { background: linear-gradient(135deg, var(--course-brand, #D4A84B), #7ac9ff); color: #0b0d1a; }
        .btn.secondary { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.92); }
        .controls { display: grid; gap: 0.6rem; }
        label { display: grid; gap: 0.3rem; font-size: 0.8rem; color: rgba(255,255,255,0.7); }
        input, select {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.9);
          padding: 0.5rem 0.6rem;
        }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
        @media (max-width: 560px) { .row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

