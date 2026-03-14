import type {
  BlockType,
  BlockContentMap,
  BaseBlockSettings,
  BlockDefinition,
} from '../types/blocks.types';

// Default content for each block type
const defaultContents: BlockContentMap = {
  text: { html: '<p>Enter your text here...</p>' },
  heading: { text: 'New Heading', level: 2 },
  image: { src: '', alt: '', caption: '' },
  video: { url: '', provider: null, videoId: null },
  divider: { style: 'solid' },
  quote: { text: 'Enter quote text...', attribution: '' },
  cta: { label: 'Call to action', url: 'https://example.com', style: 'primary', align: 'left' },
  button: { label: 'Button', url: 'https://example.com', style: 'primary', align: 'left' },
  accordion: { items: [{ id: 'item-1', title: 'Accordion item', body: 'Add details here.' }] },
  tabs: {
    tabs: [
      { id: 'tab-1', title: 'Tab 1', body: 'Add tab content.' },
      { id: 'tab-2', title: 'Tab 2', body: 'Add tab content.' },
    ],
    defaultTabId: 'tab-1',
  },
  flipcard: {
    frontTitle: 'Front',
    frontBody: 'Add prompt or definition.',
    backTitle: 'Back',
    backBody: 'Add explanation or answer.',
  },
  timeline: {
    items: [
      { id: 'step-1', title: 'Step 1', body: 'Describe the first step.' },
      { id: 'step-2', title: 'Step 2', body: 'Describe the next step.' },
      { id: 'step-3', title: 'Step 3', body: 'Wrap up the sequence.' },
    ],
  },
  imagetext: { imageSrc: '', imageAlt: '', heading: 'Section title', body: 'Describe this section.', layout: 'left' },
  quiz: { question: 'Write a question', options: [{ id: 'opt-1', text: 'Option 1', correct: true }, { id: 'opt-2', text: 'Option 2', correct: false }], allowMultiple: false, explanation: '' },
};

export function getDefaultContent<T extends BlockType>(type: T): BlockContentMap[T] {
  return { ...defaultContents[type] } as BlockContentMap[T];
}

export function getDefaultSettings(): BaseBlockSettings {
  return {
    padding: 'medium',
    maxWidth: 'medium',
    hidden: false,
  };
}

// Block definitions for the palette
export const blockDefinitions: Record<BlockType, BlockDefinition> = {
  text: {
    type: 'text',
    label: 'Text',
    icon: 'Type',
    description: 'Rich text content',
    defaultContent: defaultContents.text,
    defaultSettings: { padding: 'medium', maxWidth: 'medium' },
  },
  heading: {
    type: 'heading',
    label: 'Heading',
    icon: 'Heading',
    description: 'Section heading',
    defaultContent: defaultContents.heading,
    defaultSettings: { padding: 'small', maxWidth: 'medium' },
  },
  image: {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    description: 'Image with caption',
    defaultContent: defaultContents.image,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  video: {
    type: 'video',
    label: 'Video',
    icon: 'Video',
    description: 'YouTube or Vimeo embed',
    defaultContent: defaultContents.video,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    description: 'Visual separator',
    defaultContent: defaultContents.divider,
    defaultSettings: { padding: 'small', maxWidth: 'full' },
  },
  quote: {
    type: 'quote',
    label: 'Quote',
    icon: 'Quote',
    description: 'Styled blockquote',
    defaultContent: defaultContents.quote,
    defaultSettings: { padding: 'medium', maxWidth: 'medium' },
  },
  cta: {
    type: 'cta',
    label: 'CTA Button',
    icon: 'Type',
    description: 'Button with link',
    defaultContent: defaultContents.cta,
    defaultSettings: { padding: 'medium', maxWidth: 'narrow' },
  },
  button: {
    type: 'button',
    label: 'Button',
    icon: 'MousePointerClick',
    description: 'Button with link',
    defaultContent: defaultContents.button,
    defaultSettings: { padding: 'medium', maxWidth: 'narrow' },
  },
  accordion: {
    type: 'accordion',
    label: 'Accordion',
    icon: 'Heading',
    description: 'Expandable items',
    defaultContent: defaultContents.accordion,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  tabs: {
    type: 'tabs',
    label: 'Tabs',
    icon: 'LayoutPanelTop',
    description: 'Tabbed content panels',
    defaultContent: defaultContents.tabs,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  flipcard: {
    type: 'flipcard',
    label: 'Flip Card',
    icon: 'Repeat',
    description: 'Front/back interactive card',
    defaultContent: defaultContents.flipcard,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  timeline: {
    type: 'timeline',
    label: 'Timeline',
    icon: 'Milestone',
    description: 'Step-by-step process',
    defaultContent: defaultContents.timeline,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  imagetext: {
    type: 'imagetext',
    label: 'Image + Text',
    icon: 'Image',
    description: 'Side-by-side layout',
    defaultContent: defaultContents.imagetext,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
  quiz: {
    type: 'quiz',
    label: 'Quiz (MCQ)',
    icon: 'Quote',
    description: 'Single or multi-choice question',
    defaultContent: defaultContents.quiz,
    defaultSettings: { padding: 'medium', maxWidth: 'wide' },
  },
};

// Video URL parsing utilities
export function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | null; videoId: string | null } {
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { provider: 'youtube', videoId: youtubeMatch[1] };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { provider: 'vimeo', videoId: vimeoMatch[1] };
  }

  return { provider: null, videoId: null };
}

export function getVideoEmbedUrl(provider: 'youtube' | 'vimeo', videoId: string): string {
  if (provider === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return '';
}
