import type { InsertBlock, Json } from '../types/database.types';
import type { StorylineConnection, StorylineDraft, StorylineNode, StorylineTrigger } from '../types/courseTheme.types';
import type { StructuredCourseOutline } from '../types/aiImport.types';
import type { CourseBlueprint } from './courseBlueprint';
import { createDefaultStorylineDraft } from './courseTheme';
import { getBlueprintSettings } from './courseBlueprint';

const MAX_SECTION_COUNT_BY_BLUEPRINT: Record<CourseBlueprint, number> = {
  course: 7,
  microlearning: 3,
  storyline: 6,
};

const MIN_TEXT_LENGTH = 80;

interface DraftSection {
  title: string;
  body: string;
}

export interface ExtractedImportText {
  text: string;
  sourceType: 'text' | 'binary';
}

export interface AiImportDraft {
  title: string;
  description: string;
  blueprint: CourseBlueprint;
  settings: Json;
  blocks: Omit<InsertBlock, 'course_id'>[];
}

function sectionsFromStructuredOutline(outline: StructuredCourseOutline): DraftSection[] {
  return outline.sections.map((section, index) => {
    const bulletBody = section.bullets
      .map((bullet) => bullet.trim())
      .filter(Boolean)
      .map((bullet) => `• ${bullet}`)
      .join(' ');
    const mergedBody = [section.summary, bulletBody].filter(Boolean).join(' ');
    return {
      title: section.title || `Section ${index + 1}`,
      body: mergedBody || section.summary || 'Add section details.',
    };
  });
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripFileExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function makeSectionTitle(value: string, index: number): string {
  const cleaned = value
    .replace(/^#+\s*/, '')
    .replace(/^[\d)\].-]+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:]$/, '')
    .trim();
  if (!cleaned) return `Section ${index + 1}`;
  return cleaned.length > 70 ? `${cleaned.slice(0, 67)}...` : cleaned;
}

function isLikelyHeading(line: string): boolean {
  if (!line) return false;
  if (/^#+\s+/.test(line)) return true;
  if (/^\d+[\).\s-]/.test(line)) return true;
  if (line.endsWith(':') && line.length <= 80) return true;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 10) return false;
  const uppercaseWords = words.filter((word) => /^[A-Z][A-Za-z0-9/-]*$/.test(word)).length;
  return uppercaseWords / words.length >= 0.7;
}

function splitIntoSections(sourceText: string): DraftSection[] {
  const normalized = normalizeWhitespace(sourceText);
  if (!normalized) return [];
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: DraftSection[] = [];
  let pendingTitle = '';
  let pendingBody: string[] = [];

  const flushPending = () => {
    const bodyText = pendingBody.join(' ').replace(/\s+/g, ' ').trim();
    if (!bodyText) return;
    sections.push({
      title: pendingTitle || `Section ${sections.length + 1}`,
      body: bodyText,
    });
  };

  lines.forEach((line) => {
    if (isLikelyHeading(line) && pendingBody.length > 0) {
      flushPending();
      pendingBody = [];
      pendingTitle = makeSectionTitle(line, sections.length);
      return;
    }

    if (isLikelyHeading(line) && !pendingTitle) {
      pendingTitle = makeSectionTitle(line, sections.length);
      return;
    }

    pendingBody.push(line);
  });

  flushPending();

  if (sections.length > 0) return sections;

  const paragraphChunks = normalized
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return paragraphChunks.map((chunk, index) => ({
    title: `Section ${index + 1}`,
    body: chunk,
  }));
}

function deriveCourseTitle(sourceText: string, fileName?: string): string {
  const lines = normalizeWhitespace(sourceText).split('\n').map((line) => line.trim()).filter(Boolean);
  const headingCandidate = lines.find((line) => line.length >= 6 && line.length <= 70 && isLikelyHeading(line));
  if (headingCandidate) return makeSectionTitle(headingCandidate, 0);
  if (fileName) {
    const base = stripFileExtension(fileName).replace(/[_-]+/g, ' ').trim();
    if (base) return titleCase(base);
  }
  return 'AI Generated Course';
}

