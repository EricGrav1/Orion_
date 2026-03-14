import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { blockService } from '../services/block.service';
import { courseService } from '../services/course.service';
import type { Block, Course } from '../types/database.types';
import type { BaseBlockSettings, BlockContentMap, BlockType, EditorBlock, QuizContent } from '../types/blocks.types';
import { renderBlock } from '../components/editor/blocks/renderBlock';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { getBlockContainerStyle, getBlockSurfaceStyle } from '../utils/blockStyles';
import { getCourseThemeVars, parseCourseSettings } from '../utils/courseTheme';

interface LoaderState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type AnyBlockContent = BlockContentMap[BlockType];

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateShareSessionId(): string {
  const key = 'orion-share-session-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = createSessionId();
  localStorage.setItem(key, next);
  return next;
}

function toEditorBlock(block: Block): EditorBlock {
  return {
    id: block.id,
    course_id: block.course_id,
    type: block.type as BlockType,
    content: block.content as unknown as AnyBlockContent,
    settings: block.settings as unknown as BaseBlockSettings,
    order: block.order,
    created_at: block.created_at,
  } as EditorBlock;
}

export function LearnerView() {
  const { courseId, shareToken } = useParams<{ courseId?: string; shareToken?: string }>();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useOrionTheme();
  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<LoaderState<Course>>({ data: null, loading: true, error: null });
  const [blocks, setBlocks] = useState<LoaderState<Block[]>>({ data: null, loading: true, error: null });
  const [progress, setProgress] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [token, setToken] = useState<string | null>(null);
  const reviewMode = searchParams.get('review') === '1' || searchParams.get('review') === 'true';
  const isPublicShare = Boolean(shareToken && !courseId);
  const trackedQuizResultsRef = useRef<Set<string>>(new Set());
  const shareSessionId = useMemo(
    () => (isPublicShare ? getOrCreateShareSessionId() : null),
    [isPublicShare]
  );

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!courseId && !shareToken) return;
      setCourse((prev) => ({ ...prev, loading: true, error: null }));
      setBlocks((prev) => ({ ...prev, loading: true, error: null }));
      try {
        let resolvedCourse: Course | null = null;
        if (shareToken) {
          resolvedCourse = await courseService.getPublishedCourseByShareToken(shareToken);
        } else if (courseId) {
          resolvedCourse = await courseService.getCourse(courseId);
        }

        if (!resolvedCourse) {
          throw new Error('Course not found');
        }

        const b = await blockService.getBlocksByCourse(resolvedCourse.id);
        setCourse({ data: resolvedCourse, loading: false, error: null });
        setBlocks({ data: b, loading: false, error: null });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load course';
        setCourse({ data: null, loading: false, error: message });
        setBlocks({ data: null, loading: false, error: message });
      }
    };
    load();
  }, [courseId, shareToken]);

  useEffect(() => {
    if (!isPublicShare || !shareToken || !course.data?.id) return;

    const sessionId = shareSessionId;
    if (!sessionId) return;
    const viewedKey = `share-viewed-${shareToken}-${sessionId}`;
    if (sessionStorage.getItem(viewedKey) === '1') return;

    courseService
      .trackShareView(course.data.id, shareToken, sessionId)
      .then(() => sessionStorage.setItem(viewedKey, '1'))
      .catch(() => {});
  }, [course.data?.id, isPublicShare, shareSessionId, shareToken]);

  const visibleBlocks = useMemo(
    () =>
      (blocks.data ?? [])
        .map(toEditorBlock)
        .filter((b) => !b.settings.hidden)
        .sort((a, b) => a.order - b.order),
    [blocks.data]
  );
  const courseTheme = useMemo(
    () => parseCourseSettings(course.data?.settings ?? {}).theme,
    [course.data?.settings]
  );
  const courseThemeVars = useMemo(() => getCourseThemeVars(courseTheme), [courseTheme]);

  const pct = visibleBlocks.length === 0 ? 0 : Math.round(((progress + 1) / visibleBlocks.length) * 100);

  useEffect(() => {
    const progressKey = course.data?.id || courseId || shareToken;
    if (!progressKey) return;
      const raf = window.requestAnimationFrame(() => {
        if (visibleBlocks.length === 0) {
          setProgress(0);
          return;
        }
        const seen = Number(localStorage.getItem(`progress-${progressKey}`) || 0);
        setProgress(Math.min(seen, visibleBlocks.length - 1));

        if (isPublicShare && shareToken && course.data?.id && shareSessionId && seen > 0) {
          const resumeKey = `share-resume-${shareToken}-${shareSessionId}`;
          if (!sessionStorage.getItem(resumeKey)) {
            const cappedSeen = Math.min(seen, visibleBlocks.length - 1);
            void courseService
              .trackShareResume(course.data.id, shareToken, shareSessionId, {
                progress_index: cappedSeen,
                total_blocks: visibleBlocks.length,
                progress_percent: Math.round(((cappedSeen + 1) / visibleBlocks.length) * 100),
              })
              .then(() => sessionStorage.setItem(resumeKey, '1'))
              .catch(() => {});
          }
        }
      });
    return () => window.cancelAnimationFrame(raf);
  }, [visibleBlocks.length, course.data?.id, courseId, isPublicShare, shareSessionId, shareToken]);

  const markNext = () => {
    const progressKey = course.data?.id || courseId || shareToken;
    if (!progressKey) return;
    if (visibleBlocks.length === 0) return;
    const next = Math.min(progress + 1, visibleBlocks.length - 1);
    setProgress(next);
    localStorage.setItem(`progress-${progressKey}`, String(next));

    if (!isPublicShare || !shareToken || !course.data?.id || !shareSessionId) return;
    if (next < visibleBlocks.length - 1) return;

    const completionKey = `share-complete-${shareToken}-${shareSessionId}`;
    if (sessionStorage.getItem(completionKey) === '1') return;

    void courseService
      .trackShareCompletion(course.data.id, shareToken, shareSessionId, {
        progress_index: next,
        total_blocks: visibleBlocks.length,
        progress_percent: 100,
      })
      .then(() => sessionStorage.setItem(completionKey, '1'))
      .catch(() => {});
  };

  const copyLink = () => {
    const resolvedCourseId = course.data?.id || courseId;
    if (!resolvedCourseId) return;
    const t = token || `rv-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setToken(t);
    const url = `${window.location.origin}/learn/${resolvedCourseId}?token=${t}&review=1`;
    navigator.clipboard?.writeText(url).catch(() => {});
  };

  if (course.loading || blocks.loading) {
    return <Centered message="Loading course..." />;
  }

  if (course.error || blocks.error || !course.data) {
    return <Centered message={`Error loading course: ${course.error || blocks.error}`} />;
  }

  return (
    <div className={`learn-shell ${theme}`} style={courseThemeVars}>
      <SpaceScene />

      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
        <div className="nav-left">
          <Link to={isPublicShare ? '/' : '/app'} className="logo" aria-label="Orion Home">
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
          <Link to={isPublicShare ? '/' : '/app'} className="nav-link">{isPublicShare ? 'Home' : 'Dashboard'}</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <a className="skip-link" href="#learn-main">Skip to content</a>

      <header className={`learn-controls ${mounted ? 'mounted' : ''}`}>
        <div className="controls-left">
          <div className="crumb">{course.data.title}</div>
          <div className="crumb-sub">
            {reviewMode ? 'Review playback' : isPublicShare ? 'Shared learner playback' : 'Learner playback'}
          </div>
        </div>
        <div className="controls-right">
          <div className="pill">Progress {pct}%</div>
          <button className="ghost" onClick={markNext}>Next</button>
          {!isPublicShare && (
            <button className="ghost" onClick={copyLink}>{token ? 'Link copied' : 'Copy review link'}</button>
          )}
          {reviewMode && <span className="pill review">Review mode</span>}
          {isPublicShare && <span className="pill review">Shared link</span>}
        </div>
      </header>

      <main id="learn-main" className={`learn-main ${mounted ? 'mounted' : ''}`}>
        {visibleBlocks.length === 0 ? (
          <InlineMessage message="No content yet." />
        ) : (
          visibleBlocks.map((block, idx) => (
            <section
              key={block.id}
              className={`learn-block ${idx === progress ? 'active' : ''}`}
              style={{ ...getBlockContainerStyle(block.settings), ...getBlockSurfaceStyle(block.settings) }}
            >
              <div className="block-row">
                <div className="block-body">
                  {block.type === 'quiz' ? (
                    <LearnerQuiz
                      content={block.content as unknown as QuizContent}
                      answers={answers[block.id] || []}
                      setAnswers={(vals) => setAnswers(prev => ({ ...prev, [block.id]: vals }))}
                      onFirstGrade={(isCorrect) => {
                        if (!isPublicShare || !shareToken || !course.data?.id || !shareSessionId) return;
                        const quizKey = `${shareToken}-${shareSessionId}-${block.id}`;
                        if (trackedQuizResultsRef.current.has(quizKey)) return;
                        trackedQuizResultsRef.current.add(quizKey);
                        void courseService.trackShareQuizResult(course.data.id, shareToken, shareSessionId, {
                          block_id: block.id,
                          pass: isCorrect,
                        }).catch(() => {});
                      }}
                    />
                  ) : (
                    renderBlock(block, { isSelected: false, onChange: () => {} })
                  )}
                </div>
                {reviewMode && course.data?.id && (
                  <CommentPane courseId={course.data.id} blockId={block.id} />
                )}
              </div>
            </section>
          ))
        )}
      </main>

      <style>{styles}</style>
    </div>
  );
}

function InlineMessage({ message }: { message: string }) {
  return (
    <div className="inline-message">
      <div className="inline-card">
        <p>{message}</p>
      </div>
    </div>
  );
}

function Centered({ message }: { message: string }) {
  const { theme } = useOrionTheme();

  return (
    <div className={`centered ${theme}`}>
      <SpaceScene />
      <div className="card glass">
        <p>{message}</p>
      </div>
      <style>{`
        .centered { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.6); --text-muted: rgba(255, 255, 255, 0.4); --accent: #D4A84B; --accent-hover: #C49A3D; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; display: grid; place-items: center; padding: 6rem 1.5rem 3rem; background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-body); position: relative; overflow-x: hidden; }
        .centered.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; --accent-hover: #A8841F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
        .centered.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .centered.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.35 !important; }
        .centered.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
        .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
        .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
        .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
        @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
        .sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
        .centered.light .sun { opacity: 0.7; background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%); box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05); animation: sunPulse 8s ease-in-out infinite; }
        @keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
        .centered.light .sun-rays { opacity: 0.5; background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg); animation: sunRaysRotate 120s linear infinite; }
        @keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .glass { position: relative; z-index: 10; }
        .card { padding: 1rem 1.25rem; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); max-width: 560px; width: 100%; }
        .card p { margin: 0; color: var(--text-primary); line-height: 1.6; }
      `}</style>
    </div>
  );
}

function LearnerQuiz({
  content,
  answers,
  setAnswers,
  onFirstGrade,
}: {
  content: QuizContent;
  answers: string[];
  setAnswers: (ids: string[]) => void;
  onFirstGrade?: (isCorrect: boolean) => void;
}) {
  const { options = [], allowMultiple, question, explanation } = content;
  const toggle = (id: string) => {
    if (allowMultiple) {
      setAnswers(answers.includes(id) ? answers.filter(x => x !== id) : [...answers, id]);
    } else {
      setAnswers([id]);
    }
  };
  const graded = answers.length > 0;
  const isCorrect = graded && options.every(opt => opt.correct === answers.includes(opt.id));
  const hasTrackedGrade = useRef(false);

  useEffect(() => {
    if (!graded) return;
    if (hasTrackedGrade.current) return;
    hasTrackedGrade.current = true;
    onFirstGrade?.(isCorrect);
  }, [graded, isCorrect, onFirstGrade]);

  return (
    <div className="quiz-learner">
      <div className="question">{question}</div>
      <div className="options">
        {options.map((opt) => {
          const selected = answers.includes(opt.id);
          const stateClass = graded
            ? opt.correct
              ? 'correct'
              : selected
              ? 'incorrect'
              : ''
            : '';
          return (
            <button
              key={opt.id}
              className={`opt ${selected ? 'selected' : ''} ${stateClass}`}
              onClick={() => toggle(opt.id)}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <div className="foot">
        <span className={`pill ${graded ? (isCorrect ? 'pill-good' : 'pill-bad') : ''}`}>
          {graded ? (isCorrect ? 'Correct' : 'Check answers') : 'Select answer'}
        </span>
        {graded && explanation && <span className="explanation">{explanation}</span>}
      </div>
      <style>{`
        .quiz-learner { display: flex; flex-direction: column; gap: 0.5rem; }
        .question { font-weight: 700; font-size: 1.05rem; }
        .options { display: flex; flex-direction: column; gap: 0.4rem; }
        .opt { text-align: left; padding: 0.55rem 0.7rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); color: #f6f6fb; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
        .opt.selected { border-color: rgba(212,168,75,0.7); background: rgba(212,168,75,0.1); }
        .opt.correct { border-color: rgba(108,214,138,0.9); background: rgba(108,214,138,0.15); }
        .opt.incorrect { border-color: rgba(255,128,128,0.8); background: rgba(255,128,128,0.12); }
        .foot { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .pill { padding: 0.3rem 0.65rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #f6f6fb; font-weight: 700; }
        .pill-good { border-color: rgba(108,214,138,0.9); background: rgba(108,214,138,0.15); }
        .pill-bad { border-color: rgba(255,128,128,0.8); background: rgba(255,128,128,0.12); }
        .explanation { color: rgba(255,255,255,0.8); }
      `}</style>
    </div>
  );
}

function CommentPane({ courseId, blockId }: { courseId: string; blockId: string }) {
  const storageKey = `comments-${courseId}-${blockId}`;
  const [text, setText] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; text: string; ts: number }>>(() => {
    const existing = localStorage.getItem(storageKey);
    if (!existing) return [];
    try {
      const parsed = JSON.parse(existing) as unknown;
      return Array.isArray(parsed) ? (parsed as Array<{ id: string; text: string; ts: number }>) : [];
    } catch {
      return [];
    }
  });

  const add = () => {
    if (!text.trim()) return;
    const next = [...comments, { id: `${Date.now()}`, text: text.trim(), ts: Date.now() }];
    setComments(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setText('');
  };

  return (
    <aside className="comments">
      <div className="c-head">Comments</div>
      <div className="c-list">
        {comments.length === 0 && <div className="c-empty">No comments yet</div>}
        {comments.map((c) => (
          <div key={c.id} className="c-item">
            <div className="c-text">{c.text}</div>
            <div className="c-meta">{new Date(c.ts).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <textarea
        className="c-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Leave a comment..."
      />
      <button className="ghost full" onClick={add}>Add comment</button>
      <style>{`
        .comments { min-width: 220px; max-width: 280px; border-left: 1px solid var(--border-color); padding-left: 0.8rem; margin-left: 0.8rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .c-head { font-weight: 700; font-size: 0.95rem; }
        .c-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 220px; overflow-y: auto; }
        .c-item { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.45rem 0.55rem; background: rgba(255,255,255,0.03); }
        .c-text { color: var(--text-primary); line-height: 1.5; }
        .c-meta { color: var(--text-muted); font-size: 0.75rem; }
        .c-empty { color: var(--text-secondary); font-size: 0.9rem; }
        .c-input { width: 100%; min-height: 70px; border-radius: 12px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.04); color: var(--text-primary); padding: 0.45rem 0.55rem; }
        .ghost.full { width: 100%; text-align: center; }
        @media (max-width: 860px) { .comments { max-width: none; min-width: 100%; border-left: none; padding-left: 0; margin-left: 0; } }
      `}</style>
    </aside>
  );
}

const styles = `
.learn-shell { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --bg-card-solid: rgba(25, 30, 55, 0.95); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.6); --text-muted: rgba(255, 255, 255, 0.4); --accent: #D4A84B; --accent-hover: #C49A3D; --star-blue: #B4D4FF; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; min-height: 100vh; padding-top: 5.25rem; background: var(--bg-primary); color: var(--text-primary); font-family: var(--course-font-family, var(--font-body)); overflow-x: hidden; }
.learn-shell.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --bg-card-solid: rgba(255, 255, 255, 0.92); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; --accent-hover: #A8841F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
.learn-shell a:focus-visible,
.learn-shell button:focus-visible,
.learn-shell input:focus-visible,
.learn-shell select:focus-visible,
.learn-shell textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: 2px;
}
.skip-link { position: fixed; left: -999px; top: 1rem; z-index: 120; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-card-solid); color: var(--text-primary); padding: 0.55rem 0.8rem; text-decoration: none; font-weight: 800; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.skip-link:focus { left: 1rem; }
.learn-shell.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
.learn-shell.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.35 !important; }
.learn-shell.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
.star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
.star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
@keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
.nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
@keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
.sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
.learn-shell.light .sun { opacity: 0.7; background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%); box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05); animation: sunPulse 8s ease-in-out infinite; }
@keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
.learn-shell.light .sun-rays { opacity: 0.5; background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg); animation: sunRaysRotate 120s linear infinite; }
@keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 2.4rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
.nav.mounted { opacity: 1; transform: translateY(0); }
.nav-left { flex: 1; }
.logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text-primary); }
.logo-icon { width: 32px; height: 32px; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-size: 1.25rem; font-weight: 400; letter-spacing: 0.25em; }
.nav-center { display: flex; align-items: center; gap: 2.5rem; }
.nav-link { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s ease; letter-spacing: 0.02em; }
.nav-link:hover { color: var(--text-primary); }
.nav-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 1.5rem; }
.theme-toggle { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 50%; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
.theme-toggle:hover { border-color: var(--border-active); color: var(--text-primary); }
.theme-toggle svg { width: 18px; height: 18px; }
.nav-time { font-size: 0.75rem; color: var(--text-muted); letter-spacing: 0.02em; }
@media (max-width: 900px) { .nav-center, .nav-time { display: none; } }
.learn-controls { position: sticky; top: 4.75rem; z-index: 80; width: calc(100% - 2.5rem); max-width: 980px; margin: 0 auto; padding: 0.85rem 1rem; border-radius: 16px; border: 1px solid var(--border-color); background: var(--bg-card-solid); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); display: flex; align-items: center; justify-content: space-between; gap: 1rem; opacity: 0; transform: translateY(-6px); transition: opacity 0.6s ease 0.12s, transform 0.6s ease 0.12s; }
.learn-controls.mounted { opacity: 1; transform: translateY(0); }
.controls-left { display: flex; flex-direction: column; gap: 0.1rem; }
.crumb { font-family: var(--font-display); font-size: 1.15rem; letter-spacing: -0.01em; }
.crumb-sub { font-size: 0.85rem; color: var(--text-secondary); }
.controls-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: flex-end; }
.pill { padding: 0.35rem 0.7rem; border-radius: 999px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-weight: 700; font-size: 0.85rem; }
.pill.review { background: rgba(212,168,75,0.14); border-color: var(--course-brand, #d4a84b); color: var(--text-primary); }
.ghost { padding: 0.5rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-primary); cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease; }
.ghost:hover { transform: translateY(-1px); border-color: var(--border-active); background: rgba(255,255,255,0.07); }
.learn-shell.light .ghost { background: rgba(0,0,0,0.02); }
.learn-shell.light .ghost:hover { background: rgba(0,0,0,0.04); }
.learn-main { position: relative; z-index: 10; max-width: 980px; margin: 1rem auto 3rem; padding: 0 1.25rem; display: flex; flex-direction: column; gap: 1rem; opacity: 0; transform: translateY(14px); transition: opacity 0.8s ease 0.18s, transform 0.8s ease 0.18s; }
.learn-main.mounted { opacity: 1; transform: translateY(0); }
.inline-message { display: grid; place-items: center; padding: 2.5rem 0; }
.inline-card { max-width: 560px; width: 100%; border-radius: 16px; border: 1px solid var(--border-color); background: var(--bg-card); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); padding: 1rem 1.1rem; text-align: center; }
.inline-card p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.learn-block { padding: 1rem 1.1rem; border-radius: 16px; border: 1px solid var(--border-color); background: var(--bg-card); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.learn-block.active { border-color: var(--course-brand, #d4a84b); box-shadow: 0 16px 42px rgba(0,0,0,0.28); }
.block-row { display: flex; gap: 1rem; align-items: flex-start; }
.block-body { flex: 1; }
@media (max-width: 860px) { .block-row { flex-direction: column; } .learn-controls { top: 4.25rem; } }
`;
