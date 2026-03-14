import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { blockService } from '../services/block.service';
import { courseService } from '../services/course.service';
import type { Block, Course } from '../types/database.types';
import type { BaseBlockSettings, BlockContentMap, BlockType, EditorBlock } from '../types/blocks.types';
import { parseCourseSettings } from '../utils/courseTheme';
import {
  CourseVideoComposition,
  getCourseVideoDurationInFrames,
} from '../remotion/CourseVideoComposition';

interface LoaderState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const PLAYER_FPS = 30;
const PLAYER_WIDTH = 1280;
const PLAYER_HEIGHT = 720;

type AnyBlockContent = BlockContentMap[BlockType];

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

export function CourseVideoDraftPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useOrionTheme();
  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<LoaderState<Course>>({ data: null, loading: true, error: null });
  const [blocks, setBlocks] = useState<LoaderState<Block[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let active = true;

    const load = async () => {
      try {
        const [courseData, blocksData] = await Promise.all([
          courseService.getCourse(courseId),
          blockService.getBlocksByCourse(courseId),
        ]);
        if (!active) return;
        setCourse({ data: courseData, loading: false, error: null });
        setBlocks({ data: blocksData, loading: false, error: null });
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load course video draft';
        setCourse({ data: null, loading: false, error: message });
        setBlocks({ data: null, loading: false, error: message });
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [courseId]);

  const editorBlocks = useMemo(
    () => (blocks.data ?? []).map(toEditorBlock).sort((left, right) => left.order - right.order),
    [blocks.data]
  );
  const courseTheme = useMemo(
    () => parseCourseSettings(course.data?.settings ?? {}).theme,
    [course.data?.settings]
  );
  const durationInFrames = useMemo(
    () => getCourseVideoDurationInFrames(editorBlocks.filter((block) => !block.settings.hidden).length, PLAYER_FPS),
    [editorBlocks]
  );

  if (!courseId) return null;

  if (course.loading || blocks.loading) {
    return (
      <div className={`video-draft ${theme}`}>
        <SpaceScene />
        <main className="center">
          <div className="status-card">Loading video draft...</div>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  if (course.error || blocks.error || !course.data) {
    return (
      <div className={`video-draft ${theme}`}>
        <SpaceScene />
        <main className="center">
          <div className="status-card">
            <p>{course.error || blocks.error || 'Failed to load data.'}</p>
            <button className="ghost" onClick={() => navigate(`/course/${courseId}`)}>
              Back to editor
            </button>
          </div>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`video-draft ${theme}`}>
      <SpaceScene />

      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
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
          <Link to={`/course/${courseId}`} className="nav-link active">Editor</Link>
          <Link to={`/learn/${courseId}`} className="nav-link">Learner View</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <main className={`main ${mounted ? 'mounted' : ''}`}>
        <section className="hero glass">
          <div className="hero-left">
            <div className="eyebrow"><Sparkles size={14} /> Remotion Draft</div>
            <h1>{course.data.title}</h1>
            <p>
              Block-driven video storyboard generated from your course. Adjust block order and text in the editor,
              then refresh this draft.
            </p>
            <div className="stats">
              <span>{editorBlocks.length} blocks</span>
              <span>{Math.round(durationInFrames / PLAYER_FPS)} sec</span>
              <span>{PLAYER_WIDTH}x{PLAYER_HEIGHT}</span>
            </div>
          </div>
          <div className="hero-right">
            <button className="ghost" onClick={() => navigate(`/course/${courseId}`)}>
              <ArrowLeft size={16} />
              Back to editor
            </button>
          </div>
        </section>

        <section className="player-shell glass">
          <Player
            component={CourseVideoComposition}
            durationInFrames={durationInFrames}
            fps={PLAYER_FPS}
            compositionWidth={PLAYER_WIDTH}
            compositionHeight={PLAYER_HEIGHT}
            controls
            style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }}
            inputProps={{
              courseTitle: course.data.title,
              blocks: editorBlocks,
              theme: courseTheme,
            }}
          />
        </section>
      </main>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.video-draft { --bg-primary: #0B0D1A; --bg-card: rgba(20, 24, 45, 0.78); --bg-card-solid: rgba(25, 30, 55, 0.93); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.24); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.68); --accent: #D4A84B; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); position: relative; overflow-x: hidden; font-family: var(--font-body); }
.video-draft.light { --bg-primary: #E8F0F8; --bg-card: rgba(255, 255, 255, 0.86); --bg-card-solid: rgba(255, 255, 255, 0.94); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --accent: #B8942F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 2.2rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
.nav.mounted { opacity: 1; transform: translateY(0); }
.nav-left, .nav-right { flex: 1; }
.nav-right { display: flex; justify-content: flex-end; align-items: center; gap: 1.25rem; }
.nav-center { display: flex; align-items: center; gap: 2.2rem; }
.logo { display: flex; align-items: center; gap: 0.75rem; color: var(--text-primary); text-decoration: none; }
.logo-icon { width: 32px; height: 32px; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-size: 1.25rem; letter-spacing: 0.25em; }
.nav-link { font-size: 0.875rem; color: var(--text-secondary); text-decoration: none; }
.nav-link.active, .nav-link:hover { color: var(--text-primary); }
.main { max-width: 1200px; margin: 0 auto; padding: 6.6rem 1.35rem 3rem; position: relative; z-index: 10; opacity: 0; transform: translateY(18px); transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s; }
.main.mounted { opacity: 1; transform: translateY(0); }
.glass { backdrop-filter: blur(18px); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; }
.hero { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 1.15rem 1.2rem; margin-bottom: 1rem; background: var(--bg-card-solid); }
.hero-left h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.6rem); font-family: var(--font-display); font-weight: 400; letter-spacing: -0.02em; }
.hero-left p { margin: 0.65rem 0 0; color: var(--text-secondary); max-width: 760px; line-height: 1.6; }
.hero-right { display: flex; align-items: center; }
.eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--accent); font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; margin-bottom: 0.55rem; }
.stats { display: flex; gap: 0.55rem; flex-wrap: wrap; margin-top: 0.85rem; }
.stats span { border: 1px solid var(--border-color); border-radius: 999px; padding: 0.32rem 0.65rem; color: var(--text-secondary); font-size: 0.78rem; }
.player-shell { padding: 0.95rem; }
.ghost { display: inline-flex; align-items: center; gap: 0.45rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.04); color: var(--text-primary); border-radius: 10px; padding: 0.45rem 0.75rem; cursor: pointer; }
.ghost:hover { border-color: var(--border-active); }
.center { min-height: 100vh; display: grid; place-items: center; position: relative; z-index: 10; padding: 6rem 1.2rem 2rem; }
.status-card { padding: 1rem 1.15rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); max-width: 520px; color: var(--text-primary); }
.status-card p { margin: 0 0 0.75rem; color: var(--text-secondary); line-height: 1.6; }
@media (max-width: 960px) { .nav-center { display: none; } .hero { flex-direction: column; } }
`;

