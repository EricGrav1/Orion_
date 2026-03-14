import type { CSSProperties } from 'react';
import type { Json } from '../types/database.types';
import type {
  AuthoringMode,
  CourseFormat,
  CourseSettings,
  StorylineActionType,
  StorylineConditionOperator,
  CourseTheme,
  StorylineConnection,
  StorylineDraft,
  StorylineNode,
  StorylineTrigger,
  StorylineTriggerAction,
  StorylineTriggerCondition,
  StorylineTriggerEvent,
  StorylineVariable,
  StorylineVariableType,
} from '../types/courseTheme.types';

export const defaultCourseTheme: CourseTheme = {
  brandColor: '#D4A84B',
  accentColor: '#264B8C',
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  logoUrl: '',
};

export function createDefaultStorylineDraft(): StorylineDraft {
  return {
    startNodeId: 'scene-1',
    nodes: [
      {
        id: 'scene-1',
        title: 'Scene 1',
        summary: 'Introduce context and objective.',
        durationSeconds: 45,
      },
      {
        id: 'scene-2',
        title: 'Scene 2',
        summary: 'Present interaction or decision point.',
        durationSeconds: 60,
      },
    ],
    connections: [
      {
        id: 'conn-1',
        fromId: 'scene-1',
        toId: 'scene-2',
        label: 'Continue',
      },
    ],
    variables: [
      {
        id: 'var-completed',
        name: 'completed',
        type: 'boolean',
        initialValue: 'false',
      },
    ],
    triggers: [
      {
        id: 'trigger-1',
        sceneId: 'scene-1',
        label: 'Advance to Scene 2',
        event: 'timeline_end',
        conditions: [],
        actions: [
          {
            id: 'action-1',
            type: 'go_to_scene',
            targetSceneId: 'scene-2',
            variableId: null,
            value: '',
          },
        ],
      },
    ],
  };
}

export const defaultCourseSettings: CourseSettings = {
  theme: defaultCourseTheme,
  authoringMode: 'rise',
  format: 'course',
  storyline: createDefaultStorylineDraft(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function safeDuration(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(5, Math.min(900, Math.round(value)));
}

function safeAuthoringMode(value: unknown): AuthoringMode {
  return value === 'storyline' ? 'storyline' : 'rise';
}

function safeFormat(value: unknown): CourseFormat {
  return value === 'microlearning' ? 'microlearning' : 'course';
}

function safeVariableType(value: unknown): StorylineVariableType {
  if (value === 'number' || value === 'boolean') return value;
  return 'text';
}

function safeTriggerEvent(value: unknown): StorylineTriggerEvent {
  if (value === 'on_entry' || value === 'on_click') return value;
  return 'timeline_end';
}

function safeConditionOperator(value: unknown): StorylineConditionOperator {
  if (value === 'not_equals' || value === 'greater_than' || value === 'less_than') return value;
  return 'equals';
}

function safeActionType(value: unknown): StorylineActionType {
  if (value === 'set_variable') return value;
  return 'go_to_scene';
}

function parseStorylineNodes(value: unknown): StorylineNode[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((node, index) => {
      if (!isRecord(node)) return null;
      const fallbackId = `scene-${index + 1}`;
      return {
        id: safeText(node.id, fallbackId),
        title: safeText(node.title, `Scene ${index + 1}`),
        summary: safeText(node.summary, 'Add scene summary'),
        durationSeconds: safeDuration(node.durationSeconds, 45),
      } as StorylineNode;
    })
    .filter((node): node is StorylineNode => node !== null);
}

function parseStorylineConnections(value: unknown, nodeIds: Set<string>): StorylineConnection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((connection, index) => {
      if (!isRecord(connection)) return null;
      const fromId = safeText(connection.fromId, '');
      const toId = safeText(connection.toId, '');
      if (!nodeIds.has(fromId) || !nodeIds.has(toId)) return null;
      return {
        id: safeText(connection.id, `conn-${index + 1}`),
        fromId,
        toId,
        label: safeText(connection.label, 'Continue'),
      } as StorylineConnection;
    })
    .filter((connection): connection is StorylineConnection => connection !== null);
}

function parseStorylineVariables(value: unknown): StorylineVariable[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((variable, index) => {
      if (!isRecord(variable)) return null;
      const fallbackName = `variable_${index + 1}`;
      return {
        id: safeText(variable.id, `var-${index + 1}`),
        name: safeText(variable.name, fallbackName),
        type: safeVariableType(variable.type),
        initialValue: safeText(variable.initialValue, ''),
      } as StorylineVariable;
    })
    .filter((variable): variable is StorylineVariable => variable !== null);
}

function parseStorylineTriggerConditions(
  value: unknown,
  variableIds: Set<string>
): StorylineTriggerCondition[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((condition, index) => {
      if (!isRecord(condition)) return null;
      const variableId = safeText(condition.variableId, '');
      if (!variableIds.has(variableId)) return null;
      return {
        id: safeText(condition.id, `condition-${index + 1}`),
        variableId,
        operator: safeConditionOperator(condition.operator),
        value: safeText(condition.value, ''),
      } as StorylineTriggerCondition;
    })
    .filter((condition): condition is StorylineTriggerCondition => condition !== null);
}

function parseStorylineTriggerActions(
  value: unknown,
  nodeIds: Set<string>,
  variableIds: Set<string>
): StorylineTriggerAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((action, index) => {
      if (!isRecord(action)) return null;
      const type = safeActionType(action.type);
      const targetSceneIdRaw = safeText(action.targetSceneId, '');
      const variableIdRaw = safeText(action.variableId, '');
      const targetSceneId = type === 'go_to_scene' && nodeIds.has(targetSceneIdRaw) ? targetSceneIdRaw : null;
      const variableId = type === 'set_variable' && variableIds.has(variableIdRaw) ? variableIdRaw : null;
      if (type === 'go_to_scene' && !targetSceneId) return null;
      if (type === 'set_variable' && !variableId) return null;
      return {
        id: safeText(action.id, `action-${index + 1}`),
        type,
        targetSceneId,
        variableId,
        value: safeText(action.value, ''),
      } as StorylineTriggerAction;
    })
    .filter((action): action is StorylineTriggerAction => action !== null);
}

