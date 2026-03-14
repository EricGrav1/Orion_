import { Type, Heading, Image, Video, Minus, Quote, MousePointerClick, LayoutPanelTop, Repeat, Milestone } from 'lucide-react';
import { blockDefinitions } from '../../utils/blockDefaults';
import type { BlockType } from '../../types/blocks.types';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

const iconMap = {
  Type,
  Heading,
  Image,
  Video,
  Minus,
  Quote,
  MousePointerClick,
  LayoutPanelTop,
  Repeat,
  Milestone,
};

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const blockTypes = Object.values(blockDefinitions);

  return (
    <div className="palette-list">
      {blockTypes.map((def) => {
        const Icon = iconMap[def.icon as keyof typeof iconMap];
        return (
          <button
            key={def.type}
            onClick={() => onAddBlock(def.type)}
            className="palette-card"
          >
            {Icon && <Icon className="icon" />}
            <div className="text">
              <div className="title">{def.label}</div>
              <div className="desc">{def.description}</div>
            </div>
          </button>
        );
      })}
      <style>{`
        .palette-list { display: flex; flex-direction: column; gap: 0.65rem; }
        .palette-card { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: #f6f6fb; text-align: left; cursor: pointer; transition: border-color 0.2s ease, transform 0.15s ease; }
        .palette-card:hover { border-color: rgba(212,168,75,0.6); transform: translateY(-2px); }
        .icon { width: 18px; height: 18px; color: rgba(212,168,75,0.9); }
        .text .title { font-weight: 700; font-size: 0.95rem; }
        .text .desc { color: rgba(255,255,255,0.6); font-size: 0.8rem; }
      `}</style>
    </div>
  );
}
