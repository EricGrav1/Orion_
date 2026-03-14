import type { ImportedDocument, StructuredCourseOutline, StructuredOutlineSection } from '../types/aiImport.types';
import type { CourseBlueprint } from './courseBlueprint';

const MAX_SECTION_COUNT = 8;
const MAX_BULLETS_PER_SECTION = 4;

export type OutlineGenerationSource = 'remote' | 'fallback';

export interface StructuredOutlineGenerationResult {
  outline: StructuredCourseOutline;
  source: OutlineGenerationSource;
  endpoint?: string;
  warning?: string;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function toBullets(text: string): string[] {
  const sentences = toSentences(text);
  if (sentences.length === 0) return [text.trim()].filter(Boolean);
  return sentences.slice(0, MAX_BULLETS_PER_SECTION);
}

function buildFallbackOutline(document: ImportedDocument, preferredBlueprint: CourseBlueprint): StructuredCourseOutline {
  const sections: StructuredOutlineSection[] = document.sections
    .slice(0, MAX_SECTION_COUNT)
    .map((section, index) => {
      const bullets = toBullets(section.body);
      const summary = bullets[0] || section.body.slice(0, 180);
      return {
        title: section.title || `Section ${index + 1}`,
        summary,
        bullets,
      };
    });

  if (sections.length === 0) {
    const fallbackBullets = toBullets(document.rawText);
    sections.push({
      title: 'Overview',
      summary: fallbackBullets[0] || 'Imported source overview.',
      bullets: fallbackBullets,
    });
  }

  const objectives = sections
    .slice(0, 3)
    .map((section) => section.summary)
    .filter(Boolean)
    .map((summary) => summary.replace(/[. ]+$/, ''));

  return {
    title: document.title || 'AI Generated Course',
    description: document.rawText.slice(0, 220).replace(/\s+/g, ' ').trim(),
    recommendedBlueprint: preferredBlueprint,
    objectives,
    sections,
    assessmentPrompt:
      'Create a short assessment to validate the learner can explain the key objective and apply it in context.',
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStructuredOutlineSection(value: unknown): value is StructuredOutlineSection {
  if (!value || typeof value !== 'object') return false;
  const section = value as Partial<StructuredOutlineSection>;
  return (
    typeof section.title === 'string' &&
    typeof section.summary === 'string' &&
    isStringArray(section.bullets)
  );
}

function isStructuredCourseOutline(value: unknown): value is StructuredCourseOutline {
  if (!value || typeof value !== 'object') return false;
  const outline = value as Partial<StructuredCourseOutline>;
  return (
    typeof outline.title === 'string' &&
    typeof outline.description === 'string' &&
    (outline.recommendedBlueprint === 'course' ||
      outline.recommendedBlueprint === 'microlearning' ||
      outline.recommendedBlueprint === 'storyline') &&
    isStringArray(outline.objectives) &&
    Array.isArray(outline.sections) &&
    outline.sections.every(isStructuredOutlineSection) &&
    typeof outline.assessmentPrompt === 'string'
  );
}

async function requestRemoteOutline(
  endpoint: string,
  document: ImportedDocument,
  preferredBlueprint: CourseBlueprint
): Promise<StructuredCourseOutline> {
  const env = (import.meta as { env: Record<string, string | undefined> }).env;
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const shouldAttachSupabaseAuth = Boolean(anonKey && endpoint.includes('.supabase.co/'));
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (shouldAttachSupabaseAuth && anonKey) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      preferredBlueprint,
      document: {
        kind: document.kind,
        title: document.title,
        rawText: document.rawText.slice(0, 120000),
        sections: document.sections.slice(0, 25),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Remote outline endpoint failed (${response.status}).`);
  }

  const payload = await response.json();
  const outline = (payload && typeof payload === 'object' && 'outline' in payload
    ? (payload as { outline: unknown }).outline
    : payload) as unknown;

  if (!isStructuredCourseOutline(outline)) {
    throw new Error('Remote outline endpoint returned invalid outline schema.');
  }

  return outline;
}

export function getConfiguredAiPipelineEndpoint(): string | null {
  const endpoint = (import.meta as { env: Record<string, string | undefined> }).env
    .VITE_AI_IMPORT_PIPELINE_ENDPOINT;
  if (!endpoint) return null;
  const trimmed = endpoint.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function generateStructuredOutline(options: {
  document: ImportedDocument;
  preferredBlueprint: CourseBlueprint;
  endpointOverride?: string | null;
}): Promise<StructuredOutlineGenerationResult> {
  const endpoint = options.endpointOverride ?? getConfiguredAiPipelineEndpoint();

  if (endpoint) {
    try {
      const outline = await requestRemoteOutline(endpoint, options.document, options.preferredBlueprint);
      return {
        outline,
        source: 'remote',
        endpoint,
      };
    } catch (remoteError) {
      return {
        outline: buildFallbackOutline(options.document, options.preferredBlueprint),
        source: 'fallback',
        endpoint,
        warning: remoteError instanceof Error ? remoteError.message : 'Remote outline request failed.',
      };
    }
  }

  return {
    outline: buildFallbackOutline(options.document, options.preferredBlueprint),
    source: 'fallback',
  };
}
