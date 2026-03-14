import type { CourseBlueprint } from '../utils/courseBlueprint';

export type ImportedDocumentKind = 'text' | 'pdf' | 'docx' | 'pptx';

export interface ImportedDocumentSection {
  title: string;
  body: string;
  sourceRef?: string;
}

export interface ImportedDocument {
  kind: ImportedDocumentKind;
  title: string;
  rawText: string;
  sections: ImportedDocumentSection[];
  warnings: string[];
}

export interface StructuredOutlineSection {
  title: string;
  summary: string;
  bullets: string[];
}

export interface StructuredCourseOutline {
  title: string;
  description: string;
  recommendedBlueprint: CourseBlueprint;
  objectives: string[];
  sections: StructuredOutlineSection[];
  assessmentPrompt: string;
}