function parseStorylineTriggers(
  value: unknown,
  nodeIds: Set<string>,
  variableIds: Set<string>
): StorylineTrigger[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((trigger, index) => {
      if (!isRecord(trigger)) return null;
      const sceneId = safeText(trigger.sceneId, '');
      if (!nodeIds.has(sceneId)) return null;
      return {
        id: safeText(trigger.id, `trigger-${index + 1}`),
        sceneId,
        label: safeText(trigger.label, `Trigger ${index + 1}`),
        event: safeTriggerEvent(trigger.event),
        conditions: parseStorylineTriggerConditions(trigger.conditions, variableIds),
        actions: parseStorylineTriggerActions(trigger.actions, nodeIds, variableIds),
      } as StorylineTrigger;
    })
    .filter((trigger): trigger is StorylineTrigger => trigger !== null);
}

function parseStorylineDraft(value: unknown): StorylineDraft {
  if (!isRecord(value)) return createDefaultStorylineDraft();
  const nodes = parseStorylineNodes(value.nodes);
  const fallbackDraft = createDefaultStorylineDraft();
  const safeNodes = nodes.length > 0 ? nodes : fallbackDraft.nodes;
  const nodeIds = new Set(safeNodes.map((node) => node.id));
  const connections = parseStorylineConnections(value.connections, nodeIds);
  const variables = parseStorylineVariables(value.variables);
  const safeVariables = variables.length > 0 ? variables : fallbackDraft.variables;
  const variableIds = new Set(safeVariables.map((variable) => variable.id));
  const triggers = parseStorylineTriggers(value.triggers, nodeIds, variableIds);
  const requestedStartNodeId = typeof value.startNodeId === 'string' ? value.startNodeId : null;
  const startNodeId = requestedStartNodeId && nodeIds.has(requestedStartNodeId)
    ? requestedStartNodeId
    : safeNodes[0]?.id ?? null;

  return {
    startNodeId,
    nodes: safeNodes,
    connections,
    variables: safeVariables,
    triggers,
  };
}

export function parseCourseSettings(settings: Json): CourseSettings {
  if (!isRecord(settings)) return defaultCourseSettings;
  const themeValue = isRecord(settings.theme) ? settings.theme : {};

  return {
    theme: {
      brandColor: safeColor(themeValue.brandColor, defaultCourseTheme.brandColor),
      accentColor: safeColor(themeValue.accentColor, defaultCourseTheme.accentColor),
      fontFamily: safeText(themeValue.fontFamily, defaultCourseTheme.fontFamily),
      logoUrl: safeText(themeValue.logoUrl, ''),
    },
    authoringMode: safeAuthoringMode(settings.authoringMode),
    format: safeFormat(settings.format),
    storyline: parseStorylineDraft(settings.storyline),
  };
}

export function toCourseSettingsJson(courseSettings: CourseSettings): Json {
  return {
    theme: {
      brandColor: courseSettings.theme.brandColor,
      accentColor: courseSettings.theme.accentColor,
      fontFamily: courseSettings.theme.fontFamily,
      logoUrl: courseSettings.theme.logoUrl,
    },
    authoringMode: courseSettings.authoringMode,
    format: courseSettings.format,
    storyline: courseSettings.storyline as unknown as Json,
  };
}

export function applyThemeToSettings(settings: Json, theme: CourseTheme): Json {
  if (!isRecord(settings)) {
    return toCourseSettingsJson({
      ...defaultCourseSettings,
      theme,
    });
  }

  return {
    ...settings,
    theme: {
      ...(isRecord(settings.theme) ? settings.theme : {}),
      brandColor: theme.brandColor,
      accentColor: theme.accentColor,
      fontFamily: theme.fontFamily,
      logoUrl: theme.logoUrl,
    },
  } as Json;
}

export function getCourseThemeVars(theme: CourseTheme): CSSProperties {
  return {
    '--course-brand': theme.brandColor,
    '--course-accent': theme.accentColor,
    '--course-font-family': theme.fontFamily,
  } as CSSProperties;
}
