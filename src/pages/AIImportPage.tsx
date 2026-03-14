import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, FileUp, Sparkles, Wand2 } from 'lucide-react';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { aiCourseImportService } from '../services/aiCourseImport.service';
import { ImportWorkflowTeaser } from '../remotion/ImportWorkflowTeaser';
import { courseBlueprintConfigs, type CourseBlueprint } from '../utils/courseBlueprint';
import { parseImportedFile, parseTextInput } from '../utils/documentParsers';
import { generateStructuredOutline, getConfiguredAiPipelineEndpoint } from '../utils/aiOutline';

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;
const PREVIEW_FPS = 30;
const PREVIEW_DURATION = 6 * PREVIEW_FPS;

export function AIImportPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useOrionTheme();
  const [blueprint, setBlueprint] = useState<CourseBlueprint>('course');
  const [sourceText, setSourceText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedPreview, setExtractedPreview] = useState('');
  const [previewMeta, setPreviewMeta] = useState<{ kind: string; sections: number; warnings: string[] } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTestingPipeline, setIsTestingPipeline] = useState(false);
  const [pipelineTestResult, setPipelineTestResult] = useState<{
    source: 'remote' | 'fallback';
    sections: number;
    warning?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceCharacterCount = sourceText.trim().length;
  const activeConfig = courseBlueprintConfigs[blueprint];
  const blueprintLabel = useMemo(
    () => (blueprint === 'storyline' ? 'Interactive Storyline Build' : `${activeConfig.label} Build`),
    [activeConfig.label, blueprint]
  );
  const pipelineEndpoint = getConfiguredAiPipelineEndpoint();

  const handleFileChange = (nextFile: File | null) => {
    setSelectedFile(nextFile);
    setExtractedPreview('');
    setPreviewMeta(null);
    setPipelineTestResult(null);
    setError(null);
  };

  const handleExtractPreview = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setError(null);
    try {
      const parsed = await parseImportedFile(selectedFile);
      setExtractedPreview(parsed.rawText.slice(0, 1400));
      setPreviewMeta({
        kind: parsed.kind,
        sections: parsed.sections.length,
        warnings: parsed.warnings,
      });
      setPipelineTestResult(null);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : 'Failed to extract preview text');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePipelineTest = async () => {
    setIsTestingPipeline(true);
    setError(null);
    setPipelineTestResult(null);

    try {
      const hasText = sourceText.trim().length > 0;
      if (!selectedFile && !hasText) {
        throw new Error('Add source text or upload a file before running pipeline test.');
      }

      const parsed = selectedFile
        ? await parseImportedFile(selectedFile)
        : parseTextInput(sourceText.trim(), 'Pipeline Test Input');

      const result = await generateStructuredOutline({
        document: parsed,
        preferredBlueprint: blueprint,
      });

      setPipelineTestResult({
        source: result.source,
        sections: result.outline.sections.length,
        warning: result.warning,
      });
    } catch (pipelineError) {
      setError(pipelineError instanceof Error ? pipelineError.message : 'Pipeline test failed');
    } finally {
      setIsTestingPipeline(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const hasText = sourceText.trim().length > 0;
      if (!selectedFile && !hasText) {
        throw new Error('Add source text or upload a file before generating.');
      }

      const createdCourse = selectedFile
        ? await aiCourseImportService.createCourseFromFile({
            file: selectedFile,
            blueprint,
            extraText: sourceText,
          })
        : await aiCourseImportService.createCourseFromText({
            sourceText: sourceText.trim(),
            blueprint,
          });

      navigate(`/course/${createdCourse.id}`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Failed to generate course from source');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`ai-import-page ${theme}`}>
      <SpaceScene />
      <nav className="nav">
        <div className="nav-left">
          <Link to="/app" className="logo" aria-label="Orion Home">
            <svg className="logo-icon" viewBox="0 0 32 36" fill="none">
              <circle cx="16" cy="3" r="2" fill="currentColor" />
              <circle cx="8" cy="10" r="3" fill="currentColor" />
              <circle cx="24" cy="10" r="2.5" fill="currentColor" />
              <circle cx="11" cy="18" r="2" fill="currentColor" />
              <circle cx="16" cy="18" r="2" fill="currentColor" />
              <circle cx="21" cy="18" r="2" fill="currentColor" />
              <circle cx="9" cy="32" r="2.5" fill="currentColor" />
              <circle cx="23" cy="32" r="3" fill="currentColor" />
            </svg>
            <span className="logo-text">ORION</span>
          </Link>
        </div>
        <div className="nav-center">
          <Link to="/app" className="nav-link">Dashboard</Link>
          <Link to="/courses" className="nav-link">Courses</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <main className="main">
        <section className="hero glass">
          <div className="hero-left">
            <div className="eyebrow">
              <Wand2 size={14} />
              AI Course Builder
            </div>
            <h1>Import source content and generate a working Orion course.</h1>
            <p>
              Upload PDF, DOCX, PPTX, TXT, or paste text. Orion drafts structure, blocks, and interactive flow
              so you can refine instead of starting from zero.
            </p>
            <div className="endpoint-status">
              {pipelineEndpoint ? 'Remote outline endpoint configured' : 'No remote endpoint configured (fallback mode)'}
            </div>
          </div>
          <button className="ghost" onClick={() => navigate('/app')}>
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
        </section>

        <section className="content-grid">
          <article className="panel glass">
            <h2>1. Choose output mode</h2>
            <div className="mode-grid">
              {(Object.keys(courseBlueprintConfigs) as CourseBlueprint[]).map((modeKey) => {
                const config = courseBlueprintConfigs[modeKey];
                return (
                  <button
                    key={modeKey}
                    className={`mode-card ${blueprint === modeKey ? 'active' : ''}`}
                    onClick={() => setBlueprint(modeKey)}
                    type="button"
                  >
                    <div className="mode-title">{config.label}</div>
                    <div className="mode-description">{config.helperText}</div>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel glass">
            <h2>2. Add source material</h2>
            <label className="file-input">
              <FileUp size={16} />
              <span>{selectedFile ? selectedFile.name : 'Upload source file'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="source-actions">
              <button
                className="ghost compact"
                type="button"
                onClick={handleExtractPreview}
                disabled={!selectedFile || isExtracting}
              >
                {isExtracting ? 'Extracting...' : 'Preview extracted text'}
              </button>
              {selectedFile && (
                <button className="ghost compact" type="button" onClick={() => handleFileChange(null)}>
                  Remove file
                </button>
              )}
            </div>
            {extractedPreview && (
              <div className="preview-box">
                <div className="preview-label">Extraction Preview</div>
                {previewMeta && (
                  <div className="preview-meta">
                    <span>{previewMeta.kind.toUpperCase()}</span>
                    <span>{previewMeta.sections} sections</span>
                  </div>
                )}
                <p>{extractedPreview}</p>
                {previewMeta?.warnings?.length ? (
                  <ul className="preview-warnings">
                    {previewMeta.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Paste notes, transcript, SOP, lesson plan, or script..."
              rows={9}
            />
            <div className="source-meta">
              <span>{sourceCharacterCount} chars pasted</span>
              <span>{activeConfig.label} target</span>
            </div>
          </article>

          <article className="panel glass">
            <h2>3. Generate and launch</h2>
            <div className="teaser-player">
              <Player
                component={ImportWorkflowTeaser}
                durationInFrames={PREVIEW_DURATION}
                fps={PREVIEW_FPS}
                compositionWidth={PREVIEW_WIDTH}
                compositionHeight={PREVIEW_HEIGHT}
                controls
                loop
                style={{ width: '100%', borderRadius: 14, overflow: 'hidden' }}
                inputProps={{
                  blueprintLabel,
                  brandColor: '#D4A84B',
                  accentColor: '#264B8C',
                }}
              />
            </div>
            <button className="primary" type="button" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={16} />
              {isGenerating ? 'Generating course...' : 'Generate course from source'}
            </button>
            <button className="ghost" type="button" onClick={handlePipelineTest} disabled={isTestingPipeline}>
              {isTestingPipeline ? 'Testing pipeline...' : 'Run pipeline test'}
            </button>
            {pipelineTestResult && (
              <div className={`pipeline-result ${pipelineTestResult.source}`}>
                <strong>{pipelineTestResult.source === 'remote' ? 'Remote pipeline active' : 'Fallback pipeline active'}</strong>
                <span>{pipelineTestResult.sections} outline section(s) produced.</span>
                {pipelineTestResult.warning ? <span>{pipelineTestResult.warning}</span> : null}
              </div>
            )}
            <p className="footnote">
              Generated courses open directly in Orion editor. Review content, styling, and quiz correctness before publishing.
            </p>
            {error && <div className="error">{error}</div>}
          </article>
        </section>
      </main>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.ai-import-page { --bg-primary: #0B0D1A; --bg-card: rgba(19, 23, 42, 0.8); --bg-card-solid: rgba(22, 28, 50, 0.95); --border-color: rgba(255,255,255,0.08); --border-active: rgba(255,255,255,0.24); --text-primary: #f9fbff; --text-secondary: rgba(235,239,250,0.72); --accent: #d4a84b; --accent-2: #6db9ff; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; background: #0b0d1a; color: var(--text-primary); font-family: var(--font-body); position: relative; overflow-x: hidden; }
.ai-import-page.light { --bg-primary: #E8F0F8; --bg-card: rgba(255,255,255,0.88); --bg-card-solid: rgba(255,255,255,0.95); --border-color: rgba(0,0,0,0.08); --border-active: rgba(0,0,0,0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.72); --accent: #b8942f; --accent-2: #3d7bc7; background: linear-gradient(180deg, #d9e8f7 0%, #ecf2f8 35%, #f7f9fc 100%); }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 120; padding: 1.1rem 2rem; display: flex; align-items: center; justify-content: space-between; }
.nav-left, .nav-right { flex: 1; display: flex; align-items: center; }
.nav-right { justify-content: flex-end; gap: 1rem; }
.nav-center { display: flex; align-items: center; gap: 1.6rem; }
.logo { display: inline-flex; align-items: center; gap: 0.72rem; text-decoration: none; color: var(--text-primary); }
.logo-icon { width: 32px; height: 32px; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-size: 1.2rem; letter-spacing: 0.23em; }
.nav-link { color: var(--text-secondary); text-decoration: none; font-size: 0.88rem; }
.nav-link:hover { color: var(--text-primary); }
.main { max-width: 1280px; margin: 0 auto; padding: 6.6rem 1.2rem 2.4rem; position: relative; z-index: 10; display: grid; gap: 1rem; }
.glass { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; backdrop-filter: blur(18px); }
.hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.2rem 1.25rem; background: var(--bg-card-solid); }
.hero-left h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.9rem, 3.2vw, 2.8rem); line-height: 1.06; letter-spacing: -0.03em; font-family: var(--font-display); font-weight: 500; }
.hero-left p { margin: 0; color: var(--text-secondary); max-width: 860px; line-height: 1.6; }
.endpoint-status { margin-top: 0.7rem; display: inline-flex; align-items: center; border: 1px solid var(--border-color); border-radius: 999px; padding: 0.25rem 0.6rem; color: var(--text-secondary); font-size: 0.76rem; }
.eyebrow { display: inline-flex; align-items: center; gap: 0.36rem; color: var(--accent); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
.content-grid { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr 1.05fr; }
.panel { padding: 0.92rem; display: grid; align-content: start; gap: 0.75rem; }
.panel h2 { margin: 0; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }
.mode-grid { display: grid; gap: 0.5rem; }
.mode-card { border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.02); color: var(--text-primary); text-align: left; padding: 0.65rem 0.72rem; cursor: pointer; transition: border-color 0.2s ease, transform 0.2s ease; }
.mode-card:hover { border-color: var(--border-active); transform: translateY(-1px); }
.mode-card.active { border-color: var(--accent-2); background: rgba(109, 185, 255, 0.12); }
.mode-title { font-weight: 700; font-size: 0.92rem; margin-bottom: 0.24rem; }
.mode-description { color: var(--text-secondary); font-size: 0.8rem; line-height: 1.45; }
.file-input { display: inline-flex; align-items: center; gap: 0.45rem; border: 1px dashed var(--border-active); border-radius: 12px; padding: 0.64rem 0.74rem; cursor: pointer; color: var(--text-secondary); background: rgba(255,255,255,0.02); }
.file-input input { display: none; }
.source-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.preview-box { border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 0.55rem 0.64rem; max-height: 180px; overflow: auto; }
.preview-label { color: var(--accent); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.2rem; }
.preview-meta { display: inline-flex; gap: 0.4rem; margin-bottom: 0.38rem; }
.preview-meta span { border: 1px solid var(--border-color); border-radius: 999px; padding: 0.18rem 0.45rem; font-size: 0.7rem; color: var(--text-secondary); }
.preview-box p { margin: 0; color: var(--text-secondary); font-size: 0.78rem; line-height: 1.45; white-space: pre-wrap; }
.preview-warnings { margin: 0.45rem 0 0; padding-left: 1rem; color: #ffc7c7; font-size: 0.74rem; line-height: 1.4; }
textarea { width: 100%; border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.03); color: var(--text-primary); padding: 0.68rem 0.72rem; resize: vertical; min-height: 170px; font: inherit; line-height: 1.5; }
textarea::placeholder { color: rgba(180,190,214,0.7); }
.source-meta { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.78rem; }
.teaser-player { border-radius: 14px; overflow: hidden; border: 1px solid var(--border-color); background: #0f1426; }
.primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.42rem; border: none; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0c1020; font-weight: 800; font-size: 0.9rem; padding: 0.72rem 0.92rem; cursor: pointer; }
.primary:disabled { opacity: 0.72; cursor: not-allowed; }
.ghost { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255,255,255,0.04); color: var(--text-primary); padding: 0.45rem 0.7rem; cursor: pointer; }
.ghost.compact { font-size: 0.8rem; padding: 0.35rem 0.55rem; color: var(--text-secondary); }
.footnote { margin: 0; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.45; }
.pipeline-result { border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255,255,255,0.03); padding: 0.52rem 0.6rem; display: grid; gap: 0.2rem; font-size: 0.8rem; color: var(--text-secondary); }
.pipeline-result.remote { border-color: rgba(109,185,255,0.6); background: rgba(109,185,255,0.12); }
.pipeline-result.fallback { border-color: rgba(255,176,122,0.6); background: rgba(255,176,122,0.11); }
.error { border: 1px solid rgba(255, 160, 160, 0.55); color: #ffc7c7; border-radius: 10px; background: rgba(170, 35, 35, 0.16); padding: 0.55rem 0.62rem; font-size: 0.82rem; }
@media (max-width: 1120px) { .content-grid { grid-template-columns: 1fr; } .nav-center { display: none; } .hero { flex-direction: column; } }
`;
