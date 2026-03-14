// Block type identifiers
export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'divider'
  | 'quote'
  | 'cta'
  | 'button'
  | 'accordion'
  | 'tabs'
  | 'flipcard'
  | 'timeline'
  | 'imagetext'
  | 'quiz';

// Content schemas for each block type
export interface TextContent {
  html: string;
}

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
}

export interface ImageContent {
  src: string;
  alt: string;
  caption: string;
}

export interface VideoContent {
  url: string;
  provider: 'youtube' | 'vimeo' | null;
  videoId: string | null;
}

export interface DividerContent {
  style: 'solid' | 'dashed' | 'dotted';
}

export interface QuoteContent {
  text: string;
  attribution: string;
}

export interface CtaContent {
  label: string;
  url: string;
  style: 'primary' | 'secondary';
  align: 'left' | 'center' | 'right';
}

export interface ButtonContent {
  label: string;
  url: string;
  style: 'primary' | 'secondary';
  align: 'left' | 'center' | 'right';
}

export interface AccordionContent {
  items: Array<{ id: string; title: string; body: string }>;
}

export interface TabsContent {
  tabs: Array<{ id: string; title: string; body: string }>;
  defaultTabId: string;
}

export interface FlipCardContent {
  frontTitle: string;
  frontBody: string;
  backTitle: string;
  backBody: string;
}

export interface TimelineContent {
  items: Array<{ id: string; title: string; body: string }>;
}

export interface ImageTextContent {
  imageSrc: string;
  imageAlt: string;
  heading: string;
  body: string;
  layout: 'left' | 'right';
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizContent {
  question: string;
  options: QuizOption[];
  allowMultiple: boolean;
  explanation?: string;
}

// Map block types to their content schemas
export interface BlockContentMap {
  text: TextContent;
  heading: HeadingContent;
  image: ImageContent;
  video: VideoContent;
  divider: DividerContent;
  quote: QuoteContent;
  cta: CtaContent;
  button: ButtonContent;
  accordion: AccordionContent;
  tabs: TabsContent;
  flipcard: FlipCardContent;
  timeline: TimelineContent;
  imagetext: ImageTextContent;
  quiz: QuizContent;
}

// Settings that can apply to any block
export interface BaseBlockSettings {
  backgroundColor?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  maxWidth?: 'narrow' | 'medium' | 'wide' | 'full';
  hidden?: boolean;
}

// Type-safe block with generic content
export interface TypedBlock<T extends BlockType = BlockType> {
  id: string;
  course_id: string;
  type: T;
  content: BlockContentMap[T];
  settings: BaseBlockSettings;
  order: number;
  created_at: string;
}

// Union type for all blocks
export type EditorBlock =
  | TypedBlock<'text'>
  | TypedBlock<'heading'>
  | TypedBlock<'image'>
  | TypedBlock<'video'>
  | TypedBlock<'divider'>
  | TypedBlock<'quote'>
  | TypedBlock<'cta'>
  | TypedBlock<'button'>
  | TypedBlock<'accordion'>
  | TypedBlock<'tabs'>
  | TypedBlock<'flipcard'>
  | TypedBlock<'timeline'>
  | TypedBlock<'imagetext'>
  | TypedBlock<'quiz'>;

// Block metadata for the palette
export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  defaultContent: BlockContentMap[BlockType];
  defaultSettings: BaseBlockSettings;
}
