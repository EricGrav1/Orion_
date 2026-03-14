import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { courseService } from '../../services/course.service';
import type { Course } from '../../types/database.types';
import type {
  StorylineActionType,
  StorylineConditionOperator,
  CourseSettings,
  StorylineConnection,
  StorylineDraft,
  StorylineNode,
  StorylineTrigger,
  StorylineTriggerAction,
  StorylineTriggerCondition,
  StorylineTriggerEvent,
  StorylineVariable,
  StorylineVariableType,
} from '../../types/courseTheme.types';
import {
  defaultCourseSettings,
  parseCourseSettings,
  toCourseSettingsJson,
} from '../../utils/courseTheme';
import { exportStorylineAsScormPackage } from '../../utils/scormExport';

interface StorylineStudioProps {
  courseId: string;
}

interface PreviewLogEntry {
  id: string;
  message: string;
}

function makeSceneId(index: number): string {
  return `scene-${Date.now()}-${index}`;
}

function makeConnectionId(): string {
  return `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makeVariableId(): string {
  return `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makeTriggerId(): string {
  return `trigger-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makeConditionId(): string {
  return `condition-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makeActionId(): string {
  return `action-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function defaultValueForVariableType(type: StorylineVariableType): string {
  if (type === 'number') return '0';
  if (type === 'boolean') return 'false';
  return '';
}

function buildPreviewVariableMap(variables: StorylineVariable[]): Record<string, string> {
  return variables.reduce<Record<string, string>>((accumulator, variable) => {
    accumulator[variable.id] = variable.initialValue;
    return accumulator;
  }, {});
}

export function StorylineStudio({ courseId }: StorylineStudioProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseSettings, setCourseSettings] = useState<CourseSettings>(defaultCourseSettings);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [branchTargetId, setBranchTargetId] = useState<string>('');
  const [previewSceneId, setPreviewSceneId] = useState<string>('');
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewLogs, setPreviewLogs] = useState<PreviewLogEntry[]>([]);
  const [isExportingScorm, setIsExportingScorm] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextCourse = await courseService.getCourse(courseId);
        if (!active || !nextCourse) return;
        const parsedSettings = parseCourseSettings(nextCourse.settings);
        setCourse(nextCourse);
        setCourseSettings({
          ...parsedSettings,
          authoringMode: 'storyline',
        });
        setSelectedNodeId(parsedSettings.storyline.startNodeId ?? parsedSettings.storyline.nodes[0]?.id ?? '');
        setPreviewSceneId(parsedSettings.storyline.startNodeId ?? parsedSettings.storyline.nodes[0]?.id ?? '');
        setPreviewVariables(buildPreviewVariableMap(parsedSettings.storyline.variables));
        setPreviewLogs([]);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load storyline settings');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!isDirty || !course) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await courseService.updateCourse(course.id, {
          settings: toCourseSettingsJson({
            ...courseSettings,
            authoringMode: 'storyline',
          }),
        });
        setIsDirty(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to save storyline');
      } finally {
        setIsSaving(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [course, courseSettings, isDirty]);

  const draft = courseSettings.storyline;
  const selectedNode = useMemo(() => {
    if (selectedNodeId) {
      const found = draft.nodes.find((node) => node.id === selectedNodeId);
      if (found) return found;
    }
    return draft.nodes[0] ?? null;
  }, [draft.nodes, selectedNodeId]);

  const outgoingConnections = useMemo(
    () => draft.connections.filter((connection) => connection.fromId === selectedNodeId),
    [draft.connections, selectedNodeId]
  );

  const connectionTargets = useMemo(
    () => draft.nodes.filter((node) => node.id !== selectedNodeId),
    [draft.nodes, selectedNodeId]
  );

  const selectedNodeConnectionTargetIds = useMemo(
    () => new Set(outgoingConnections.map((connection) => connection.toId)),
    [outgoingConnections]
  );

  const sceneTriggers = useMemo(
    () => draft.triggers.filter((trigger) => trigger.sceneId === selectedNodeId),
    [draft.triggers, selectedNodeId]
  );

  const sceneVariables = draft.variables;

  useEffect(() => {
    setPreviewSceneId((previous) => {
      if (previous && draft.nodes.some((node) => node.id === previous)) return previous;
      return draft.startNodeId ?? draft.nodes[0]?.id ?? '';
    });
  }, [draft.nodes, draft.startNodeId]);

  useEffect(() => {
    setPreviewVariables((previous) => {
      const next = buildPreviewVariableMap(draft.variables);
      draft.variables.forEach((variable) => {
        if (previous[variable.id] !== undefined) {
          next[variable.id] = previous[variable.id];
        }
      });
      return next;
    });
  }, [draft.variables]);

  const updateDraft = (nextDraft: StorylineDraft) => {
    setCourseSettings((previous) => ({
      ...previous,
      authoringMode: 'storyline',
      storyline: nextDraft,
    }));
    setIsDirty(true);
  };

  const setStartNode = (nodeId: string) => {
    updateDraft({
      ...draft,
      startNodeId: nodeId,
    });
  };

  const addScene = () => {
    const nextIndex = draft.nodes.length + 1;
    const newScene: StorylineNode = {
      id: makeSceneId(nextIndex),
      title: `Scene ${nextIndex}`,
      summary: 'Describe scene objective and learner action.',
      durationSeconds: 45,
    };
    const nextNodes = [...draft.nodes, newScene];
    const nextStartNodeId = draft.startNodeId ?? newScene.id;
    updateDraft({
      ...draft,
      startNodeId: nextStartNodeId,
      nodes: nextNodes,
    });
    setSelectedNodeId(newScene.id);
  };

  const updateSelectedNode = (patch: Partial<StorylineNode>) => {
    if (!selectedNode) return;
    const nextNodes = draft.nodes.map((node) =>
      node.id === selectedNode.id ? { ...node, ...patch } : node
    );
    updateDraft({
      ...draft,
      nodes: nextNodes,
    });
  };

  const addConnection = () => {
    if (!selectedNode || !branchTargetId || branchTargetId === selectedNode.id) return;
    if (selectedNodeConnectionTargetIds.has(branchTargetId)) return;
    const connection: StorylineConnection = {
      id: makeConnectionId(),
      fromId: selectedNode.id,
      toId: branchTargetId,
      label: 'Next choice',
    };
    updateDraft({
      ...draft,
      connections: [...draft.connections, connection],
    });
    setBranchTargetId('');
  };

  const removeConnection = (connectionId: string) => {
    updateDraft({
      ...draft,
      connections: draft.connections.filter((connection) => connection.id !== connectionId),
    });
  };

  const updateTrigger = (triggerId: string, updater: (trigger: StorylineTrigger) => StorylineTrigger) => {
    updateDraft({
      ...draft,
      triggers: draft.triggers.map((trigger) => (trigger.id === triggerId ? updater(trigger) : trigger)),
    });
  };

  const addVariable = () => {
    const nextIndex = draft.variables.length + 1;
    const newVariable: StorylineVariable = {
      id: makeVariableId(),
      name: `variable_${nextIndex}`,
      type: 'text',
      initialValue: '',
    };
    updateDraft({
      ...draft,
      variables: [...draft.variables, newVariable],
    });
  };

  const updateVariable = (variableId: string, patch: Partial<StorylineVariable>) => {
    updateDraft({
      ...draft,
      variables: draft.variables.map((variable) => {
        if (variable.id !== variableId) return variable;
        const nextType = patch.type ?? variable.type;
        return {
          ...variable,
          ...patch,
          initialValue:
            patch.type && patch.type !== variable.type
              ? defaultValueForVariableType(nextType)
              : patch.initialValue ?? variable.initialValue,
        };
      }),
    });
  };

  const removeVariable = (variableId: string) => {
    updateDraft({
      ...draft,
      variables: draft.variables.filter((variable) => variable.id !== variableId),
      triggers: draft.triggers
        .map((trigger) => ({
          ...trigger,
          conditions: trigger.conditions.filter((condition) => condition.variableId !== variableId),
          actions: trigger.actions.filter((action) => !(action.type === 'set_variable' && action.variableId === variableId)),
        }))
        .filter((trigger) => trigger.actions.length > 0),
    });
  };

  const addTrigger = () => {
    if (!selectedNode) return;
    const defaultTarget = draft.nodes.find((node) => node.id !== selectedNode.id);
    const defaultVariable = draft.variables[0];
    const defaultAction: StorylineTriggerAction = defaultTarget
      ? {
          id: makeActionId(),
          type: 'go_to_scene',
          targetSceneId: defaultTarget.id,
          variableId: null,
          value: '',
        }
      : {
          id: makeActionId(),
          type: 'set_variable',
          targetSceneId: null,
          variableId: defaultVariable?.id ?? null,
          value: defaultVariable ? defaultVariable.initialValue : '',
        };

    const newTrigger: StorylineTrigger = {
      id: makeTriggerId(),
      sceneId: selectedNode.id,
      label: 'New trigger',
      event: 'timeline_end',
      conditions: [],
      actions: [defaultAction],
    };

    updateDraft({
      ...draft,
      triggers: [...draft.triggers, newTrigger],
    });
  };

  const removeTrigger = (triggerId: string) => {
    updateDraft({
      ...draft,
      triggers: draft.triggers.filter((trigger) => trigger.id !== triggerId),
    });
  };

  const setTriggerEvent = (triggerId: string, event: StorylineTriggerEvent) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      event,
    }));
  };

  const setTriggerLabel = (triggerId: string, label: string) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      label,
    }));
  };

  const setTriggerPrimaryActionType = (triggerId: string, type: StorylineActionType) => {
    updateTrigger(triggerId, (trigger) => {
      const current = trigger.actions[0];
      const fallbackSceneId = draft.nodes.find((node) => node.id !== trigger.sceneId)?.id ?? null;
      const fallbackVariableId = draft.variables[0]?.id ?? null;
      const nextAction: StorylineTriggerAction = {
        id: current?.id ?? makeActionId(),
        type,
        targetSceneId: type === 'go_to_scene' ? current?.targetSceneId ?? fallbackSceneId : null,
        variableId: type === 'set_variable' ? current?.variableId ?? fallbackVariableId : null,
        value: type === 'set_variable' ? current?.value ?? '' : '',
      };
      return {
        ...trigger,
        actions: [nextAction],
      };
    });
  };

  const setTriggerPrimaryTargetScene = (triggerId: string, targetSceneId: string) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      actions: trigger.actions.map((action, index) =>
        index === 0
          ? {
              ...action,
              targetSceneId: targetSceneId || null,
            }
          : action
      ),
    }));
  };

  const setTriggerPrimaryVariable = (triggerId: string, variableId: string) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      actions: trigger.actions.map((action, index) =>
        index === 0
          ? {
              ...action,
              variableId: variableId || null,
            }
          : action
      ),
    }));
  };

  const setTriggerPrimaryValue = (triggerId: string, value: string) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      actions: trigger.actions.map((action, index) =>
        index === 0
          ? {
              ...action,
              value,
            }
          : action
      ),
    }));
  };

  const addTriggerCondition = (triggerId: string) => {
    const defaultVariable = draft.variables[0];
    if (!defaultVariable) return;
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      conditions: [
        ...trigger.conditions,
        {
          id: makeConditionId(),
          variableId: defaultVariable.id,
          operator: 'equals',
          value: defaultVariable.initialValue || '',
        },
      ],
    }));
  };

  const updateTriggerCondition = (
    triggerId: string,
    conditionId: string,
    patch: Partial<StorylineTriggerCondition>
  ) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      conditions: trigger.conditions.map((condition) =>
        condition.id === conditionId
          ? {
              ...condition,
              ...patch,
            }
          : condition
      ),
    }));
  };

  const removeTriggerCondition = (triggerId: string, conditionId: string) => {
    updateTrigger(triggerId, (trigger) => ({
      ...trigger,
      conditions: trigger.conditions.filter((condition) => condition.id !== conditionId),
    }));
  };

  const previewScene = useMemo(
    () => draft.nodes.find((node) => node.id === previewSceneId) ?? null,
    [draft.nodes, previewSceneId]
  );

  const appendPreviewLogs = (messages: string[]) => {
    if (messages.length === 0) return;
    setPreviewLogs((previous) => {
      const stamped = messages.map((message, index) => ({
        id: `log-${Date.now()}-${index}`,
        message,
      }));
      return [...previous, ...stamped].slice(-50);
    });
  };

  const normalizeByType = (value: string, type: StorylineVariableType): string | number | boolean => {
    if (type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (type === 'boolean') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return value;
  };

  const evaluateCondition = (
    condition: StorylineTriggerCondition,
    values: Record<string, string>
  ): boolean => {
    const variable = draft.variables.find((candidate) => candidate.id === condition.variableId);
    if (!variable) return false;
    const left = normalizeByType(values[condition.variableId] ?? variable.initialValue, variable.type);
    const right = normalizeByType(condition.value, variable.type);
    if (condition.operator === 'not_equals') return left !== right;
    if (condition.operator === 'greater_than') return Number(left) > Number(right);
    if (condition.operator === 'less_than') return Number(left) < Number(right);
    return left === right;
  };

  const runPreviewEvent = (event: StorylineTriggerEvent) => {
    if (!previewSceneId) {
      appendPreviewLogs(['Preview scene not set.']);
      return;
    }
    const activeScene = draft.nodes.find((node) => node.id === previewSceneId);
    if (!activeScene) {
      appendPreviewLogs(['Preview scene is invalid.']);
      return;
    }

    const matchingTriggers = draft.triggers.filter(
      (trigger) => trigger.sceneId === previewSceneId && trigger.event === event
    );
    if (matchingTriggers.length === 0) {
      appendPreviewLogs([`No ${event} triggers on ${activeScene.title}.`]);
      return;
    }

    let nextSceneId = previewSceneId;
    const nextVariables = { ...previewVariables };
    const messages: string[] = [];

    matchingTriggers.forEach((trigger) => {
      const conditionsPass = trigger.conditions.every((condition) => evaluateCondition(condition, nextVariables));
      if (!conditionsPass) {
        messages.push(`Skipped "${trigger.label}" (conditions not met).`);
        return;
      }
      messages.push(`Fired "${trigger.label}".`);
      trigger.actions.forEach((action) => {
        if (action.type === 'go_to_scene' && action.targetSceneId) {
          const target = draft.nodes.find((node) => node.id === action.targetSceneId);
          if (target) {
            nextSceneId = target.id;
            messages.push(`→ Jumped to ${target.title}.`);
          }
          return;
        }
        if (action.type === 'set_variable' && action.variableId) {
          nextVariables[action.variableId] = action.value;
          const variable = draft.variables.find((candidate) => candidate.id === action.variableId);
          messages.push(`→ Set ${variable?.name ?? action.variableId} = ${action.value || '""'}.`);
        }
      });
    });

    setPreviewVariables(nextVariables);
    setPreviewSceneId(nextSceneId);
    appendPreviewLogs(messages);
  };

  const resetPreview = () => {
    setPreviewSceneId(draft.startNodeId ?? draft.nodes[0]?.id ?? '');
    setPreviewVariables(buildPreviewVariableMap(draft.variables));
    setPreviewLogs([]);
  };

  const updatePreviewVariable = (variableId: string, value: string) => {
    setPreviewVariables((previous) => ({
      ...previous,
      [variableId]: value,
    }));
  };

  const handleExportScorm = useCallback(() => {
    if (!course) return;
    try {
      setIsExportingScorm(true);
      setExportError(null);
      exportStorylineAsScormPackage({
        courseId: course.id,
        courseTitle: course.title || 'Interactive Course',
        storyline: courseSettings.storyline,
        theme: courseSettings.theme,
      });
    } catch (exportScormError) {
      setExportError(exportScormError instanceof Error ? exportScormError.message : 'Failed to export SCORM');
    } finally {
      setIsExportingScorm(false);
    }
  }, [course, courseSettings.storyline, courseSettings.theme]);

  if (isLoading) {
    return (
      <div className="storyline-loading">
        <div className="storyline-loading-card">Loading Storyline Studio...</div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="storyline-loading">
        <div className="storyline-loading-card error">{error}</div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div
      className="storyline-shell"
      style={{
        '--storyline-brand': courseSettings.theme.brandColor,
        '--storyline-accent': courseSettings.theme.accentColor,
      } as CSSProperties}
    >
      <header className="storyline-header">
        <div>
          <div className="storyline-tag">Storyline Studio</div>
          <h2>{course?.title ?? 'Interactive Course'}</h2>
        </div>
        <div className="storyline-header-actions">
          <button className="action secondary" onClick={handleExportScorm} disabled={isExportingScorm || !course}>
            {isExportingScorm ? 'Exporting...' : 'Export SCORM'}
          </button>
          <div className="storyline-status">{isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'All changes saved'}</div>
        </div>
      </header>

      {error && <div className="storyline-error">{error}</div>}
      {exportError && <div className="storyline-error">{exportError}</div>}

      <div className="storyline-grid">
        <aside className="storyline-panel">
          <div className="panel-head">
            <h3>Scenes</h3>
            <button className="action" onClick={addScene}>+ Add scene</button>
          </div>
          <div className="scene-list">
            {draft.nodes.map((node) => (
              <button
                key={node.id}
                className={`scene-row ${selectedNodeId === node.id ? 'active' : ''}`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className="scene-row-top">
                  <span>{node.title}</span>
                  <span>{node.durationSeconds}s</span>
                </div>
                <div className="scene-row-meta">
                  {draft.startNodeId === node.id ? 'Start scene' : 'Branch target'}
                </div>
              </button>
            ))}
          </div>
          <div className="variables-panel">
            <div className="variables-head">
              <h4>Variables</h4>
              <button className="action secondary small" onClick={addVariable}>+ Add</button>
            </div>
            <div className="variables-list">
              {sceneVariables.length === 0 ? (
                <div className="muted">No variables yet</div>
              ) : (
                sceneVariables.map((variable) => (
                  <div key={variable.id} className="variable-row">
                    <input
                      value={variable.name}
                      onChange={(event) => updateVariable(variable.id, { name: event.target.value })}
                      placeholder="Variable name"
                    />
                    <select
                      value={variable.type}
                      onChange={(event) => updateVariable(variable.id, { type: event.target.value as StorylineVariableType })}
                    >
                      <option value="text">text</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <input
                      value={variable.initialValue}
                      onChange={(event) => updateVariable(variable.id, { initialValue: event.target.value })}
                      placeholder="Initial value"
                    />
                    <button className="text-danger" onClick={() => removeVariable(variable.id)}>Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="storyline-canvas">
          <div className="panel-head">
            <h3>Branch Map</h3>
            <span>{draft.connections.length} connections</span>
          </div>
          <div className="canvas-flow">
            {draft.nodes.map((node) => {
              const nodeConnections = draft.connections.filter((connection) => connection.fromId === node.id);
              return (
                <div key={node.id} className={`flow-node ${selectedNodeId === node.id ? 'active' : ''}`}>
                  <div className="flow-head">
                    <button className="flow-title" onClick={() => setSelectedNodeId(node.id)}>{node.title}</button>
                    {draft.startNodeId === node.id ? <span className="pill">Start</span> : null}
                  </div>
                  <p>{node.summary}</p>
                  <div className="flow-links">
                    {nodeConnections.length === 0 ? (
                      <span className="muted">No outgoing branch</span>
                    ) : (
                      nodeConnections.map((connection) => {
                        const target = draft.nodes.find((candidate) => candidate.id === connection.toId);
                        return (
                          <div key={connection.id} className="link-row">
                            <span>{connection.label}: {target?.title ?? 'Unknown'}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="storyline-panel">
          <div className="panel-head">
            <h3>Properties</h3>
          </div>
          {!selectedNode ? (
            <p className="muted">Add a scene to start editing.</p>
          ) : (
            <div className="properties">
              <label>
                Scene title
                <input
                  value={selectedNode.title}
                  onChange={(event) => updateSelectedNode({ title: event.target.value })}
                />
              </label>
              <label>
                Summary
                <textarea
                  rows={4}
                  value={selectedNode.summary}
                  onChange={(event) => updateSelectedNode({ summary: event.target.value })}
                />
              </label>
              <label>
                Duration (seconds)
                <input
                  type="number"
                  min={5}
                  max={900}
                  value={selectedNode.durationSeconds}
                  onChange={(event) => updateSelectedNode({ durationSeconds: Number(event.target.value) || 5 })}
                />
              </label>
              <button className="action secondary" onClick={() => setStartNode(selectedNode.id)}>
                Set as start scene
              </button>

              <div className="branching">
                <h4>Add branch</h4>
                <div className="branch-controls">
                  <select value={branchTargetId} onChange={(event) => setBranchTargetId(event.target.value)}>
                    <option value="">Select target scene</option>
                    {connectionTargets
                      .filter((node) => !selectedNodeConnectionTargetIds.has(node.id))
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                  </select>
                  <button className="action" onClick={addConnection}>Create branch</button>
                </div>
                <div className="branch-list">
                  {outgoingConnections.map((connection) => {
                    const target = draft.nodes.find((candidate) => candidate.id === connection.toId);
                    return (
                      <div key={connection.id} className="branch-row">
                        <span>{target?.title ?? 'Unknown target'}</span>
                        <button onClick={() => removeConnection(connection.id)}>Remove</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="triggers">
                <div className="triggers-head">
                  <h4>Triggers</h4>
                  <button className="action secondary small" onClick={addTrigger}>+ Add trigger</button>
                </div>
                {sceneTriggers.length === 0 ? (
                  <div className="muted">No triggers on this scene yet</div>
                ) : (
                  <div className="trigger-list">
                    {sceneTriggers.map((trigger) => {
                      const primaryAction = trigger.actions[0] ?? null;
                      const goToOptions = draft.nodes.filter((node) => node.id !== trigger.sceneId);
                      return (
                        <div key={trigger.id} className="trigger-row">
                          <div className="trigger-grid">
                            <label>
                              Label
                              <input
                                value={trigger.label}
                                onChange={(event) => setTriggerLabel(trigger.id, event.target.value)}
                              />
                            </label>
                            <label>
                              Event
                              <select
                                value={trigger.event}
                                onChange={(event) => setTriggerEvent(trigger.id, event.target.value as StorylineTriggerEvent)}
                              >
                                <option value="timeline_end">timeline_end</option>
                                <option value="on_entry">on_entry</option>
                                <option value="on_click">on_click</option>
                              </select>
                            </label>
                          </div>

                          <div className="trigger-grid">
                            <label>
                              Action
                              <select
                                value={primaryAction?.type ?? 'go_to_scene'}
                                onChange={(event) =>
                                  setTriggerPrimaryActionType(trigger.id, event.target.value as StorylineActionType)
                                }
                              >
                                <option value="go_to_scene">go_to_scene</option>
                                <option value="set_variable">set_variable</option>
                              </select>
                            </label>

                            {primaryAction?.type === 'set_variable' ? (
                              <label>
                                Variable
                                <select
                                  value={primaryAction.variableId ?? ''}
                                  onChange={(event) => setTriggerPrimaryVariable(trigger.id, event.target.value)}
                                >
                                  <option value="">Select variable</option>
                                  {sceneVariables.map((variable) => (
                                    <option key={variable.id} value={variable.id}>
                                      {variable.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <label>
                                Target scene
                                <select
                                  value={primaryAction?.targetSceneId ?? ''}
                                  onChange={(event) => setTriggerPrimaryTargetScene(trigger.id, event.target.value)}
                                >
                                  <option value="">Select target</option>
                                  {goToOptions.map((node) => (
                                    <option key={node.id} value={node.id}>
                                      {node.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>

                          {primaryAction?.type === 'set_variable' && (
                            <label>
                              Set value
                              <input
                                value={primaryAction.value}
                                onChange={(event) => setTriggerPrimaryValue(trigger.id, event.target.value)}
                              />
                            </label>
                          )}

                          <div className="conditions">
                            <div className="conditions-head">
                              <h5>Conditions</h5>
                              <button className="action secondary small" onClick={() => addTriggerCondition(trigger.id)}>
                                + Add condition
                              </button>
                            </div>
                            {trigger.conditions.length === 0 ? (
                              <div className="muted">No conditions. Trigger always runs.</div>
                            ) : (
                              <div className="condition-list">
                                {trigger.conditions.map((condition) => (
                                  <div key={condition.id} className="condition-row">
                                    <select
                                      value={condition.variableId}
                                      onChange={(event) =>
                                        updateTriggerCondition(trigger.id, condition.id, { variableId: event.target.value })
                                      }
                                    >
                                      {sceneVariables.map((variable) => (
                                        <option key={variable.id} value={variable.id}>
                                          {variable.name}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={condition.operator}
                                      onChange={(event) =>
                                        updateTriggerCondition(trigger.id, condition.id, {
                                          operator: event.target.value as StorylineConditionOperator,
                                        })
                                      }
                                    >
                                      <option value="equals">equals</option>
                                      <option value="not_equals">not_equals</option>
                                      <option value="greater_than">greater_than</option>
                                      <option value="less_than">less_than</option>
                                    </select>
                                    <input
                                      value={condition.value}
                                      onChange={(event) =>
                                        updateTriggerCondition(trigger.id, condition.id, { value: event.target.value })
                                      }
                                      placeholder="Value"
                                    />
                                    <button className="text-danger" onClick={() => removeTriggerCondition(trigger.id, condition.id)}>
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="trigger-actions">
                            <button className="text-danger" onClick={() => removeTrigger(trigger.id)}>Delete trigger</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="runtime-preview">
                <div className="runtime-head">
                  <h4>Runtime Preview</h4>
                  <button className="action secondary small" onClick={resetPreview}>Reset</button>
                </div>
                <div className="runtime-scene">
                  Scene: <strong>{previewScene?.title ?? 'None selected'}</strong>
                </div>
                <div className="runtime-events">
                  <button className="action secondary small" onClick={() => runPreviewEvent('on_entry')}>Run on_entry</button>
                  <button className="action secondary small" onClick={() => runPreviewEvent('on_click')}>Run on_click</button>
                  <button className="action secondary small" onClick={() => runPreviewEvent('timeline_end')}>Run timeline_end</button>
                </div>
                <div className="runtime-vars">
                  {sceneVariables.map((variable) => (
                    <label key={variable.id}>
                      {variable.name}
                      <input
                        value={previewVariables[variable.id] ?? ''}
                        onChange={(event) => updatePreviewVariable(variable.id, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <div className="runtime-log">
                  {previewLogs.length === 0 ? (
                    <div className="muted">No runtime events yet</div>
                  ) : (
                    previewLogs.slice(-8).map((entry) => (
                      <div key={entry.id} className="runtime-log-row">
                        {entry.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.storyline-loading { min-height: calc(100vh - 160px); display: grid; place-items: center; }
.storyline-loading-card { border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 1rem 1.2rem; background: rgba(15,20,35,0.65); color: rgba(255,255,255,0.8); }
.storyline-loading-card.error { color: #f9b6b6; }

.storyline-shell { --panel-bg: rgba(20, 24, 45, 0.75); --panel-border: rgba(255,255,255,0.1); --text-secondary: rgba(255,255,255,0.72); min-height: calc(100vh - 160px); color: #f7f8fc; }
.storyline-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.storyline-header h2 { margin: 0.25rem 0 0; font-size: 1.7rem; letter-spacing: -0.02em; }
.storyline-tag { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--storyline-brand, #d4a84b); font-weight: 700; }
.storyline-header-actions { display: flex; align-items: center; gap: 0.55rem; }
.storyline-status { color: var(--text-secondary); font-size: 0.85rem; border: 1px solid var(--panel-border); border-radius: 999px; padding: 0.35rem 0.65rem; background: rgba(255,255,255,0.04); }
.storyline-error { margin-bottom: 0.75rem; color: #f9b6b6; font-size: 0.84rem; }

.storyline-grid { display: grid; grid-template-columns: 270px 1fr 320px; gap: 0.85rem; align-items: start; }
.storyline-panel, .storyline-canvas { border: 1px solid var(--panel-border); border-radius: 14px; background: var(--panel-bg); backdrop-filter: blur(16px); padding: 0.85rem; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.7rem; margin-bottom: 0.75rem; }
.panel-head h3 { margin: 0; font-size: 1rem; }
.panel-head span { color: var(--text-secondary); font-size: 0.8rem; }

.action { border: none; border-radius: 10px; padding: 0.48rem 0.72rem; font-weight: 700; cursor: pointer; color: #0a0f1c; background: linear-gradient(135deg, var(--storyline-brand, #d4a84b), #7ac9ff); }
.action.secondary { background: rgba(255,255,255,0.1); color: #e8ecf6; border: 1px solid var(--panel-border); }
.action.small { padding: 0.3rem 0.55rem; font-size: 0.74rem; border-radius: 8px; }

.scene-list { display: grid; gap: 0.45rem; }
.scene-row { width: 100%; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.03); border-radius: 10px; color: #f0f2fa; text-align: left; padding: 0.55rem 0.65rem; cursor: pointer; }
.scene-row.active { border-color: var(--storyline-accent, #264b8c); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08); }
.scene-row-top { display: flex; justify-content: space-between; font-size: 0.9rem; }
.scene-row-meta { margin-top: 0.3rem; color: var(--text-secondary); font-size: 0.74rem; }
.variables-panel { margin-top: 0.7rem; padding-top: 0.7rem; border-top: 1px solid var(--panel-border); }
.variables-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem; }
.variables-head h4 { margin: 0; font-size: 0.85rem; }
.variables-list { display: grid; gap: 0.45rem; }
.variable-row { display: grid; gap: 0.35rem; border: 1px solid var(--panel-border); border-radius: 10px; background: rgba(255,255,255,0.03); padding: 0.45rem; }
.variable-row input, .variable-row select { width: 100%; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(255,255,255,0.05); color: #f6f8ff; padding: 0.38rem 0.46rem; font-size: 0.78rem; }
.text-danger { border: none; background: transparent; color: #f6c2c2; cursor: pointer; font-size: 0.74rem; text-align: left; padding: 0; }

.storyline-canvas .canvas-flow { display: grid; gap: 0.65rem; max-height: calc(100vh - 290px); overflow: auto; padding-right: 0.2rem; }
.flow-node { border: 1px solid var(--panel-border); border-radius: 12px; padding: 0.7rem; background: rgba(255,255,255,0.03); }
.flow-node.active { border-color: var(--storyline-brand, #d4a84b); }
.flow-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; }
.flow-title { border: none; background: transparent; color: #f6f8ff; font-size: 0.95rem; font-weight: 700; cursor: pointer; padding: 0; }
.pill { border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.72rem; background: rgba(122,201,255,0.16); color: #bfe6ff; border: 1px solid rgba(122,201,255,0.4); }
.flow-node p { margin: 0 0 0.45rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.45; }
.flow-links { display: grid; gap: 0.25rem; }
.link-row { font-size: 0.76rem; color: rgba(232,236,246,0.82); border: 1px solid var(--panel-border); border-radius: 8px; padding: 0.28rem 0.45rem; background: rgba(255,255,255,0.02); }
.muted { color: var(--text-secondary); font-size: 0.8rem; }

.properties { display: grid; gap: 0.7rem; }
.properties label { display: grid; gap: 0.3rem; font-size: 0.8rem; color: var(--text-secondary); }
.properties input, .properties textarea, .properties select { width: 100%; border: 1px solid var(--panel-border); border-radius: 10px; background: rgba(255,255,255,0.04); color: #f6f8ff; padding: 0.5rem 0.58rem; font-size: 0.9rem; }

.branching { border-top: 1px solid var(--panel-border); padding-top: 0.7rem; }
.branching h4 { margin: 0 0 0.45rem; font-size: 0.85rem; }
.branch-controls { display: grid; gap: 0.45rem; margin-bottom: 0.45rem; }
.branch-list { display: grid; gap: 0.35rem; }
.branch-row { display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(255,255,255,0.03); padding: 0.35rem 0.48rem; font-size: 0.78rem; }
.branch-row button { border: none; background: transparent; color: #f6c2c2; cursor: pointer; }
.triggers { border-top: 1px solid var(--panel-border); padding-top: 0.7rem; }
.triggers-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem; }
.triggers-head h4 { margin: 0; font-size: 0.85rem; }
.trigger-list { display: grid; gap: 0.55rem; }
.trigger-row { border: 1px solid var(--panel-border); border-radius: 10px; background: rgba(255,255,255,0.03); padding: 0.5rem; display: grid; gap: 0.45rem; }
.trigger-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.trigger-actions { display: flex; justify-content: flex-end; }
.conditions { border-top: 1px solid var(--panel-border); padding-top: 0.45rem; display: grid; gap: 0.4rem; }
.conditions-head { display: flex; align-items: center; justify-content: space-between; }
.conditions-head h5 { margin: 0; font-size: 0.76rem; }
.condition-list { display: grid; gap: 0.35rem; }
.condition-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.3rem; align-items: center; }
.runtime-preview { border-top: 1px solid var(--panel-border); padding-top: 0.7rem; display: grid; gap: 0.45rem; }
.runtime-head { display: flex; align-items: center; justify-content: space-between; }
.runtime-head h4 { margin: 0; font-size: 0.85rem; }
.runtime-scene { font-size: 0.8rem; color: var(--text-secondary); }
.runtime-events { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.runtime-vars { display: grid; gap: 0.35rem; }
.runtime-vars label { display: grid; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary); }
.runtime-vars input { width: 100%; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(255,255,255,0.05); color: #f6f8ff; padding: 0.36rem 0.45rem; font-size: 0.78rem; }
.runtime-log { border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(255,255,255,0.02); padding: 0.4rem; display: grid; gap: 0.28rem; max-height: 160px; overflow-y: auto; }
.runtime-log-row { font-size: 0.74rem; color: rgba(232,236,246,0.84); line-height: 1.35; }

@media (max-width: 1200px) {
  .storyline-grid { grid-template-columns: 1fr; }
  .storyline-header-actions { width: 100%; justify-content: space-between; }
}
`;
