import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { courseService } from './services/course.service';
import { blockService } from './services/block.service';
import { CourseEditor } from './components/editor/CourseEditor';
import { StorylineStudio } from './components/storyline/StorylineStudio';
import { AuthPage } from './pages/AuthPage';
import { AboutPage } from './pages/AboutPage';
import { PricingPage } from './pages/PricingPage';
import { LandingPage } from './pages/LandingPage';
import { HomeHub } from './pages/HomeHub';
import { AIImportPage } from './pages/AIImportPage';
import { TemplateGalleryPage } from './pages/TemplateGalleryPage';
import { AccountPage } from './pages/AccountPage';
import { WorkspacePeoplePage } from './pages/WorkspacePeoplePage';
import { JoinWorkspacePage } from './pages/JoinWorkspacePage';
import { LmsHubPage } from './pages/LmsHubPage';
import { ProgressPage } from './pages/progress';
import { LearnerView } from './pages/LearnerView';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { SpaceScene } from './components/space/SpaceScene';
import { OrionClock } from './components/space/OrionClock';
import { ThemeToggle } from './components/space/ThemeToggle';
import { useOrionTheme } from './hooks/useOrionTheme';
import { StarField } from './components/space/StarField';
import { AccountMenu } from './components/navigation/AccountMenu';
import type { Course } from './types/database.types';
import { parseCourseSettings } from './utils/courseTheme';
import {
  courseBlueprintConfigs,
  getBlueprintSettings,
  getBlueprintStarterBlocks,
  type CourseBlueprint,
} from './utils/courseBlueprint';

function getSafeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

const CourseVideoDraftPage = lazy(async () => {
  const module = await import('./pages/CourseVideoDraftPage');
  return { default: module.CourseVideoDraftPage };
});

