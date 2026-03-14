import type { InsertBlock, Json } from '../types/database.types';
import type { AuthoringMode, CourseFormat } from '../types/courseTheme.types';
import { createDefaultStorylineDraft } from './courseTheme';

export type CourseBlueprint = 'course' | 'microlearning' | 'storyline';

interface BlueprintConfig {
  label: string;
  title: string;
  description: string;
  helperText: string;
  authoringMode: AuthoringMode;
  format: CourseFormat;
}

export const courseBlueprintConfigs: Record<CourseBlueprint, BlueprintConfig> = {
  course: {
    label: 'Course',
    title: 'Untitled Course',
    description: 'Multi-lesson path for comprehensive learning.',
    helperText: 'Create a multi-lesson course for comprehensive learning.',
    authoringMode: 'rise',
    format: 'course',
  },
  microlearning: {
    label: 'Microlearning',
    title: 'Untitled Microlearning',
    description: 'Single objective lesson for quick consumption.',
    helperText: 'Create bite-sized content focused on one learning objective.',
    authoringMode: 'rise',
    format: 'microlearning',
  },
  storyline: {
    label: 'Interactive (Storyline)',
    title: 'Untitled Interactive Course',
    description: 'Scene-based interactive course with branching logic.',
    helperText: 'Create slide-based interactive learning with triggers and branching.',
    authoringMode: 'storyline',
    format: 'course',
  },
};

export function getBlueprintSettings(blueprint: CourseBlueprint): Json {
  const config = courseBlueprintConfigs[blueprint];
  return {
    authoringMode: config.authoringMode,
    format: config.format,
    storyline: createDefaultStorylineDraft() as unknown as Json,
  };
}

export function getBlueprintStarterBlocks(courseId: string, blueprint: CourseBlueprint): InsertBlock[] {
  if (blueprint === 'storyline') return [];

  if (blueprint === 'microlearning') {
    return [
      {
        course_id: courseId,
        type: 'heading',
        content: { text: 'Microlearning Objective', level: 1 },
        settings: { padding: 'small', maxWidth: 'medium', hidden: false },
        order: 0,
      },
      {
        course_id: courseId,
        type: 'text',
        content: { html: '<p>Add a short explanation focused on one key takeaway.</p>' },
        settings: { padding: 'medium', maxWidth: 'medium', hidden: false },
        order: 1,
      },
      {
        course_id: courseId,
        type: 'quiz',
        content: {
          question: 'What is the most important takeaway from this lesson?',
          options: [
            { id: 'opt-1', text: 'Key takeaway', correct: true },
            { id: 'opt-2', text: 'Distractor option', correct: false },
          ],
          allowMultiple: false,
          explanation: 'Use this check to reinforce the one main objective.',
        },
        settings: { padding: 'medium', maxWidth: 'wide', hidden: false },
        order: 2,
      },
    ];
  }

  return [
    {
      course_id: courseId,
      type: 'heading',
      content: { text: 'Course Overview', level: 1 },
      settings: { padding: 'small', maxWidth: 'medium', hidden: false },
      order: 0,
    },
    {
      course_id: courseId,
      type: 'text',
      content: { html: '<p>Introduce the course goals, audience, and completion expectations.</p>' },
      settings: { padding: 'medium', maxWidth: 'medium', hidden: false },
      order: 1,
    },
    {
      course_id: courseId,
      type: 'heading',
      content: { text: 'Lesson 1', level: 2 },
      settings: { padding: 'small', maxWidth: 'medium', hidden: false },
      order: 2,
    },
    {
      course_id: courseId,
      type: 'text',
      content: { html: '<p>Start building your first lesson content here.</p>' },
      settings: { padding: 'medium', maxWidth: 'medium', hidden: false },
      order: 3,
    },
  ];
}
