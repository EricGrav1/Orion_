import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/course.service';
import { blockService } from '../services/block.service';
import { useAuth } from '../hooks/useAuth';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { AccountMenu } from '../components/navigation/AccountMenu';
import type { Course } from '../types/database.types';
import {
  courseBlueprintConfigs,
  getBlueprintSettings,
  getBlueprintStarterBlocks,
  type CourseBlueprint,
} from '../utils/courseBlueprint';

interface WhatsNewItem {
  title: string;
  description: string;
  link: string;
}

interface TrainingItem {
  title: string;
  category: string;
}

export function HomeHub() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useOrionTheme();
  const [mounted, setMounted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    loadCourses();
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const loadCourses = async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    }
  };

  const handleCreateCourse = async (
    blueprint: CourseBlueprint,
    options?: { title?: string; description?: string }
  ) => {
    setIsCreating(true);
    setError(null);
    try {
      const config = courseBlueprintConfigs[blueprint];
      const newCourse = await courseService.createCourse({
        title: options?.title || config.title,
        description: options?.description || config.description,
        settings: getBlueprintSettings(blueprint),
      });
      const starterBlocks = getBlueprintStarterBlocks(newCourse.id, blueprint);
      if (starterBlocks.length > 0) {
        await blockService.createBlocks(starterBlocks);
      }
      navigate(`/course/${newCourse.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const recentCourses = useMemo(() => courses.slice(0, 3), [courses]);

  const whatIsNew: WhatsNewItem[] = [
    {
      title: 'Block management improvements',
      description: 'Move or duplicate multiple blocks across lessons without templates.',
      link: '#',
    },
    {
      title: 'AI outline assist',
      description: 'Generate course outlines from a URL or pasted content.',
      link: '#',
    },
  ];

  const training: TrainingItem[] = [
    { title: 'Start authoring with Orion', category: 'Getting started' },
    { title: 'Overview of Review space', category: 'Review' },
    { title: 'Turn slides into responsive blocks', category: 'How-to' },
  ];

  return (
    <div className={`hub-page ${theme}`}>
      <SpaceScene />

      <nav className={`nav ${mounted ? 'mounted' : ''}`}>
        <div className="nav-left">
          <Link to="/app" className="logo">
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
          <span className="nav-link active">Dashboard</span>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/lms" className="nav-link">LMS Hub</Link>
          <Link to="/account" className="nav-link">Account</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
          <AccountMenu email={user?.email} onSignOut={handleSignOut} />
        </div>
      </nav>

      <main className={`hub-content ${mounted ? 'mounted' : ''}`}>
        <div className="grid">
          <div className="hero-slot">
            <section className="hero-card glass">
              <div className="hero-left">
                <div className="eyebrow">
                  <span className="hello-dot" />
                  Welcome back
                  <span className="eyebrow-email">{user?.email || '—'}</span>
                </div>
                <h1>Build courses in minutes with AI assistance.</h1>
                <p>Your trial is active. Explore Rise-style blocks, Review, and analytics in one place.</p>
                <div className="quick-links">
                  <Link to="/courses">Courses</Link>
                  <a href="#review">Review (soon)</a>
                  <a href="#analytics">Analytics (soon)</a>
                </div>
              </div>
              <div className="hero-right">
                <div className="ai-card glass-solid">
                  <div className="ai-steps">
                    {['Source', 'Details', 'Outline', 'Generate'].map((step, idx) => (
                      <div key={step} className="step">
                        <div className="badge">{idx + 1}</div>
                        <span>{step}</span>
                        {idx < 3 && <div className="rail" />}
                      </div>
                    ))}
                  </div>
                  <p>Bring a URL or paste text, let Orion draft the outline, then you edit with full control.</p>
                  <button
                    className="primary"
                    onClick={() => navigate('/ai-import')}
                    disabled={isCreating}
                  >
                    Start creating with AI
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="tiles">
            <div className="tile glass" onClick={() => navigate('/templates')}>
              <div className="tile-icon">🪐</div>
              <h3>Start with a template</h3>
              <p>Jumpstart with pre-made layouts and pacing.</p>
            </div>
            <div className="tile glass" onClick={() => handleCreateCourse('course', { title: 'New Blank Course' })}>
              <div className="tile-icon">🌟</div>
              <h3>Start blank</h3>
              <p>Build from scratch using the block library.</p>
            </div>
            <div className="tile glass" onClick={() => handleCreateCourse('microlearning')}>
              <div className="tile-icon">⚡</div>
              <h3>Create microlearning</h3>
              <p>Single-objective lesson with concise content and knowledge check.</p>
            </div>
            <div className="tile glass" onClick={() => handleCreateCourse('storyline')}>
              <div className="tile-icon">🧭</div>
              <h3>Create interactive</h3>
              <p>Open Storyline Studio with branching scene map and triggers.</p>
            </div>
            <div className="tile glass" onClick={() => navigate('/ai-import')}>
              <div className="tile-icon">📥</div>
              <h3>Import slides</h3>
              <p>Upload PPTX, DOCX, PDF, or text and auto-generate course content.</p>
            </div>
          </section>

          <section className="lower">
            <div className="panel glass">
              <div className="panel-head">
                <h3>Resume editing</h3>
                <Link to="/courses">View all courses</Link>
              </div>
              {recentCourses.length === 0 ? (
                <p className="muted">No courses yet. Start one above.</p>
              ) : (
                <div className="course-list">
                  {recentCourses.map((c) => (
                    <Link key={c.id} to={`/course/${c.id}`} className="course-chip">
                      <div className="dot" />
                      <div>
                        <div className="chip-title">{c.title}</div>
                        <div className="chip-meta">{new Date(c.updated_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="panel glass">
              <div className="panel-head">
                <h3>What’s new</h3>
              </div>
              <div className="list">
                {whatIsNew.map((item) => (
                  <div key={item.title} className="list-item">
                    <div>
                      <div className="item-title">{item.title}</div>
                      <div className="item-desc">{item.description}</div>
                    </div>
                    <a href={item.link} className="item-link">Learn more →</a>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel glass">
              <div className="panel-head">
                <h3>Training</h3>
              </div>
              <div className="list">
                {training.map((t) => (
                  <div key={t.title} className="list-item">
                    <div>
                      <div className="item-title">{t.title}</div>
                      <div className="item-desc">{t.category}</div>
                    </div>
                    <span className="pill">Watch</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {error && <div className="error-bar">{error}</div>}
        </div>
      </main>

      <style>{`
        .hub-page { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --bg-card-solid: rgba(25, 30, 55, 0.95); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.7); --text-muted: rgba(255, 255, 255, 0.5); --accent: #D4A84B; --accent-hover: #C49A3D; --star-blue: #B4D4FF; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); position: relative; overflow-x: hidden; font-family: var(--font-body); }
        .hub-page.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --bg-card-solid: rgba(255, 255, 255, 0.92); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; --accent-hover: #A8841F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
        .hub-page.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .hub-page.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.3 !important; }
        .hub-page.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
        .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
        .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
        .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
        @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
        .sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
        .hub-page.light .sun { opacity: 0.7; background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%); box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05); animation: sunPulse 8s ease-in-out infinite; }
        @keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
        .hub-page.light .sun-rays { opacity: 0.5; background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg); animation: sunRaysRotate 120s linear infinite; }
        @keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 2.4rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .nav.mounted { opacity: 1; transform: translateY(0); }
        .nav-left { flex: 1; }
        .logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text-primary); }
        .logo-icon { width: 32px; height: 32px; color: var(--accent); }
        .logo-text { font-family: var(--font-display); font-size: 1.25rem; font-weight: 400; letter-spacing: 0.25em; }
        .nav-center { display: flex; align-items: center; gap: 1.75rem; }
        .nav-link { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s ease; letter-spacing: 0.02em; }
        .nav-link:hover, .nav-link.active { color: var(--text-primary); }
        .nav-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 1rem; }
        .user-pill { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0.3rem 0.6rem; border-radius: 999px; border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.78rem; }
        .theme-toggle { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 50%; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
        .theme-toggle:hover { border-color: var(--border-active); color: var(--text-primary); }
        .theme-toggle svg { width: 18px; height: 18px; }
        .nav-time { font-size: 0.75rem; color: var(--text-muted); letter-spacing: 0.02em; }
        .nav-signout { margin-left: 0; }
        @media (max-width: 960px) { .nav-center, .nav-time, .user-pill { display: none; } }
        .hub-content { position: relative; z-index: 10; min-height: 100vh; padding: 7rem 2.4rem 3rem; opacity: 0; transform: translateY(20px); transition: opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s; }
        .hub-content.mounted { opacity: 1; transform: translateY(0); }
        .grid { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
        .glass { backdrop-filter: blur(20px); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; }
        .glass-solid { background: var(--bg-card-solid); border: 1px solid var(--border-active); }
        .hero-slot { min-height: 238px; }
        .hero-card { position: fixed; top: 6.2rem; left: 50%; transform: translateX(-50%); width: min(1200px, calc(100vw - 4.8rem)); z-index: 30; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1.25rem; padding: 1.5rem; }
        .hero-left h1 { font-family: var(--font-display); font-size: 2rem; margin: 0.35rem 0; letter-spacing: -0.01em; }
        .hero-left p { color: var(--text-secondary); margin: 0.25rem 0 0.6rem; }
        .eyebrow { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--accent); font-weight: 600; letter-spacing: 0.01em; flex-wrap: wrap; }
        .hello-dot { width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(212,168,75,0.9)); box-shadow: 0 0 0 6px rgba(212,168,75,0.12); }
        .eyebrow-email { color: var(--text-secondary); font-weight: 500; }
        .signout-link { margin-left: 0.25rem; background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); padding: 0.25rem 0.55rem; border-radius: 999px; cursor: pointer; transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease; }
        .signout-link:hover { border-color: var(--border-active); color: var(--text-primary); transform: translateY(-1px); }
        .quick-links { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .quick-links a { color: var(--accent); text-decoration: none; font-weight: 600; }
        .hero-right { display: flex; justify-content: flex-end; }
        .ai-card { width: 100%; max-width: 460px; padding: 1rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .ai-steps { display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; gap: 0.5rem; }
        .step { display: flex; align-items: center; gap: 0.35rem; position: relative; }
        .badge { width: 28px; height: 28px; border-radius: 10px; background: linear-gradient(135deg, #2c3e70, #3f4f90); border: 1px solid var(--border-active); display: grid; place-items: center; font-weight: 700; color: #fff; font-size: 0.85rem; }
        .rail { flex: 1; height: 2px; background: var(--border-color); }
        .ai-card p { color: var(--text-secondary); margin: 0; }
        .primary { background: linear-gradient(135deg, #264b8c, #d4a84b); color: #0b0d1a; border: none; padding: 0.75rem 1rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: transform 0.15s ease, filter 0.15s ease; }
        .primary:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
        .tile { padding: 1rem; cursor: pointer; transition: border-color 0.2s ease, transform 0.15s ease; min-height: 150px; }
        .tile:hover { border-color: var(--border-active); transform: translateY(-2px); }
        .tile-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(212, 168, 75, 0.12); display: grid; place-items: center; margin-bottom: 0.6rem; font-size: 1.2rem; }
        .tile h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
        .tile p { margin: 0; color: var(--text-secondary); }
        .lower { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
        .panel { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .panel-head h3 { margin: 0; font-size: 1.05rem; }
        .panel-head a { color: var(--accent); font-weight: 600; text-decoration: none; }
        .course-list { display: flex; flex-direction: column; gap: 0.6rem; }
        .course-chip { display: flex; gap: 0.6rem; align-items: center; padding: 0.65rem 0.75rem; border: 1px solid var(--border-color); border-radius: 12px; text-decoration: none; color: var(--text-primary); background: rgba(255,255,255,0.03); }
        .course-chip:hover { border-color: var(--border-active); }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
        .chip-title { font-weight: 600; }
        .chip-meta { color: var(--text-muted); font-size: 0.85rem; }
        .list { display: flex; flex-direction: column; gap: 0.65rem; }
        .list-item { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.7rem 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: rgba(255,255,255,0.02); }
        .item-title { font-weight: 600; }
        .item-desc { color: var(--text-secondary); font-size: 0.9rem; }
        .item-link { color: var(--accent); text-decoration: none; font-weight: 600; }
        .pill { background: rgba(212, 168, 75, 0.18); color: var(--accent); padding: 0.2rem 0.55rem; border-radius: 999px; font-weight: 700; font-size: 0.8rem; }
        .muted { color: var(--text-muted); margin: 0; }
        .error-bar { position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%); background: rgba(200, 60, 60, 0.85); border: 1px solid rgba(255,255,255,0.2); padding: 0.75rem 1rem; border-radius: 12px; color: #fff; z-index: 200; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        @media (max-width: 1024px) { .hero-slot { min-height: 318px; } .hero-card { grid-template-columns: 1fr; } .hero-right { justify-content: flex-start; } .ai-card { max-width: none; } .lower { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 760px) { .hero-slot { min-height: 0; } .hero-card { position: static; transform: none; width: auto; } .lower { grid-template-columns: 1fr; } .hub-content { padding: 6rem 1.25rem 3rem; } }
      `}</style>
    </div>
  );
}

export default HomeHub;
