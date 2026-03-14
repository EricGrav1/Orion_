import type { EditorBlock } from '../../../types/blocks.types';
import { TextBlock } from './TextBlock';
import { HeadingBlock } from './HeadingBlock';
import { ImageBlock } from './ImageBlock';
import { VideoBlock } from './VideoBlock';
import { DividerBlock } from './DividerBlock';
import { QuoteBlock } from './QuoteBlock';
import { CtaBlock } from './CtaBlock';
import { ButtonBlock } from './ButtonBlock';
import { AccordionBlock } from './AccordionBlock';
import { TabsBlock } from './TabsBlock';
import { FlipCardBlock } from './FlipCardBlock';
import { TimelineBlock } from './TimelineBlock';
import { ImageTextBlock } from './ImageTextBlock';
import { QuizBlock } from './QuizBlock';

const blockComponents = {
  text: TextBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  video: VideoBlock,
  divider: DividerBlock,
  quote: QuoteBlock,
  cta: CtaBlock,
  button: ButtonBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,
  flipcard: FlipCardBlock,
  timeline: TimelineBlock,
  imagetext: ImageTextBlock,
  quiz: QuizBlock,
} as const;

interface RenderBlockOptions {
  isSelected: boolean;
  onChange: (content: Partial<EditorBlock['content']>) => void;
}

export function renderBlock(block: EditorBlock, options: RenderBlockOptions) {
  const Component = blockComponents[block.type];
  if (!Component) {
    return <div className="text-red-500">Unknown block type: {block.type}</div>;
  }

  return (
    <Component
      content={block.content as never}
      isSelected={options.isSelected}
      onChange={options.onChange as never}
    />
  );
}
