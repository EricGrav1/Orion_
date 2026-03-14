import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { courseService, type CourseAnalytics } from '../services/course.service';
import { teamService } from '../services/team.service';
import type { Course, Team } from '../types/database.types';
import { parseCourseShareSettings } from '../utils/courseShare';

interface CourseAnalyticsRow {
  course: Course;
  analytics: CourseAnalytics;
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export function ProgressPage() {
  const { theme, toggleTheme } = useOrionTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<CourseAnalyticsRow[]>([]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [courses, teamList] = await Promise.all([
          courseService.getCourses(),
          teamService.getMyTeams(),
        ]);
        const publishedCourses = courses.filter((course) => parseCourseShareSettings(course.settings).published);
        const analyticsRows = await Promise.all(
          publishedCourses.map(async (course) => ({
            course,
            analytics: await courseService.getCourseAnalytics(course.id),
          }))
        );
        analyticsRows.sort((left, right) => right.analytics.views - left.analytics.views);
        setRows(analyticsRows);
        setTeams(teamList);
      } catch (loadError) {
        setError((loadError as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const totals = useMemo(() => {
    const aggregate = rows.reduce(
      (acc, row) => {
        acc.views += row.analytics.views;
        acc.completions += row.analytics.completions;
        acc.resumes += row.analytics.resumes;
        acc.quizAttempts += row.analytics.quizAttempts;
        acc.quizPasses += row.analytics.quizPasses;
        return acc;
      },
      { views: 0, completions: 0, resumes: 0, quizAttempts: 0, quizPasses: 0 }
    );
    const completionRate = aggregate.views > 0 ? (aggregate.completions / aggregate.views) * 100 : 0;
    const resumeRate = aggregate.views > 0 ? (aggregate.resumes / aggregate.views) * 100 : 0;
    const quizPassRate = aggregate.quizAttempts > 0 ? (aggregate.quizPasses / aggregate.quizAttempts) * 100 : 0;
    return { ...aggregate, completionRate, resumeRate, quizPassRate };
  }, [rows]);

  const teamSummaries = useMemo(() => {
    const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
    const map = new Map<string, { teamLabel: string; publishedCourses: number; views: number; completions: number; resumeRate: number }>();

    rows.forEach((row) => {
      const teamLabel = row.course.team_id ? (teamNameById.get(row.course.team_id) || 'Workspace') : 'Personal';
      const key = row.course.team_id || 'personal';
      const current = map.get(key) || { teamLabel, publishedCourses: 0, views: 0, completions: 0, resumeRate: 0 };
      current.publishedCourses += 1;
      current.views += row.analytics.views;
      current.completions += row.analytics.completions;
      current.resumeRate += row.analytics.resumeRate;
      map.set(key, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        resumeRate: item.publishedCourses > 0 ? item.resumeRate / item.publishedCourses : 0,
      }))
      .sort((left, right) => right.views - left.views);
  }, [rows, teams]);

  return (
    <div className={`progress-page ${theme}`}>
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
          <Link to="/lms" className="nav-link">LMS Hub</Link>
          <Link to="/courses" className="nav-link">Courses</Link>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
        </div>
      </nav>

      <main className={`main ${mounted ? 'mounted' : ''}`}>
        <header className="head">
          <div>
            <h1>Analytics Dashboard</h1>
            <p>Published course engagement: views, completions, resumes, and quiz performance.</p>
          </div>
          <Link to="/app" className="home-link">← Back to Dashboard</Link>
        </header>

        {loading && <div className="state-card">Loading analytics…</div>}
        {error && <div className="state-card error">{error}</div>}

        {!loading && !error && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <span className="label">Published Courses</span>
                <strong>{rows.length}</strong>
              </article>
              <article className="metric-card">
                <span className="label">Total Views</span>
                <strong>{totals.views}</strong>
              </article>
              <article className="metric-card">
                <span className="label">Completion Rate</span>
                <strong>{formatPercent(totals.completionRate)}</strong>
              </article>
              <article className="metric-card">
                <span className="label">Resume Rate</span>
                <strong>{formatPercent(totals.resumeRate)}</strong>
              </article>
              <article className="metric-card">
                <span className="label">Quiz Pass Rate</span>
                <strong>{formatPercent(totals.quizPassRate)}</strong>
              </article>
              <article className="metric-card">
                <span className="label">Quiz Attempts</span>
                <strong>{totals.quizAttempts}</strong>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Workspace Summary</h2>
              </div>
              {teamSummaries.length === 0 ? (
                <p className="muted">No published analytics yet. Publish a course and open it via share link.</p>
              ) : (
                <div className="summary-grid">
                  {teamSummaries.map((summary) => (
                    <article className="summary-card" key={summary.teamLabel}>
                      <h3>{summary.teamLabel}</h3>
                      <p>{summary.publishedCourses} published course{summary.publishedCourses === 1 ? '' : 's'}</p>
                      <div className="summary-metrics">
                        <span>{summary.views} views</span>
                        <span>{summary.completions} completions</span>
                        <span>{formatPercent(summary.resumeRate)} avg resume</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Course Breakdown</h2>
              </div>
              {rows.length === 0 ? (
                <p className="muted">No published courses with analytics events yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Views</th>
                        <th>Completions</th>
                        <th>Resume Rate</th>
                        <th>Quiz Pass</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.course.id}>
                          <td>
                            <Link to={`/course/${row.course.id}`} className="course-link">{row.course.title}</Link>
                          </td>
                          <td>{row.analytics.views}</td>
                          <td>{row.analytics.completions}</td>
                          <td>{formatPercent(row.analytics.resumeRate)}</td>
                          <td>{row.analytics.quizAttempts > 0 ? formatPercent(row.analytics.quizPassRate) : '—'}</td>
                          <td>{formatDate(row.analytics.lastActivityAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <style>{`
        .progress-page { --bg-primary: #0B0D1A; --bg-secondary: rgba(15, 18, 35, 0.85); --bg-card: rgba(20, 24, 45, 0.75); --bg-card-solid: rgba(25, 30, 55, 0.95); --border-color: rgba(255, 255, 255, 0.08); --border-active: rgba(255, 255, 255, 0.25); --text-primary: #FAFAFA; --text-secondary: rgba(255, 255, 255, 0.65); --text-muted: rgba(255, 255, 255, 0.45); --accent: #D4A84B; --font-display: 'Cormorant Garamond', Georgia, serif; --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); overflow-x: hidden; font-family: var(--font-body); }
        .progress-page.light { --bg-primary: #E8F0F8; --bg-secondary: rgba(255, 255, 255, 0.9); --bg-card: rgba(255, 255, 255, 0.85); --bg-card-solid: rgba(255, 255, 255, 0.92); --border-color: rgba(0, 0, 0, 0.08); --border-active: rgba(0, 0, 0, 0.2); --text-primary: #1A1A2E; --text-secondary: rgba(26, 26, 46, 0.7); --text-muted: rgba(26, 26, 46, 0.5); --accent: #B8942F; background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%); }
        .progress-page.light .nebula { opacity: 0.2; filter: saturate(0.5) brightness(1.3); }
        .progress-page.light .star { background: rgba(0, 0, 0, 0.25); opacity: 0.35 !important; }
        .progress-page.light .star.bright { background: var(--accent); opacity: 0.6 !important; }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 2.5rem; opacity: 0; transform: translateY(-10px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .nav.mounted { opacity: 1; transform: translateY(0); }
        .nav-left { flex: 1; }
        .logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text-primary); }
        .logo-icon { width: 32px; height: 32px; color: var(--accent); }
        .logo-text { font-family: var(--font-display); font-size: 1.25rem; letter-spacing: 0.25em; }
        .nav-center { display: flex; align-items: center; gap: 2.5rem; }
        .nav-link { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); text-decoration: none; }
        .nav-link:hover { color: var(--text-primary); }
        .nav-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 1.5rem; }
        .main { position: relative; z-index: 10; max-width: 1120px; margin: 0 auto; padding: 7.5rem 1.5rem 3rem; opacity: 0; transform: translateY(20px); transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s; display: grid; gap: 1rem; }
        .main.mounted { opacity: 1; transform: translateY(0); }
        .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; background: var(--bg-card-solid); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.2rem; backdrop-filter: blur(18px); }
        h1 { margin: 0; font-family: var(--font-display); font-size: 2.1rem; font-weight: 350; }
        h2 { margin: 0; font-size: 1.1rem; }
        h3 { margin: 0; font-size: 1rem; }
        p { margin: 0.4rem 0 0; color: var(--text-secondary); line-height: 1.5; }
        .home-link { color: var(--accent); text-decoration: none; font-weight: 700; white-space: nowrap; }
        .metrics-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.7rem; }
        .metric-card { border: 1px solid var(--border-color); border-radius: 14px; padding: 0.85rem; background: rgba(255,255,255,0.03); display: grid; gap: 0.25rem; }
        .metric-card .label { color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.07em; }
        .metric-card strong { font-size: 1.55rem; font-weight: 800; }
        .panel { border: 1px solid var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.03); padding: 1rem; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.7rem; }
        .summary-card { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.7rem; background: rgba(255,255,255,0.02); }
        .summary-metrics { margin-top: 0.45rem; display: flex; gap: 0.45rem; flex-wrap: wrap; color: var(--text-secondary); font-size: 0.8rem; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 780px; }
        th, td { text-align: left; padding: 0.62rem 0.55rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        th { color: var(--text-secondary); font-weight: 650; font-size: 0.78rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .course-link { color: var(--text-primary); text-decoration: none; font-weight: 700; }
        .course-link:hover { color: var(--accent); }
        .muted { color: var(--text-secondary); }
        .state-card { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.8rem; background: rgba(255,255,255,0.03); }
        .state-card.error { color: #ffb4b4; border-color: rgba(255,180,180,0.55); }
        @media (max-width: 980px) {
          .nav-center { display: none; }
          .metrics-grid { grid-template-columns: 1fr 1fr; }
          .head { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 720px) {
          .metrics-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default ProgressPage;
