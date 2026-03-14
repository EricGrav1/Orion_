import type { AccordionContent } from '../../../types/blocks.types';

interface AccordionBlockProps {
  content: AccordionContent;
  isSelected: boolean;
  onChange: (content: Partial<AccordionContent>) => void;
}

export function AccordionBlock({ content, isSelected, onChange }: AccordionBlockProps) {
  const items = content.items || [];

  const updateItem = (id: string, patch: Partial<{ title: string; body: string }>) => {
    onChange({
      items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const copy = [...items];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIndex, 0, removed);
    onChange({ items: copy });
  };

  const addItem = () => {
    onChange({
      items: [...items, { id: `item-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, title: 'New item', body: 'Details...' }],
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: items.filter((it) => it.id !== id) });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {isSelected && (
        <div className="toolbar">
          <button onClick={addItem}>+ Add item</button>
          <span className="muted">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div className="accordion">
        {items.map((item) => (
          <details key={item.id} open>
            <summary>
              {isSelected ? (
                <input
                  className="input"
                  value={item.title}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{item.title}</span>
              )}
              {isSelected && (
                <div className="actions">
                  <button className="icon" onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'up'); }}>↑</button>
                  <button className="icon" onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'down'); }}>↓</button>
                  <button className="remove" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>
                    ✕
                  </button>
                </div>
              )}
            </summary>
            {isSelected ? (
              <textarea
                className="textarea"
                value={item.body}
                onChange={(e) => updateItem(item.id, { body: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p>{item.body}</p>
            )}
          </details>
        ))}
        {items.length === 0 && <div className="empty">No items yet</div>}
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.toolbar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.toolbar button { padding: 0.35rem 0.6rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: #f6f6fb; cursor: pointer; }
.muted { color: rgba(255,255,255,0.6); font-size: 0.9rem; }
.accordion { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.02); }
details { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0.65rem 0.8rem; }
details:last-of-type { border-bottom: none; }
summary { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; cursor: pointer; color: #f6f6fb; }
.remove { border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; }
.remove:hover { color: #ff8a8a; }
.actions { display: inline-flex; gap: 0.35rem; align-items: center; }
.icon { border: none; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; }
.icon:hover { color: #d4a84b; }
.input, .textarea { width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; padding: 0.45rem 0.55rem; }
.textarea { min-height: 80px; margin-top: 0.5rem; }
p { margin: 0.4rem 0 0; color: rgba(255,255,255,0.85); }
.empty { padding: 0.8rem; color: rgba(255,255,255,0.6); }
`;