function summarizeDescription(sourceText: string): string {
  const cleaned = normalizeWhitespace(sourceText).replace(/\n/g, ' ');
  if (!cleaned) return 'Generated from imported source content.';
  if (cleaned.length <= 180) return cleaned;
  return `${cleaned.slice(0, 177)}...`;
}

function toTextHtml(value: string): string {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const lines = (sentences.length > 0 ? sentences : [value]).slice(0, 4);
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

function buildRiseBlocks(
  title: string,
  sections: DraftSection[],
  blueprint: Extract<CourseBlueprint, 'course' | 'microlearning'>
): Omit<InsertBlock, 'course_id'>[] {
  const blocks: Omit<InsertBlock, 'course_id'>[] = [];
  let order = 0;
  const maxSections = MAX_SECTION_COUNT_BY_BLUEPRINT[blueprint];
  const limitedSections = sections.slice(0, maxSections);

  blocks.push({
    type: 'heading',
    content: { text: title, level: 1 },
    settings: { padding: 'small', maxWidth: 'medium', hidden: false },
    order: order++,
  });

  if (limitedSections[0]?.body) {
    blocks.push({
      type: 'text',
      content: { html: toTextHtml(limitedSections[0].body) },
      settings: { padding: 'medium', maxWidth: 'medium', hidden: false },
      order: order++,
    });
  }

  limitedSections.forEach((section, sectionIndex) => {
    if (sectionIndex === 0 && section.title.toLowerCase() === title.toLowerCase()) return;
    blocks.push({
      type: 'heading',
      content: { text: section.title, level: 2 },
      settings: { padding: 'small', maxWidth: 'medium', hidden: false },
      order: order++,
    });
    blocks.push({
      type: 'text',
      content: { html: toTextHtml(section.body) },
      settings: { padding: 'medium', maxWidth: 'medium', hidden: false },
      order: order++,
    });
  });

  const quizPrompt = limitedSections[0]?.title || 'this lesson';
  blocks.push({
    type: 'quiz',
    content: {
      question: `Which statement best summarizes ${quizPrompt}?`,
      options: [
        { id: 'opt-a', text: 'The primary objective described in the content.', correct: true },
        { id: 'opt-b', text: 'An unrelated secondary detail.', correct: false },
        { id: 'opt-c', text: 'A topic not covered in the source material.', correct: false },
      ],
      allowMultiple: false,
      explanation: 'Review the source material and align answer choices to the key objective.',
    },
    settings: { padding: 'medium', maxWidth: 'wide', hidden: false },
    order: order++,
  });

  return blocks;
}

function buildStorylineDraft(sections: DraftSection[]): StorylineDraft {
  const fallbackDraft = createDefaultStorylineDraft();
  const limitedSections = sections.slice(0, MAX_SECTION_COUNT_BY_BLUEPRINT.storyline);
  const nodes: StorylineNode[] =
    limitedSections.length > 0
      ? limitedSections.map((section, index) => ({
          id: `scene-${index + 1}`,
          title: section.title || `Scene ${index + 1}`,
          summary: section.body.slice(0, 220) || 'Add scene details.',
          durationSeconds: index === 0 ? 45 : 60,
        }))
      : fallbackDraft.nodes;

  if (nodes.length === 0) return fallbackDraft;

  const connections: StorylineConnection[] = nodes.slice(0, -1).map((node, index) => ({
    id: `conn-${index + 1}`,
    fromId: node.id,
    toId: nodes[index + 1].id,
    label: 'Continue',
  }));

  const triggers: StorylineTrigger[] = connections.map((connection, index) => ({
    id: `trigger-${index + 1}`,
    sceneId: connection.fromId,
    label: `Advance to ${nodes[index + 1].title}`,
    event: 'timeline_end',
    conditions: [],
    actions: [
      {
        id: `action-${index + 1}`,
        type: 'go_to_scene',
        targetSceneId: connection.toId,
        variableId: null,
        value: '',
      },
    ],
  }));

  return {
    startNodeId: nodes[0].id,
    nodes,
    connections,
    variables: [
      {
        id: 'var-completed',
        name: 'completed',
        type: 'boolean',
        initialValue: 'false',
      },
    ],
    triggers,
  };
}

export async function extractTextFromImportFile(file: File): Promise<ExtractedImportText> {
  const lowerName = file.name.toLowerCase();
  const isTextFile =
    file.type.startsWith('text/') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.csv');

  if (isTextFile) {
    const rawText = await file.text();
    const normalized = normalizeWhitespace(rawText);
    if (normalized.length < MIN_TEXT_LENGTH) {
      throw new Error('Imported text file is too short. Add more source content and try again.');
    }
    return { text: normalized, sourceType: 'text' };
  }

  const isBinaryDocument =
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.ppt') ||
    lowerName.endsWith('.pptx');

  if (!isBinaryDocument) {
    throw new Error('Unsupported file type. Use PDF, DOCX, PPTX, TXT, or Markdown.');
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const utfDecoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const latinDecoded = new TextDecoder('latin1').decode(bytes);
  const merged = `${utfDecoded}\n${latinDecoded}`;
  const fragments = merged.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:'"!?()/%&-]{28,}/g) ?? [];

  const cleaned = Array.from(
    new Set(
      fragments
        .map((fragment) => normalizeWhitespace(fragment))
        .filter((fragment) => fragment.length > 35)
    )
  )
    .slice(0, 450)
    .join('\n');

  if (cleaned.length < MIN_TEXT_LENGTH) {
    throw new Error(
      'Could not extract enough readable text from this file. Try exporting to TXT/Markdown first or paste source text directly.'
    );
  }

  return {
    text: cleaned,
    sourceType: 'binary',
  };
}

export function buildAiImportDraft(options: {
  sourceText: string;
  blueprint: CourseBlueprint;
  fileName?: string;
}): AiImportDraft {
  const normalizedSource = normalizeWhitespace(options.sourceText);
  if (normalizedSource.length < MIN_TEXT_LENGTH) {
    throw new Error('Source content is too short. Provide at least a few paragraphs before generating.');
  }

  const sections = splitIntoSections(normalizedSource);
  const title = deriveCourseTitle(normalizedSource, options.fileName);
  const description = summarizeDescription(normalizedSource);

  if (options.blueprint === 'storyline') {
    const storyline = buildStorylineDraft(sections);
    const settings: Json = {
      authoringMode: 'storyline',
      format: 'course',
      storyline: storyline as unknown as Json,
    };
    return {
      title,
      description,
      blueprint: 'storyline',
      settings,
      blocks: [],
    };
  }

  const riseBlueprint = options.blueprint === 'microlearning' ? 'microlearning' : 'course';
  const blocks = buildRiseBlocks(title, sections, riseBlueprint);
  return {
    title,
    description,
    blueprint: riseBlueprint,
    settings: getBlueprintSettings(riseBlueprint),
    blocks,
  };
}

export function buildAiImportDraftFromOutline(options: {
  outline: StructuredCourseOutline;
  blueprint: CourseBlueprint;
}): AiImportDraft {
  const fallbackSource = [
    options.outline.title,
    options.outline.description,
    ...options.outline.sections.map((section) => `${section.title}\n${section.summary}\n${section.bullets.join('\n')}`),
  ]
    .filter(Boolean)
    .join('\n\n');

  const sections = sectionsFromStructuredOutline(options.outline);
  if (sections.length === 0) {
    return buildAiImportDraft({
      sourceText: fallbackSource,
      blueprint: options.blueprint,
    });
  }

  const title = options.outline.title || 'AI Generated Course';
  const description = options.outline.description || summarizeDescription(fallbackSource);

  if (options.blueprint === 'storyline') {
    const storyline = buildStorylineDraft(sections);
    const settings: Json = {
      authoringMode: 'storyline',
      format: 'course',
      storyline: storyline as unknown as Json,
    };
    return {
      title,
      description,
      blueprint: 'storyline',
      settings,
      blocks: [],
    };
  }

  const riseBlueprint = options.blueprint === 'microlearning' ? 'microlearning' : 'course';
  return {
    title,
    description,
    blueprint: riseBlueprint,
    settings: getBlueprintSettings(riseBlueprint),
    blocks: buildRiseBlocks(title, sections, riseBlueprint),
  };
}
