import { useEffect, useCallback, useMemo, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { BlockPalette } from './BlockPalette';
import { EditorCanvas } from './EditorCanvas';
import { StarField } from '../space/StarField';
import type { BlockType } from '../../types/blocks.types';
import type { Json } from '../../types/database.types';
import type { CourseTheme } from '../../types/courseTheme.types';
import { courseService } from '../../services/course.service';
import {
  applyThemeToSettings,
  defaultCourseTheme,
  getCourseThemeVars,
  parseCourseSettings,
} from '../../utils/courseTheme';
import { exportCourseAsScormPackage } from '../../utils/scormExport';
import {
  applyShareToSettings,
  defaultCourseShareSettings,
  generateShareToken,
  parseCourseShareSettings,
  type CourseShareSettings,
} from '../../utils/courseShare';
import { ArrowLeft, Clapperboard, Copy, Download, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseEditorProps {
  courseId: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const [courseTitle, setCourseTitle] = useState('Untitled Course');
  const [courseTheme, setCourseTheme] = useState<CourseTheme>(defaultCourseTheme);
  const [rawCourseSettings, setRawCourseSettings] = useState<Json>({});
  const [isThemeSaving, setIsThemeSaving] = useState(false);
  const [isShareSaving, setIsShareSaving] = useState(false);
  const [isExportingScorm, setIsExportingScorm] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareSettings, setShareSettings] = useState<CourseShareSettings>(defaultCourseShareSettings);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [shareViewCount, setShareViewCount] = useState(0);
  const [isShareStatsLoading, setIsShareStatsLoading] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [isThemeDirty, setIsThemeDirty] = useState(false);
  const {
    blocks,
    selectedBlockId,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    error,
    loadCourse,
    addBlock,
    updateBlock,
    updateBlockSettings,
    deleteBlock,
    reorderBlocks,
    duplicateBlock,
    toggleHidden,
    insertBelow,
    selectBlock,
    saveChanges,
  } = useEditorStore();
  const navigate = useNavigate();

  // Load course on mount
  useEffect(() => {
    loadCourse(courseId);
  }, [courseId, loadCourse]);

  useEffect(() => {
    let isMounted = true;
    setThemeLoaded(false);
    setThemeError(null);

    const loadTheme = async () => {
      try {
        const course = await courseService.getCourse(courseId);
        if (!isMounted || !course) return;
        setCourseTitle(course.title || 'Untitled Course');
        setRawCourseSettings(course.settings);
        setCourseTheme(parseCourseSettings(course.settings).theme);
        setShareSettings(parseCourseShareSettings(course.settings));
        setIsThemeDirty(false);
      } catch (themeLoadError) {
        if (!isMounted) return;
        setThemeError((themeLoadError as Error).message);
      } finally {
        if (isMounted) setThemeLoaded(true);
      }
    };

    loadTheme();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!themeLoaded || !isThemeDirty) return;

    const timer = setTimeout(async () => {
      setIsThemeSaving(true);
      const nextSettings = applyThemeToSettings(rawCourseSettings, courseTheme);

      try {
        const updatedCourse = await courseService.updateCourse(courseId, { settings: nextSettings });
        setRawCourseSettings(updatedCourse.settings);
        setThemeError(null);
        setIsThemeDirty(false);
      } catch (themeSaveError) {
        setThemeError((themeSaveError as Error).message);
      } finally {
        setIsThemeSaving(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [courseId, courseTheme, isThemeDirty, rawCourseSettings, themeLoaded]);

  useEffect(() => {
    let active = true;
    setIsShareStatsLoading(true);
    const loadShareViewCount = async () => {
      try {
        const count = await courseService.getShareViewCount(courseId);
        if (!active) return;
        setShareViewCount(count);
      } catch {
        if (!active) return;
        setShareViewCount(0);
      } finally {
        if (active) setIsShareStatsLoading(false);
      }
    };
    loadShareViewCount();
    return () => {
      active = false;
    };
  }, [courseId, shareSettings.published, shareSettings.token]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveChanges();
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, saveChanges, blocks]);

  const handleAddBlock = useCallback((type: BlockType) => {
    const insertPosition = selectedBlockId
      ? blocks.findIndex(b => b.id === selectedBlockId) + 1
      : blocks.length;
    addBlock(type, insertPosition);
  }, [selectedBlockId, blocks, addBlock]);

  const updateTheme = useCallback((patch: Partial<CourseTheme>) => {
    setCourseTheme((prev) => ({ ...prev, ...patch }));
    setIsThemeDirty(true);
  }, []);

  const statusText = useMemo(() => {
    if (isSaving || isThemeSaving || isShareSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (lastSavedAt) {
      const date = new Date(lastSavedAt);
      return `Saved ${date.toLocaleTimeString()}`;
    }
    return 'Ready';
  }, [isSaving, hasUnsavedChanges, isThemeSaving, isShareSaving, lastSavedAt]);

  const themeVars = useMemo(() => getCourseThemeVars(courseTheme), [courseTheme]);
  const shareUrl = useMemo(
    () => (shareSettings.token ? `${window.location.origin}/share/${shareSettings.token}` : ''),
    [shareSettings.token]
  );

  const handleExportScorm = useCallback(() => {
    try {
      setIsExportingScorm(true);
      setExportError(null);
      exportCourseAsScormPackage({
        courseId,
        courseTitle,
        blocks,
        theme: courseTheme,
      });
    } catch (exportScormError) {
      setExportError((exportScormError as Error).message);
    } finally {
      setIsExportingScorm(false);
    }
  }, [blocks, courseId, courseTheme, courseTitle]);

  const persistShareSettings = useCallback(async (nextSharePatch: Partial<CourseShareSettings>): Promise<boolean> => {
    const nextShare = {
      ...shareSettings,
      ...nextSharePatch,
    };
    const settingsWithTheme = applyThemeToSettings(rawCourseSettings, courseTheme);
    const nextSettings = applyShareToSettings(settingsWithTheme, nextShare);

    setIsShareSaving(true);
    try {
      const updatedCourse = await courseService.updateCourse(courseId, { settings: nextSettings });
      setRawCourseSettings(updatedCourse.settings);
      setShareSettings(parseCourseShareSettings(updatedCourse.settings));
      setShareError(null);
      return true;
    } catch (shareSaveError) {
      setShareError((shareSaveError as Error).message);
      return false;
    } finally {
      setIsShareSaving(false);
    }
  }, [courseId, courseTheme, rawCourseSettings, shareSettings]);

  const handleTogglePublish = useCallback(async () => {
    setCopiedShareLink(false);
    if (shareSettings.published) {
      await persistShareSettings({
        published: false,
        token: null,
      });
      return;
    }

    await persistShareSettings({
      published: true,
      token: generateShareToken(),
    });
  }, [persistShareSettings, shareSettings]);

  const handleCopyShareLink = useCallback(async () => {
    setCopiedShareLink(false);
    const token = shareSettings.token || generateShareToken();

    if (!shareSettings.published) {
      const saved = await persistShareSettings({ published: true, token });
      if (!saved) return;
    } else if (!shareSettings.token) {
      const saved = await persistShareSettings({ token });
      if (!saved) return;
    }

    const nextUrl = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(nextUrl);
      setCopiedShareLink(true);
      setShareError(null);
    } catch (copyError) {
      setShareError(`Unable to copy link. ${String(copyError)}`);
    }
  }, [persistShareSettings, shareSettings]);

  const handleRegenerateShareLink = useCallback(async () => {
    setCopiedShareLink(false);
    const nextToken = generateShareToken();
    const saved = await persistShareSettings({
      published: true,
      token: nextToken,
    });
    if (!saved) return;

    const nextUrl = `${window.location.origin}/share/${nextToken}`;
    try {
      await navigator.clipboard.writeText(nextUrl);
      setCopiedShareLink(true);
      setShareError(null);
    } catch (copyError) {
      setShareError(`Unable to copy regenerated link. ${String(copyError)}`);
    }
  }, [persistShareSettings]);

  if (isLoading) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-card glass">
          <div className="spinner" />
          <p>Loading course...</p>
        </div>
        <style>{loadingStyles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-card glass">
          <div className="text-red-300 mb-3">Error: {error}</div>
          <button onClick={() => loadCourse(courseId)} className="primary">Retry</button>
        </div>
        <style>{loadingStyles}</style>
      </div>
    );
  }

  return (
    <div className="editor-shell" style={themeVars}>
      <div className="star-field" />
      <div className="nebula" />

      <header className="editor-nav">
        <div className="left">
          <button className="ghost" onClick={() => navigate('/')} aria-label="Back to home">
            <ArrowLeft size={18} />
            Back to Home
          </button>
          <span className="crumb">Course Editor</span>
        </div>
        <div className="right">
          <div className="status">
            <span className={`dot ${isSaving || isThemeSaving || isShareSaving ? 'saving' : hasUnsavedChanges ? 'pending' : 'saved'}`} />
            {statusText}
          </div>
          <button className="ghost" onClick={() => navigate(`/course/${courseId}/video-draft`)}>
            <Clapperboard size={16} />
            Video draft
          </button>
          <button className="ghost" onClick={handleExportScorm} disabled={isExportingScorm}>
            <Download size={16} />
            {isExportingScorm ? 'Exporting...' : 'Export SCORM'}
          </button>
          <button className="primary" onClick={() => saveChanges()} disabled={isSaving}>
            <Sparkles size={16} />
            Save now
          </button>
        </div>
      </header>

      <div className="editor-grid">
        <aside className="palette glass">
          <div className="theme-panel">
            <div className="theme-head">
              <div className="eyebrow">Course Theme</div>
              <div className="theme-status">{isThemeSaving ? 'Saving...' : isThemeDirty ? 'Unsaved' : 'Saved'}</div>
            </div>
            <label className="theme-row">
              Brand
              <div className="theme-color">
                <input
                  type="color"
                  value={courseTheme.brandColor}
                  onChange={(event) => updateTheme({ brandColor: event.target.value })}
                />
                <input
                  type="text"
                  value={courseTheme.brandColor}
                  onChange={(event) => updateTheme({ brandColor: event.target.value })}
                />
              </div>
            </label>
            <label className="theme-row">
              Accent
              <div className="theme-color">
                <input
                  type="color"
                  value={courseTheme.accentColor}
                  onChange={(event) => updateTheme({ accentColor: event.target.value })}
                />
                <input
                  type="text"
                  value={courseTheme.accentColor}
                  onChange={(event) => updateTheme({ accentColor: event.target.value })}
                />
              </div>
            </label>
            <label className="theme-row">
              Font
              <select
                value={courseTheme.fontFamily}
                onChange={(event) => updateTheme({ fontFamily: event.target.value })}
              >
                <option value='"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif'>DM Sans</option>
                <option value='"Cormorant Garamond", Georgia, serif'>Cormorant Garamond</option>
                <option value='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>System Sans</option>
              </select>
            </label>
            <label className="theme-row">
              Logo URL
              <input
                type="url"
                value={courseTheme.logoUrl}
                placeholder="https://..."
                onChange={(event) => updateTheme({ logoUrl: event.target.value })}
              />
            </label>
            {themeError && <div className="theme-error">{themeError}</div>}
            {exportError && <div className="theme-error">{exportError}</div>}
          </div>
          <div className="share-panel">
            <div className="theme-head">
              <div className="eyebrow">Publish</div>
              <div className="theme-status">{isShareSaving ? 'Saving...' : shareSettings.published ? 'Live' : 'Draft'}</div>
            </div>
            <div className="share-copy-row">
              <button className="ghost small" onClick={() => void handleTogglePublish()} disabled={isShareSaving}>
                {shareSettings.published ? 'Unpublish' : 'Publish'}
              </button>
              <button className="ghost small" onClick={() => void handleCopyShareLink()} disabled={isShareSaving}>
                <Copy size={14} />
                {copiedShareLink ? 'Copied' : 'Copy Link'}
              </button>
              <button className="ghost small" onClick={() => void handleRegenerateShareLink()} disabled={isShareSaving}>
                <RefreshCw size={14} />
                Regenerate
              </button>
              {shareSettings.published && shareUrl && (
                <a className="ghost small" href={shareUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />
                  Open
                </a>
              )}
            </div>
            <input
              type="text"
              className="share-url"
              value={shareUrl || 'Publish to generate a share URL'}
              readOnly
              aria-label="Share URL"
            />
            <div className="share-stats">Public views: {isShareStatsLoading ? '…' : shareViewCount}</div>
            {shareError && <div className="theme-error">{shareError}</div>}
          </div>
          <div className="palette-head">
            <div>
              <div className="eyebrow">Add block</div>
              <h2>Library</h2>
            </div>
            <div className="tip">Drag or click to insert</div>
          </div>
          <BlockPalette onAddBlock={handleAddBlock} />
        </aside>

        <section className="canvas glass" onClick={() => selectBlock(null)}>
          <EditorCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={selectBlock}
            onReorder={reorderBlocks}
            onUpdateBlock={updateBlock}
            onUpdateBlockSettings={updateBlockSettings}
            onDeleteBlock={deleteBlock}
            onDuplicate={duplicateBlock}
            onToggleHidden={toggleHidden}
            onInsertBelow={insertBelow}
          />
        </section>
      </div>

      <style>{editorStyles}</style>
    </div>
  );
}

const loadingStyles = `
.loading-page { position: relative; min-height: 100vh; background: #0B0D1A; display: grid; place-items: center; overflow: hidden; color: #FAFAFA; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
.glass { backdrop-filter: blur(18px); background: rgba(20,24,45,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
.loading-card { padding: 1.25rem 1.5rem; text-align: center; }
.spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #D4A84B; border-radius: 50%; margin: 0 auto 0.75rem; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.star-field { position: fixed; inset: 0; pointer-events: none; }
.star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
.star.bright { box-shadow: 0 0 4px 1px rgba(255,255,255,0.5); }
@keyframes twinkle { 0%,100%{opacity:0.25; transform:scale(1);} 50%{opacity:0.9; transform:scale(1.35);} }
.nebula { position: fixed; inset: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180,40,60,0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150,30,50,0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30,100,200,0.25) 0%, transparent 60%); }
`;

const editorStyles = `
.editor-shell { position: relative; min-height: 100vh; background: #0B0D1A; color: #FAFAFA; font-family: var(--course-font-family, 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif); }
.star-field { position: fixed; inset: 0; pointer-events: none; }
.star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
.star.bright { box-shadow: 0 0 4px 1px rgba(255,255,255,0.5); }
@keyframes twinkle { 0%,100%{opacity:0.25; transform:scale(1);} 50%{opacity:0.9; transform:scale(1.35);} }
.nebula { position: fixed; inset: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180,40,60,0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150,30,50,0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30,100,200,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0,180,220,0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0,220,255,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120,60,180,0.25) 0%, transparent 50%); }
.editor-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2.2rem; backdrop-filter: blur(12px); background: rgba(15,18,35,0.85); border-bottom: 1px solid rgba(255,255,255,0.05); }
.editor-nav .left { display: flex; align-items: center; gap: 1rem; }
.crumb { color: rgba(255,255,255,0.7); font-weight: 600; }
.ghost { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.7rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #fafafa; cursor: pointer; }
.ghost:hover { border-color: rgba(255,255,255,0.25); }
.editor-nav .right { display: flex; align-items: center; gap: 0.75rem; }
.status { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; color: rgba(255,255,255,0.8); }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.saving { background: #4ea3ff; box-shadow: 0 0 0 6px rgba(78,163,255,0.2); }
.dot.pending { background: var(--course-brand, #e6c162); box-shadow: 0 0 0 6px rgba(230,193,98,0.18); }
.dot.saved { background: #6cd68a; box-shadow: 0 0 0 6px rgba(108,214,138,0.18); }
.primary { display: inline-flex; align-items: center; gap: 0.4rem; background: linear-gradient(135deg, var(--course-accent, #264b8c), var(--course-brand, #d4a84b)); color: #0b0d1a; border: none; padding: 0.55rem 0.9rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: transform 0.15s ease, filter 0.15s ease; }
.primary:hover { transform: translateY(-1px); filter: brightness(1.05); }
.editor-grid { position: relative; z-index: 5; display: grid; grid-template-columns: 280px 1fr; gap: 1.1rem; padding: 1.1rem 2.2rem 2rem; }
.glass { backdrop-filter: blur(20px); background: rgba(20,24,45,0.78); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
.palette { padding: 1rem; position: sticky; top: 88px; height: calc(100vh - 110px); overflow-y: auto; }
.theme-panel { margin-bottom: 0.9rem; padding: 0.7rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 0.5rem; }
.share-panel { margin-bottom: 0.9rem; padding: 0.7rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 0.5rem; }
.theme-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.theme-status { font-size: 0.75rem; color: rgba(255,255,255,0.65); }
.theme-row { display: flex; flex-direction: column; gap: 0.28rem; color: rgba(255,255,255,0.82); font-size: 0.82rem; }
.theme-row input, .theme-row select { width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #f6f6fb; padding: 0.45rem 0.55rem; }
.share-url { width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.02); color: rgba(246,246,251,0.9); padding: 0.45rem 0.55rem; font-size: 0.78rem; }
.theme-color { display: grid; grid-template-columns: 40px 1fr; gap: 0.45rem; align-items: center; }
.theme-color input[type="color"] { padding: 0; height: 32px; border-radius: 8px; overflow: hidden; cursor: pointer; }
.theme-error { font-size: 0.75rem; color: #f8a7a7; line-height: 1.35; }
.share-copy-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.ghost.small { padding: 0.35rem 0.55rem; border-radius: 8px; font-size: 0.76rem; }
.share-stats { font-size: 0.78rem; color: rgba(255,255,255,0.72); }
.palette-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.palette-head h2 { margin: 0.15rem 0 0; font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: -0.01em; }
.eyebrow { color: var(--course-brand, #d4a84b); font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; }
.tip { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
.canvas { min-height: calc(100vh - 140px); padding: 1.25rem; }
@media (max-width: 960px) { .editor-grid { grid-template-columns: 1fr; } .palette { position: relative; height: auto; top: 0; } .editor-nav { padding: 1rem 1.25rem; } .editor-grid { padding: 1rem 1.25rem 1.5rem; } }
`;
