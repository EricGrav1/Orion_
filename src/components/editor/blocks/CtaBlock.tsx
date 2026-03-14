import type { CtaContent } from '../../../types/blocks.types';

interface CtaBlockProps {
  content: CtaContent;
  isSelected: boolean;
  onChange: (content: Partial<CtaContent>) => void;
}

export function CtaBlock({ content, isSelected, onChange }: CtaBlockProps) {
  const buttonClass =
    content.style === 'primary'
      ? 'primary-btn'
      : 'secondary-btn';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {isSelected && (
        <div className="controls">
          <input
            className="input"
            value={content.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Button label"
          />
          <input
            className="input"
            value={content.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://link"
          />
          <div className="row">
            <label className="chip">
              <input
                type="radio"
                checked={content.style === 'primary'}
                onChange={() => onChange({ style: 'primary' })}
              />
              Primary
            </label>
            <label className="chip">
              <input
                type="radio"
                checked={content.style === 'secondary'}
                onChange={() => onChange({ style: 'secondary' })}
              />
              Secondary
            </label>
            <select
              className="select"
              value={content.align}
              onChange={(e) => onChange({ align: e.target.value as CtaContent['align'] })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      )}
      <div className={`btn-row align-${content.align}`}>
        <a className={buttonClass} href={content.url || '#'} onClick={(e) => isSelected && e.preventDefault()}>
          {content.label || 'Call to action'}
        </a>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.controls { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.5rem; }
.input, .select { width: 100%; padding: 0.5rem 0.65rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; }
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.chip { display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.6rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.02); color: #f6f6fb; font-size: 0.9rem; }
.btn-row { width: 100%; margin-top: 0.35rem; }
.align-left { text-align: left; }
.align-center { text-align: center; }
.align-right { text-align: right; }
.primary-btn { display: inline-block; padding: 0.65rem 1.2rem; border-radius: 12px; background: linear-gradient(135deg, #264b8c, #d4a84b); color: #0b0d1a; font-weight: 700; text-decoration: none; }
.secondary-btn { display: inline-block; padding: 0.65rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); color: #f6f6fb; font-weight: 700; text-decoration: none; background: rgba(255,255,255,0.04); }
`;
