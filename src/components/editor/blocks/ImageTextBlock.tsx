import type { ImageTextContent } from '../../../types/blocks.types';

interface ImageTextBlockProps {
  content: ImageTextContent;
  isSelected: boolean;
  onChange: (content: Partial<ImageTextContent>) => void;
}

export function ImageTextBlock({ content, isSelected, onChange }: ImageTextBlockProps) {
  const layout = content.layout || 'left';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {isSelected && (
        <div className="controls">
          <input
            className="input"
            placeholder="Image URL"
            value={content.imageSrc}
            onChange={(e) => onChange({ imageSrc: e.target.value })}
          />
          <input
            className="input"
            placeholder="Alt text"
            value={content.imageAlt}
            onChange={(e) => onChange({ imageAlt: e.target.value })}
          />
          <select
            className="select"
            value={layout}
            onChange={(e) => onChange({ layout: e.target.value as ImageTextContent['layout'] })}
          >
            <option value="left">Image left</option>
            <option value="right">Image right</option>
          </select>
        </div>
      )}
      <div className={`row ${layout === 'right' ? 'reverse' : ''}`}>
        <div className="media">
          {content.imageSrc ? (
            <img src={content.imageSrc} alt={content.imageAlt} />
          ) : (
            <div className="placeholder">Add image</div>
          )}
        </div>
        <div className="copy">
          {isSelected ? (
            <>
              <input
                className="heading"
                value={content.heading}
                onChange={(e) => onChange({ heading: e.target.value })}
              />
              <textarea
                className="body"
                value={content.body}
                onChange={(e) => onChange({ body: e.target.value })}
              />
            </>
          ) : (
            <>
              <h3>{content.heading}</h3>
              <p>{content.body}</p>
            </>
          )}
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.controls { display: grid; gap: 0.4rem; margin-bottom: 0.6rem; }
.input, .select { padding: 0.5rem 0.65rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center; }
.reverse { direction: rtl; }
.reverse > * { direction: ltr; }
.media img { width: 100%; border-radius: 12px; object-fit: cover; min-height: 160px; }
.placeholder { width: 100%; min-height: 160px; border: 1px dashed rgba(255,255,255,0.25); border-radius: 12px; display: grid; place-items: center; color: rgba(255,255,255,0.6); }
.copy h3, .heading { font-size: 1.35rem; margin: 0 0 0.35rem; font-weight: 700; color: #f6f6fb; background: transparent; border: none; }
.body, .copy p { margin: 0; color: rgba(255,255,255,0.82); line-height: 1.5; }
.body { width: 100%; min-height: 100px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); padding: 0.55rem 0.65rem; color: #f6f6fb; }
@media (max-width: 700px) { .row { grid-template-columns: 1fr; } .reverse { direction: ltr; } }
`;
