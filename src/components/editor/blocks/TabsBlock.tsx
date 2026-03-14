import { useEffect, useMemo, useState } from 'react';
import type { TabsContent } from '../../../types/blocks.types';

interface TabsBlockProps {
  content: TabsContent;
  isSelected: boolean;
  onChange: (content: Partial<TabsContent>) => void;
}

function ensureTabs(content: TabsContent): TabsContent {
  const tabs = Array.isArray(content.tabs) ? content.tabs : [];
  const normalizedTabs = tabs.length > 0 ? tabs : [{ id: 'tab-1', title: 'Tab 1', body: 'Add tab content.' }];
  const fallbackId = normalizedTabs[0].id;
  const defaultTabId = normalizedTabs.some((tab) => tab.id === content.defaultTabId) ? content.defaultTabId : fallbackId;
  return { ...content, tabs: normalizedTabs, defaultTabId };
}

function makeTabId(index: number): string {
  return `tab-${Date.now()}-${index}`;
}

export function TabsBlock({ content, isSelected, onChange }: TabsBlockProps) {
  const stable = useMemo(() => ensureTabs(content), [content]);
  const [activeTabId, setActiveTabId] = useState(stable.defaultTabId);

  useEffect(() => {
    setActiveTabId((prev) => (stable.tabs.some((tab) => tab.id === prev) ? prev : stable.defaultTabId));
  }, [stable.defaultTabId, stable.tabs]);

  const activeIndex = stable.tabs.findIndex((tab) => tab.id === activeTabId);
  const activeTab = stable.tabs[activeIndex] ?? stable.tabs[0];

  const setTabs = (tabs: TabsContent['tabs']) => {
    const next = ensureTabs({ ...stable, tabs });
    onChange({ tabs: next.tabs, defaultTabId: next.defaultTabId });
  };

  const addTab = () => {
    const nextIndex = stable.tabs.length + 1;
    const nextId = makeTabId(nextIndex);
    const nextTabs = [
      ...stable.tabs,
      { id: nextId, title: `Tab ${nextIndex}`, body: 'Add tab content.' },
    ];
    onChange({ tabs: nextTabs, defaultTabId: stable.defaultTabId || nextId });
    setActiveTabId(nextId);
  };

  const removeTab = (tabId: string) => {
    const nextTabs = stable.tabs.filter((tab) => tab.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const nextActive = nextTabs[0]?.id ?? '';
      setActiveTabId(nextActive);
    }
  };

  const updateTab = (tabId: string, patch: Partial<TabsContent['tabs'][number]>) => {
    setTabs(
      stable.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab))
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (stable.tabs.length <= 1) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (activeIndex + delta + stable.tabs.length) % stable.tabs.length;
    const nextTab = stable.tabs[nextIndex];
    if (nextTab) setActiveTabId(nextTab.id);
  };

  return (
    <div className="tabs-block">
      <div className="tablist" role="tablist" aria-label="Tabs" onKeyDown={handleKeyDown}>
        {stable.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            aria-selected={tab.id === activeTabId}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.title || 'Tab'}
          </button>
        ))}
      </div>

      <div className="panel" role="tabpanel" aria-label={activeTab?.title || 'Tab content'}>
        <h3>{activeTab?.title || 'Tab'}</h3>
        <p>{activeTab?.body || ''}</p>
      </div>

      {isSelected && (
        <div className="controls">
          <div className="controls-head">
            <div className="hint">Edit tabs</div>
            <button type="button" className="add" onClick={addTab}>+ Add tab</button>
          </div>
          <div className="tab-editor-list">
            {stable.tabs.map((tab) => (
              <div key={tab.id} className="tab-editor">
                <div className="row">
                  <label>
                    Title
                    <input
                      value={tab.title}
                      onChange={(event) => updateTab(tab.id, { title: event.target.value })}
                    />
                  </label>
                  <button type="button" className="remove" onClick={() => removeTab(tab.id)} disabled={stable.tabs.length <= 1}>
                    Remove
                  </button>
                </div>
                <label>
                  Body
                  <textarea
                    rows={3}
                    value={tab.body}
                    onChange={(event) => updateTab(tab.id, { body: event.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .tabs-block { display: grid; gap: 0.85rem; }
        .tablist { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .tab {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.75);
          border-radius: 999px;
          padding: 0.42rem 0.7rem;
          font-weight: 700;
          cursor: pointer;
        }
        .tab.active {
          border-color: rgba(122,201,255,0.65);
          background: rgba(122,201,255,0.14);
          color: rgba(255,255,255,0.92);
        }
        .panel {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          background: rgba(0,0,0,0.18);
          padding: 0.85rem 0.9rem;
        }
        .panel h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
        .panel p { margin: 0; color: rgba(255,255,255,0.72); line-height: 1.55; white-space: pre-wrap; }
        .controls { margin-top: 0.2rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; display: grid; gap: 0.65rem; }
        .controls-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .hint { color: rgba(255,255,255,0.6); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .add { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.9); border-radius: 10px; padding: 0.35rem 0.6rem; font-weight: 700; cursor: pointer; }
        .tab-editor-list { display: grid; gap: 0.65rem; }
        .tab-editor { border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; background: rgba(255,255,255,0.02); padding: 0.65rem; display: grid; gap: 0.55rem; }
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
        .remove:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

