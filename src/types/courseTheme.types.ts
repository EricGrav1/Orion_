export interface CourseTheme {
  brandColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
}

export type AuthoringMode = 'rise' | 'storyline';

export type CourseFormat = 'course' | 'microlearning';

export interface StorylineNode {
  id: string;
  title: string;
  summary: string;
  durationSeconds: number;
}

export interface StorylineConnection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
}

export type StorylineVariableType = 'text' | 'number' | 'boolean';

export interface StorylineVariable {
  id: string;
  name: string;
  type: StorylineVariableType;
  initialValue: string;
}

export type StorylineTriggerEvent = 'timeline_end' | 'on_entry' | 'on_click';
export type StorylineConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than';
export type StorylineActionType = 'go_to_scene' | 'set_variable';

export interface StorylineTriggerCondition {
  id: string;
  variableId: string;
  operator: StorylineConditionOperator;
  value: string;
}

export interface StorylineTriggerAction {
  id: string;
  type: StorylineActionType;
  targetSceneId: string | null;
  variableId: string | null;
  value: string;
}

export interface StorylineTrigger {
  id: string;
  sceneId: string;
  label: string;
  event: StorylineTriggerEvent;
  conditions: StorylineTriggerCondition[];
  actions: StorylineTriggerAction[];
}

export interface StorylineDraft {
  startNodeId: string | null;
  nodes: StorylineNode[];
  connections: StorylineConnection[];
  variables: StorylineVariable[];
  triggers: StorylineTrigger[];
}

export interface CourseSettings {
  theme: CourseTheme;
  authoringMode: AuthoringMode;
  format: CourseFormat;
  storyline: StorylineDraft;
}
