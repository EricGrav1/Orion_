import type { Course } from '../types/database.types';
import { blockService } from './block.service';
import { courseService } from './course.service';
import type { CourseBlueprint } from '../utils/courseBlueprint';
import { buildAiImportDraftFromOutline } from '../utils/aiImport';
import { generateStructuredOutline } from '../utils/aiOutline';
import { parseImportedFile, parseTextInput } from '../utils/documentParsers';

interface CreateCourseFromTextOptions {
  sourceText: string;
  blueprint: CourseBlueprint;
  fileName?: string;
}

interface CreateCourseFromFileOptions {
  file: File;
  blueprint: CourseBlueprint;
  extraText?: string;
}

export const aiCourseImportService = {
  async createCourseFromText(options: CreateCourseFromTextOptions): Promise<Course> {
    const parsedDocument = parseTextInput(options.sourceText, options.fileName || 'Imported Text');
    const outline = await generateStructuredOutline({
      document: parsedDocument,
      preferredBlueprint: options.blueprint,
    });
    const draft = buildAiImportDraftFromOutline({
      outline: outline.outline,
      blueprint: options.blueprint,
    });

    const createdCourse = await courseService.createCourse({
      title: draft.title,
      description: draft.description,
      settings: draft.settings,
    });

    if (draft.blocks.length > 0) {
      await blockService.createBlocks(
        draft.blocks.map((block) => ({
          ...block,
          course_id: createdCourse.id,
        }))
      );
    }

    return createdCourse;
  },

  async createCourseFromFile(options: CreateCourseFromFileOptions): Promise<Course> {
    const parsedDocument = await parseImportedFile(options.file);
    if (options.extraText?.trim()) {
      parsedDocument.sections.unshift({
        title: 'Additional Input',
        body: options.extraText.trim(),
        sourceRef: 'manual-input',
      });
      parsedDocument.rawText = `${options.extraText.trim()}\n\n${parsedDocument.rawText}`.trim();
    }

    const outline = await generateStructuredOutline({
      document: parsedDocument,
      preferredBlueprint: options.blueprint,
    });
    const draft = buildAiImportDraftFromOutline({
      outline: outline.outline,
      blueprint: options.blueprint,
    });

    const createdCourse = await courseService.createCourse({
      title: draft.title,
      description: draft.description,
      settings: draft.settings,
    });

    if (draft.blocks.length > 0) {
      await blockService.createBlocks(
        draft.blocks.map((block) => ({
          ...block,
          course_id: createdCourse.id,
        }))
      );
    }

    return createdCourse;
  },
};