function getCourseFormatLabel(course: Course): string {
  const settings = parseCourseSettings(course.settings);
  if (settings.authoringMode === 'storyline') {
    return 'Interactive';
  }
  if (settings.format === 'microlearning') {
    return 'Microlearning';
  }
  return 'Course';
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: profileLoading, error: profileError, isTrialExpired } = useProfile();
  const location = useLocation();

  if (isLoading || profileLoading) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-spinner" />
        <style>{`
          .loading-page {
            --bg-primary: #0B0D1A;
            --bg-card: rgba(20, 24, 45, 0.75);
            --border-color: rgba(255, 255, 255, 0.08);
            --accent: #D4A84B;
            --text-primary: #FAFAFA;
            min-height: 100vh;
            background: var(--bg-primary);
            position: relative;
            overflow-x: hidden;
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
          .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
          .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
          @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
          .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
          @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
          .loading-spinner { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; width: 48px; height: 48px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    const authPath = `/auth?next=${encodeURIComponent(nextPath)}`;
    return <Navigate to={authPath} replace />;
  }

  if (profileError) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-spinner" style={{ display: 'none' }} />
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: 560,
            margin: '20vh auto 0',
            padding: '1rem 1.25rem',
            borderRadius: 16,
            background: 'rgba(20, 24, 45, 0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FAFAFA',
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Unable to load subscription profile</div>
          <div style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>{profileError}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/app" style={{ color: '#D4A84B', textDecoration: 'none', fontWeight: 800 }}>Retry</Link>
            <Link to="/auth" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 800 }}>Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const checkoutSuccess = location.search.includes('checkout=success');
  if (isTrialExpired && !checkoutSuccess) {
    return <Navigate to="/pricing?reason=trial_expired" replace />;
  }

  return <>{children}</>;
}

// Dashboard component
function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useOrionTheme();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const createMenuRef = useRef<HTMLDivElement | null>(null);

  const loadCourses = useCallback(async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    loadCourses();
    return () => window.cancelAnimationFrame(raf);
  }, [loadCourses]);

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    const handleDocumentPointerDown = (event: MouseEvent) => {
      if (!createMenuRef.current) return;
      if (!createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreateMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleDocumentPointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleDocumentPointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isCreateMenuOpen]);

  const handleCreateCourse = async (mode: CourseBlueprint) => {
    setIsCreating(true);
    setIsCreateMenuOpen(false);
    try {
      const config = courseBlueprintConfigs[mode];
      const newCourse = await courseService.createCourse({
        title: config.title,
        description: config.description,
        settings: getBlueprintSettings(mode),
      });
      const starterBlocks = getBlueprintStarterBlocks(newCourse.id, mode);
      if (starterBlocks.length > 0) {
        await blockService.createBlocks(starterBlocks);
      }
      navigate(`/course/${newCourse.id}`);
    } catch (error: unknown) {
      console.error('Failed to create course:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to create course: ${message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-spinner" />
        <style>{`
          .loading-page {
            --bg-primary: #0B0D1A;
            --bg-card: rgba(20, 24, 45, 0.75);
            --border-color: rgba(255, 255, 255, 0.08);
            --accent: #D4A84B;
            --text-primary: #FAFAFA;
            min-height: 100vh;
            background: var(--bg-primary);
            position: relative;
            overflow-x: hidden;
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
          .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
          .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
          @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
          .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
          @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
          .loading-spinner { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; width: 48px; height: 48px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`dashboard-page ${theme}`}>
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
          <Link to="/courses" className="nav-link active">Courses</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/lms" className="nav-link">LMS Hub</Link>
          <Link to="/account" className="nav-link">Account</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>
      <main className={`main-content ${mounted ? 'mounted' : ''}`}>
        <div className="content-container">
          <header className="dashboard-header">
            <div className="header-left">
              <h1 className="page-title">Your Courses</h1>
              <p className="page-subtitle">Create and manage your learning journeys</p>
            </div>
            <div className="header-right">
              <AccountMenu email={user?.email} onSignOut={handleSignOut} compact />
              <div className="create-menu" ref={createMenuRef}>
                <button
                  onClick={() => setIsCreateMenuOpen((open) => !open)}
                  disabled={isCreating}
                  className="create-button"
                  aria-haspopup="menu"
                  aria-expanded={isCreateMenuOpen}
                  aria-label="Create new content"
                >
                  {isCreating ? 'Creating...' : '+ Create New'}
                </button>
                {isCreateMenuOpen && (
                  <div className="create-popover" role="menu" aria-label="Create new content type">
                    <button
                      role="menuitem"
                      className="create-option"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        navigate('/ai-import');
                      }}
                    >
                      <div className="create-option-copy">
                        <div className="create-option-title">AI Import</div>
                        <div className="create-option-description">Upload PPTX, PDF, DOCX, or text and auto-generate course content.</div>
                      </div>
                      <span className="create-option-arrow" aria-hidden="true">›</span>
                    </button>
                    <button
                      role="menuitem"
                      className="create-option"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        navigate('/templates');
                      }}
                    >
                      <div className="create-option-copy">
                        <div className="create-option-title">Templates</div>
                        <div className="create-option-description">Start from curated course and microlearning templates.</div>
                      </div>
                      <span className="create-option-arrow" aria-hidden="true">›</span>
                    </button>
                    <button
                      role="menuitem"
                      className="create-option"
                      onClick={() => handleCreateCourse('course')}
                      disabled={isCreating}
                    >
                      <div className="create-option-copy">
                        <div className="create-option-title">Course</div>
                        <div className="create-option-description">{courseBlueprintConfigs.course.helperText}</div>
                      </div>
                      <span className="create-option-arrow" aria-hidden="true">›</span>
                    </button>
                    <button
                      role="menuitem"
                      className="create-option"
                      onClick={() => handleCreateCourse('microlearning')}
                      disabled={isCreating}
                    >
                      <div className="create-option-copy">
                        <div className="create-option-title">Microlearning</div>
                        <div className="create-option-description">{courseBlueprintConfigs.microlearning.helperText}</div>
                      </div>
                      <span className="create-option-arrow" aria-hidden="true">›</span>
                    </button>
                    <button
                      role="menuitem"
                      className="create-option"
                      onClick={() => handleCreateCourse('storyline')}
                      disabled={isCreating}
                    >
                      <div className="create-option-copy">
                        <div className="create-option-title">Interactive (Storyline)</div>
                        <div className="create-option-description">{courseBlueprintConfigs.storyline.helperText}</div>
                      </div>
                      <span className="create-option-arrow" aria-hidden="true">›</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h3 className="empty-title">Create your first course</h3>
              <p className="empty-text">Choose full course, microlearning, or interactive Storyline authoring.</p>
              <div className="empty-actions">
                <button onClick={() => handleCreateCourse('course')} disabled={isCreating} className="empty-button">
                  {isCreating ? 'Creating...' : 'Create Course'}
                </button>
                <button onClick={() => handleCreateCourse('microlearning')} disabled={isCreating} className="empty-button secondary">
                  {isCreating ? 'Creating...' : 'Create Microlearning'}
                </button>
                <button onClick={() => handleCreateCourse('storyline')} disabled={isCreating} className="empty-button secondary">
                  {isCreating ? 'Creating...' : 'Create Interactive'}
                </button>
                <button onClick={() => navigate('/templates')} className="empty-button secondary">
                  Templates
                </button>
                <button onClick={() => navigate('/ai-import')} className="empty-button secondary">
                  AI Import
                </button>
              </div>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <Link key={course.id} to={`/course/${course.id}`} className="course-card">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-description">{course.description || 'No description'}</p>
                  <div className="course-meta">
                    <span className="course-status">{getCourseFormatLabel(course)} · {course.status}</span>
                    <span className="course-date">{new Date(course.updated_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <style>{`
        .dashboard-page { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --bg-card-solid: rgba(25, 30, 55, 0.95); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.6); --text-muted: rgba(255, 255, 255, 0.4); --accent: #D4A84B; --accent-hover: #C49A3D; --star-blue: #B4D4FF; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); position: relative; overflow-x: hidden; font-family: var(--font-body); }
        .dashboard-page.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --bg-card-solid: rgba(255, 255, 255, 0.92); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; --accent-hover: #A8841F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
        .dashboard-page.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .dashboard-page.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.35 !important; }
        .dashboard-page.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
        .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
        .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
        .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
        @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
        .sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
        .dashboard-page.light .sun { opacity: 0.7; background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%); box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05); animation: sunPulse 8s ease-in-out infinite; }
        @keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
        .dashboard-page.light .sun-rays { opacity: 0.5; background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg); animation: sunRaysRotate 120s linear infinite; }
        @keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 2.5rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .nav.mounted { opacity: 1; transform: translateY(0); }
        .nav-left { flex: 1; }
        .logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text-primary); }
        .logo-icon { width: 32px; height: 32px; color: var(--accent); }
        .logo-text { font-family: var(--font-display); font-size: 1.25rem; font-weight: 400; letter-spacing: 0.25em; }
        .nav-center { display: flex; align-items: center; gap: 2.5rem; }
        .nav-link { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s ease; letter-spacing: 0.02em; }
        .nav-link:hover, .nav-link.active { color: var(--text-primary); }
        .nav-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 1.5rem; }
        .theme-toggle { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 50%; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
        .theme-toggle:hover { border-color: var(--border-active); color: var(--text-primary); }
        .theme-toggle svg { width: 18px; height: 18px; }
        .nav-time { font-size: 0.75rem; color: var(--text-muted); letter-spacing: 0.02em; }
        @media (max-width: 900px) { .nav-center, .nav-time { display: none; } }
        .main-content { position: relative; z-index: 10; min-height: 100vh; padding: 8rem 2.5rem 4rem; opacity: 0; transform: translateY(20px); transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s; }
        .main-content.mounted { opacity: 1; transform: translateY(0); }
        .content-container { max-width: 1200px; margin: 0 auto; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; gap: 2rem; }
        @media (max-width: 768px) { .dashboard-header { flex-direction: column; align-items: flex-start; } }
        .header-left { flex: 1; }
        .page-title { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 2.5rem); font-weight: 300; line-height: 1.2; margin-bottom: 0.75rem; color: var(--text-primary); }
        .page-subtitle { font-size: 1rem; line-height: 1.6; color: var(--text-secondary); }
        .header-right { display: flex; align-items: center; gap: 1rem; position: relative; }
        .user-email { font-size: 0.875rem; color: var(--text-secondary); }
        .create-menu { position: relative; }
        .create-button { padding: 0.75rem 1.2rem; font-family: var(--font-body); font-size: 0.875rem; font-weight: 600; color: white; background: linear-gradient(135deg, var(--accent), #7ac9ff); border: none; border-radius: 10px; cursor: pointer; transition: transform 0.2s ease, filter 0.2s ease; box-shadow: 0 10px 24px rgba(0,0,0,0.22); }
        .create-button:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
        .create-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .create-popover { position: absolute; top: calc(100% + 0.55rem); right: 0; width: 320px; background: var(--bg-card-solid); border: 1px solid var(--border-active); border-radius: 14px; padding: 0.4rem; box-shadow: 0 28px 60px rgba(0,0,0,0.35); z-index: 150; display: grid; gap: 0.35rem; }
        .create-option { width: 100%; text-align: left; border: 1px solid transparent; background: rgba(255,255,255,0.02); color: var(--text-primary); border-radius: 10px; padding: 0.72rem 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; cursor: pointer; transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease; }
        .create-option:hover { border-color: var(--border-active); background: rgba(255,255,255,0.05); transform: translateX(1px); }
        .create-option-copy { display: grid; gap: 0.22rem; }
        .create-option-title { font-size: 0.95rem; font-weight: 700; }
        .create-option-description { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; }
        .create-option-arrow { color: var(--accent); font-size: 1.25rem; line-height: 1; }
        .signout-button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
        .signout-button:hover { border-color: var(--border-active); color: var(--text-primary); }
        .empty-state { text-align: center; padding: 6rem 2rem; background: var(--bg-card-solid); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border-color); border-radius: 16px; max-width: 500px; margin: 0 auto; }
        .empty-icon { font-size: 3rem; color: var(--accent); margin-bottom: 1.5rem; animation: rotateStar 10s linear infinite; }
        @keyframes rotateStar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .empty-title { font-family: var(--font-display); font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: var(--text-primary); }
        .empty-text { font-size: 1rem; color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6; }
        .empty-actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
        .empty-button { padding: 1rem 2rem; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; color: white; background: var(--accent); border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
        .empty-button:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
        .empty-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .empty-button.secondary { background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid var(--border-color); }
        .empty-button.secondary:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: var(--border-active); }
        .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .course-card { display: block; background: var(--bg-card-solid); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; text-decoration: none; transition: all 0.3s ease; }
        .course-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); border-color: var(--border-active); }
        .course-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 400; margin-bottom: 0.75rem; color: var(--text-primary); }
        .course-description { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .course-meta { display: flex; align-items: center; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .course-status { font-size: 0.75rem; padding: 0.25rem 0.75rem; background: var(--bg-card); border-radius: 12px; color: var(--text-muted); text-transform: capitalize; }
        .course-date { font-size: 0.75rem; color: var(--text-muted); }
        @media (max-width: 768px) { .main-content { padding: 6rem 1.5rem 3rem; } .header-right { flex-wrap: wrap; } .courses-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

// EditorPage component
function EditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const { theme, toggleTheme } = useOrionTheme();

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let active = true;

    const loadCourse = async () => {
      setCourseLoading(true);
      setCourseError(null);
      try {
        const data = await courseService.getCourse(courseId);
        if (!active) return;
        setCourse(data);
      } catch (error) {
        if (!active) return;
        setCourseError(error instanceof Error ? error.message : 'Failed to load course');
      } finally {
        if (active) setCourseLoading(false);
      }
    };

    loadCourse();
    return () => {
      active = false;
    };
  }, [courseId]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (!courseId) {
    return <Navigate to="/app" replace />;
  }

  const authoringMode = course ? parseCourseSettings(course.settings).authoringMode : 'rise';

  return (
    <div className={`editor-page ${theme}`}>
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
          <Link to="/app" className="nav-link">Dashboard</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/lms" className="nav-link">LMS Hub</Link>
          <Link to="/account" className="nav-link">Account</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>
      <div className={`editor-container ${mounted ? 'mounted' : ''}`}>
        <div className="editor-header">
          <Link to="/app" className="back-link">← Back to Dashboard</Link>
          <div className="header-actions">
            {!courseLoading && !courseError && (
              <span className={`mode-badge ${authoringMode}`}>{authoringMode === 'storyline' ? 'Interactive (Storyline)' : 'Rise Course'}</span>
            )}
            <AccountMenu email={user?.email} onSignOut={handleSignOut} compact />
          </div>
        </div>
        <div className="editor-content">
          {courseLoading ? (
            <div className="editor-loading">Loading editor...</div>
          ) : courseError || !course ? (
            <div className="editor-loading error">{courseError || 'Course not found'}</div>
          ) : authoringMode === 'storyline' ? (
            <StorylineStudio courseId={courseId} />
          ) : (
            <CourseEditor courseId={courseId} />
          )}
        </div>
      </div>
      <style>{`
        .editor-page { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --bg-card-solid: rgba(25, 30, 55, 0.95); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.6); --text-muted: rgba(255, 255, 255, 0.4); --accent: #D4A84B; --accent-hover: #C49A3D; --star-blue: #B4D4FF; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); position: relative; overflow-x: hidden; font-family: var(--font-body); }
        .editor-page.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --bg-card-solid: rgba(255, 255, 255, 0.92); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; --accent-hover: #A8841F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
        .editor-page.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .editor-page.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.35 !important; }
        .editor-page.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
        .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
        .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
        .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
        @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
        .sun { position: fixed; top: -150px; right: 10%; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.8s ease; }
        .editor-page.light .sun { opacity: 0.7; background: radial-gradient(circle, rgba(255, 245, 220, 0.9) 0%, rgba(255, 220, 150, 0.6) 20%, rgba(255, 200, 100, 0.35) 40%, rgba(255, 180, 80, 0.15) 60%, transparent 75%); box-shadow: 0 0 60px 30px rgba(255, 220, 150, 0.2), 0 0 120px 60px rgba(255, 200, 100, 0.15), 0 0 200px 100px rgba(255, 180, 80, 0.1), 0 0 300px 150px rgba(255, 160, 60, 0.05); animation: sunPulse 8s ease-in-out infinite; }
        @keyframes sunPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .sun-rays { position: absolute; top: 50%; left: 50%; width: 800px; height: 800px; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.8s ease; }
        .editor-page.light .sun-rays { opacity: 0.5; background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 230, 180, 0.15) 5deg, transparent 10deg, transparent 20deg, rgba(255, 230, 180, 0.1) 25deg, transparent 30deg, transparent 45deg, rgba(255, 230, 180, 0.12) 50deg, transparent 55deg, transparent 70deg, rgba(255, 230, 180, 0.08) 75deg, transparent 80deg, transparent 90deg, rgba(255, 230, 180, 0.15) 95deg, transparent 100deg, transparent 115deg, rgba(255, 230, 180, 0.1) 120deg, transparent 125deg, transparent 140deg, rgba(255, 230, 180, 0.12) 145deg, transparent 150deg, transparent 165deg, rgba(255, 230, 180, 0.08) 170deg, transparent 175deg, transparent 180deg, rgba(255, 230, 180, 0.15) 185deg, transparent 190deg, transparent 205deg, rgba(255, 230, 180, 0.1) 210deg, transparent 215deg, transparent 230deg, rgba(255, 230, 180, 0.12) 235deg, transparent 240deg, transparent 255deg, rgba(255, 230, 180, 0.08) 260deg, transparent 265deg, transparent 280deg, rgba(255, 230, 180, 0.15) 285deg, transparent 290deg, transparent 305deg, rgba(255, 230, 180, 0.1) 310deg, transparent 315deg, transparent 330deg, rgba(255, 230, 180, 0.12) 335deg, transparent 340deg, transparent 355deg, rgba(255, 230, 180, 0.08) 360deg); animation: sunRaysRotate 120s linear infinite; }
        @keyframes sunRaysRotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 2.5rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
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
        .editor-container { position: relative; z-index: 10; display: flex; flex-direction: column; min-height: 100vh; padding: 5rem 0 0; opacity: 0; transform: translateY(18px); transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s; }
        .editor-container.mounted { opacity: 1; transform: translateY(0); }
        .editor-header { position: sticky; top: 4.5rem; z-index: 50; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 2.5rem; background: var(--bg-card-solid); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); margin-bottom: 1rem; }
        .back-link { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s ease; }
        .back-link:hover { color: var(--text-primary); }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .mode-badge { font-size: 0.74rem; border: 1px solid var(--border-color); border-radius: 999px; padding: 0.2rem 0.55rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
        .mode-badge.storyline { border-color: rgba(122, 201, 255, 0.55); color: #bfe6ff; background: rgba(122, 201, 255, 0.12); }
        .mode-badge.rise { border-color: rgba(212, 168, 75, 0.45); color: #f0d79c; background: rgba(212, 168, 75, 0.12); }
        .user-email { font-size: 0.875rem; color: var(--text-secondary); }
        .signout-button { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
        .signout-button:hover { border-color: var(--border-active); color: var(--text-primary); }
        .editor-content { flex: 1; overflow: hidden; }
        .editor-loading { margin: 2rem; padding: 1rem 1.1rem; border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-secondary); background: rgba(255,255,255,0.04); }
        .editor-loading.error { color: #f8b4b4; border-color: rgba(248,180,180,0.5); }
        @media (max-width: 768px) { .editor-header { padding: 0.75rem 1.5rem; flex-wrap: wrap; gap: 0.5rem; } .header-actions { flex: 1; justify-content: flex-end; } }
      `}</style>
    </div>
  );
}

// Auth route - redirect if already logged in
function AuthRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-spinner" />
        <style>{`
          .loading-page {
            --bg-primary: #0B0D1A;
            --bg-card: rgba(20, 24, 45, 0.75);
            --border-color: rgba(255, 255, 255, 0.08);
            --accent: #D4A84B;
            --text-primary: #FAFAFA;
            min-height: 100vh;
            background: var(--bg-primary);
            position: relative;
            overflow-x: hidden;
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
          .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
          .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
          @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
          .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
          @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
          .loading-spinner { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; width: 48px; height: 48px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    const nextParam = new URLSearchParams(location.search).get('next');
    const nextPath = getSafeNextPath(nextParam) || '/app';
    return <Navigate to={nextPath} replace />;
  }

  return <AuthPage />;
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-page">
        <StarField />
        <div className="nebula" />
        <div className="loading-spinner" />
        <style>{`
          .loading-page {
            --bg-primary: #0B0D1A;
            --bg-card: rgba(20, 24, 45, 0.75);
            --border-color: rgba(255, 255, 255, 0.08);
            --accent: #D4A84B;
            --text-primary: #FAFAFA;
            min-height: 100vh;
            background: var(--bg-primary);
            position: relative;
            overflow-x: hidden;
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .star-field { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
          .star { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); background: white; border-radius: 50%; animation: twinkle var(--duration) ease-in-out infinite; animation-delay: var(--delay); }
          .star.bright { box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5); }
          @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.3); } }
          .nebula { position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse 120% 80% at 0% 40%, rgba(180, 40, 60, 0.35) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 60%, rgba(150, 30, 50, 0.3) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30, 100, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 60% 40%, rgba(0, 180, 220, 0.2) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 55% 45%, rgba(0, 220, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 70%, rgba(120, 60, 180, 0.25) 0%, transparent 50%); pointer-events: none; animation: nebulaDrift 60s ease-in-out infinite alternate; }
          @keyframes nebulaDrift { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.05) translate(-1%, 1%); } 100% { transform: scale(1.02) translate(1%, -0.5%); } }
          .loading-spinner { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; width: 48px; height: 48px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><HomeHub /></ProtectedRoute>} />
        <Route path="/lms" element={<ProtectedRoute><LmsHubPage /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/workspace/:teamId/people" element={<ProtectedRoute><WorkspacePeoplePage /></ProtectedRoute>} />
        <Route path="/join/:token" element={<JoinWorkspacePage />} />
        <Route path="/ai-import" element={<ProtectedRoute><AIImportPage /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><TemplateGalleryPage /></ProtectedRoute>} />
        <Route path="/" element={<HomeRoute />} />
        <Route path="/course/:courseId" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
        <Route
          path="/course/:courseId/video-draft"
          element={
            <ProtectedRoute>
              <Suspense
                fallback={
                  <div
                    style={{
                      minHeight: '100vh',
                      display: 'grid',
                      placeItems: 'center',
                      background: '#0B0D1A',
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                    }}
                  >
                    Loading video draft...
                  </div>
                }
              >
                <CourseVideoDraftPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/learn/:courseId" element={<ProtectedRoute><LearnerView /></ProtectedRoute>} />
        <Route path="/share/:shareToken" element={<LearnerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
