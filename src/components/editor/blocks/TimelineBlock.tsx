import type { TimelineContent } from '../../../types/blocks.types';

interface TimelineBlockProps {
  content: TimelineContent;
  isSelected: boolean;
  onChange: (content: Partial<TimelineContent>) => void;
}

function makeItemId(index: number): string {
  return `step-${Date.now()}-${index}`;
}

export function TimelineBlock({ content, isSelected, onChange }: TimelineBlockProps) {
  const items = Array.isArray(content.items) && content.items.length > 0 ? content.items : [];

  const setItems = (nextItems: TimelineContent['items']) => {
    onChange({ items: nextItems });
  };

  const addItem = () => {
    const nextIndex = items.length + 1;
    setItems([
      ...items,
      { id: makeItemId(nextIndex), title: `Step ${nextIndex}`, body: 'Describe this step.' },
    ]);
  };

  const updateItem = (id: string, patch: Partial<TimelineContent['items'][number]>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="timeline-shell">
      <ol className="timeline" aria-label="Timeline">
        {items.length === 0 ? (
          <li className="empty">Add timeline steps.</li>
        ) : (
          items.map((item, index) => (
            <li key={item.id} className="step">
              <div className="marker">{index + 1}</div>
              <div className="copy">
                <div className="title">{item.title || `Step ${index + 1}`}</div>
                <div className="body">{item.body || ''}</div>
              </div>
            </li>
          ))
        )}
      </ol>

      {isSelected && (
        <div className="controls">
          <div className="controls-head">
            <div className="hint">Edit steps</div>
            <button type="button" className="add" onClick={addItem}>+ Add step</button>
          </div>
          <div className="list">
            {items.map((item) => (
              <div key={item.id} className="editor">
                <div className="row">
                  <label>
                    Title
                    <input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} />
                  </label>
                  <button type="button" className="remove" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
                <label>
                  Body
                  <textarea rows={3} value={item.body} onChange={(e) => updateItem(item.id, { body: e.target.value })} />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .timeline-shell { display: grid; gap: 0.85rem; }
        .timeline { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.75rem; }
        .step {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.75rem;
          align-items: start;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          background: rgba(255,255,255,0.02);
          padding: 0.75rem 0.8rem;
          position: relative;
        }
        .marker {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 900;
          background: rgba(122,201,255,0.12);
          border: 1px solid rgba(122,201,255,0.35);
          color: rgba(255,255,255,0.9);
        }
        .copy { display: grid; gap: 0.25rem; }
        .title { font-weight: 800; letter-spacing: -0.01em; }
        .body { color: rgba(255,255,255,0.72); line-height: 1.55; white-space: pre-wrap; }
        .empty { color: rgba(255,255,255,0.65); padding: 0.5rem 0.2rem; }
        .controls { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; display: grid; gap: 0.65rem; }
        .controls-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .hint { color: rgba(255,255,255,0.6); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .add { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.9); border-radius: 10px; padding: 0.35rem 0.6rem; font-weight: 700; cursor: pointer; }
        .list { display: grid; gap: 0.65rem; }
        .editor { border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; background: rgba(255,255,255,0.02); padding: 0.65rem; display: grid; gap: 0.55rem; }
        .row { display: grid; grid-template-columns: 1fr auto; gap: 0.55rem; align-items: end; }
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
        .remove { border: none; background: transparent; color: rgba(255, 190, 190, 0.92); cursor: pointer; font-weight: 700; }
      `}</style>
    </div>
  );
}

