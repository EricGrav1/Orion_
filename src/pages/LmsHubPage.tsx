import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseService } from '../services/course.service';
import { teamService } from '../services/team.service';
import { lmsService, type LmsHealthStatus, type LmsProvider } from '../services/lms.service';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { AccountMenu } from '../components/navigation/AccountMenu';
import type { Course, LmsIntegration, Team } from '../types/database.types';
import { parseCourseShareSettings } from '../utils/courseShare';

type ProviderState = {
  moodle: {
    baseUrl: string;
    serviceToken: string;
  };
  scorm_cloud: {
    appId: string;
    apiBaseUrl: string;
    secretKey: string;
  };
};

const INITIAL_PROVIDER_STATE: ProviderState = {
  moodle: {
    baseUrl: '',
    serviceToken: '',
  },
  scorm_cloud: {
    appId: '',
    apiBaseUrl: 'https://cloud.scorm.com/api/v2',
    secretKey: '',
  },
};

function getSafePersistedTeamId(): string | null {
  try {
    const value = localStorage.getItem('orion-lms-team-id');
    if (!value) return null;
    return value;
  } catch {
    return null;
  }
}

function saveTeamId(teamId: string) {
  try {
    localStorage.setItem('orion-lms-team-id', teamId);
  } catch {
    return;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
}

function getStatusLabel(value: string): LmsHealthStatus {
  if (value === 'healthy' || value === 'degraded' || value === 'failed' || value === 'unknown') return value;
  return 'unknown';
}

function providerConfigToForm(integrations: LmsIntegration[]): ProviderState {
  const next: ProviderState = {
    moodle: {
      baseUrl: '',
      serviceToken: '',
    },
    scorm_cloud: {
      appId: '',
      apiBaseUrl: 'https://cloud.scorm.com/api/v2',
      secretKey: '',
    },
  };
  const moodle = integrations.find((integration) => integration.provider === 'moodle');
  const scorm = integrations.find((integration) => integration.provider === 'scorm_cloud');

  if (moodle && typeof moodle.config === 'object' && moodle.config !== null && !Array.isArray(moodle.config)) {
    const config = moodle.config as Record<string, unknown>;
    if (typeof config.base_url === 'string') next.moodle.baseUrl = config.base_url;
  }

  if (scorm && typeof scorm.config === 'object' && scorm.config !== null && !Array.isArray(scorm.config)) {
    const config = scorm.config as Record<string, unknown>;
    if (typeof config.app_id === 'string') next.scorm_cloud.appId = config.app_id;
    if (typeof config.api_base_url === 'string' && config.api_base_url.trim()) {
      next.scorm_cloud.apiBaseUrl = config.api_base_url;
    }
  }

  return next;
}

export function LmsHubPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useOrionTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [shareViews, setShareViews] = useState<Record<string, number>>({});
  const [integrations, setIntegrations] = useState<LmsIntegration[]>([]);
  const [providerState, setProviderState] = useState<ProviderState>(INITIAL_PROVIDER_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState<LmsProvider | null>(null);
  const [isCheckingProvider, setIsCheckingProvider] = useState<LmsProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch {
      setMessage('Unable to sign out right now.');
    }
  };

  const loadIntegrations = async (teamId: string) => {
    setIsLoadingIntegrations(true);
    try {
      const data = await lmsService.getTeamIntegrations(teamId);
      setIntegrations(data);
      setProviderState((prev) => ({
        ...providerConfigToForm(data),
        moodle: {
          ...providerConfigToForm(data).moodle,
          serviceToken: prev.moodle.serviceToken,
        },
        scorm_cloud: {
          ...providerConfigToForm(data).scorm_cloud,
          secretKey: prev.scorm_cloud.secretKey,
        },
      }));
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  const loadHubData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [teamList, courseList] = await Promise.all([
        teamService.getMyTeams(),
        courseService.getCourses(),
      ]);
      setTeams(teamList);
      setCourses(courseList);

      const published = courseList.filter((course) => parseCourseShareSettings(course.settings).published);
      const views = await Promise.all(
        published.slice(0, 8).map(async (course) => {
          const count = await courseService.getShareViewCount(course.id);
          return [course.id, count] as const;
        })
      );
      setShareViews(Object.fromEntries(views));

      const persisted = getSafePersistedTeamId();
      const defaultTeamId =
        (persisted && teamList.some((team) => team.id === persisted) ? persisted : null) ??
        teamList[0]?.id ??
        null;
      setActiveTeamId(defaultTeamId);
      if (defaultTeamId) {
        await loadIntegrations(defaultTeamId);
      } else {
        setIntegrations([]);
      }
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHubData();
  }, []);

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  const publishedCourses = useMemo(
    () => courses.filter((course) => parseCourseShareSettings(course.settings).published),
    [courses]
  );

  const providerMeta = useMemo(() => {
    const moodle = integrations.find((integration) => integration.provider === 'moodle') ?? null;
    const scormCloud = integrations.find((integration) => integration.provider === 'scorm_cloud') ?? null;
    return { moodle, scormCloud };
  }, [integrations]);

  const handleSelectTeam = async (teamId: string) => {
    setActiveTeamId(teamId);
    saveTeamId(teamId);
    setMessage(null);
    setError(null);
    await loadIntegrations(teamId);
  };

  const handleSaveProvider = async (provider: LmsProvider) => {
    if (!activeTeamId) return;
    setIsSavingProvider(provider);
    setMessage(null);
    setError(null);
    try {
      if (provider === 'moodle') {
        await lmsService.upsertIntegration({
          teamId: activeTeamId,
          provider: 'moodle',
          config: {
            base_url: providerState.moodle.baseUrl.trim(),
          },
          credentials: providerState.moodle.serviceToken.trim()
            ? { service_token: providerState.moodle.serviceToken.trim() }
            : undefined,
        });
        setProviderState((prev) => ({
          ...prev,
          moodle: {
            ...prev.moodle,
            serviceToken: '',
          },
        }));
      } else {
        await lmsService.upsertIntegration({
          teamId: activeTeamId,
          provider: 'scorm_cloud',
          config: {
            app_id: providerState.scorm_cloud.appId.trim(),
            api_base_url: providerState.scorm_cloud.apiBaseUrl.trim(),
          },
          credentials: providerState.scorm_cloud.secretKey.trim()
            ? { secret_key: providerState.scorm_cloud.secretKey.trim() }
            : undefined,
        });
        setProviderState((prev) => ({
          ...prev,
          scorm_cloud: {
            ...prev.scorm_cloud,
            secretKey: '',
          },
        }));
      }

      setMessage(provider === 'moodle' ? 'Moodle settings saved.' : 'SCORM Cloud settings saved.');
      await loadIntegrations(activeTeamId);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setIsSavingProvider(null);
    }
  };

  const handleCheckProvider = async (provider: LmsProvider) => {
    if (!activeTeamId) return;
    setIsCheckingProvider(provider);
    setMessage(null);
    setError(null);
    try {
      const result = await lmsService.checkIntegration(activeTeamId, provider);
      setMessage(
        result.error
          ? `${provider === 'moodle' ? 'Moodle' : 'SCORM Cloud'} check: ${result.error}`
          : `${provider === 'moodle' ? 'Moodle' : 'SCORM Cloud'} connection healthy.`
      );
      await loadIntegrations(activeTeamId);
    } catch (checkError) {
      setError((checkError as Error).message);
    } finally {
      setIsCheckingProvider(null);
    }
  };

  return (
    <div className={`lms-page ${theme}`}>
      <SpaceScene />
      <nav className="nav">
        <div className="nav-left">
          <Link to="/app" className="logo"><span className="logo-text">ORION</span></Link>
        </div>
        <div className="nav-center">
          <Link to="/courses" className="nav-link">Courses</Link>
          <Link to="/account" className="nav-link">Account</Link>
          <span className="nav-link active">LMS Hub</span>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
          <AccountMenu email={user?.email} onSignOut={handleSignOut} compact />
        </div>
      </nav>

      <main className="content">
        <section className="card">
          <h1>LMS Hub</h1>
          <p className="sub">Secure integration config and connection health checks by workspace.</p>
          {message && <p className="message">{message}</p>}
          {error && <p className="error">{error}</p>}
          {isLoading ? (
            <p>Loading LMS data...</p>
          ) : (
            <div className="summary">
              <div className="summary-card"><span>Total courses</span><strong>{courses.length}</strong></div>
              <div className="summary-card"><span>Published courses</span><strong>{publishedCourses.length}</strong></div>
              <div className="summary-card"><span>Tracked views</span><strong>{Object.values(shareViews).reduce((sum, value) => sum + value, 0)}</strong></div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="head-row">
            <h2>Workspace</h2>
            <button type="button" className="btn ghost" onClick={() => void loadHubData()} disabled={isLoading || isLoadingIntegrations}>
              {isLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {teams.length === 0 ? (
            <p className="muted">No workspace found. Create one from account settings first.</p>
          ) : (
            <select
              className="workspace-select"
              value={activeTeamId ?? ''}
              onChange={(event) => void handleSelectTeam(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          )}
          {activeTeam && <p className="muted">Managing integrations for <strong>{activeTeam.name}</strong>.</p>}
        </section>

        <section className="card">
          <h2>LMS Integrations</h2>
          {!activeTeamId ? (
            <p className="muted">Select a workspace to manage integrations.</p>
          ) : (
            <div className="provider-grid">
              <div className="provider-card">
                <div className="provider-head">
                  <h3>Moodle</h3>
                  <span className={`health ${getStatusLabel(providerMeta.moodle?.health_status ?? 'unknown')}`}>
                    {getStatusLabel(providerMeta.moodle?.health_status ?? 'unknown')}
                  </span>
                </div>
                <label>
                  Base URL
                  <input
                    type="url"
                    placeholder="https://your-moodle-instance.com"
                    value={providerState.moodle.baseUrl}
                    onChange={(event) =>
                      setProviderState((prev) => ({
                        ...prev,
                        moodle: { ...prev.moodle, baseUrl: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Service Token (secret)
                  <input
                    type="password"
                    placeholder="Paste to create/rotate token"
                    value={providerState.moodle.serviceToken}
                    onChange={(event) =>
                      setProviderState((prev) => ({
                        ...prev,
                        moodle: { ...prev.moodle, serviceToken: event.target.value },
                      }))
                    }
                  />
                </label>
                <div className="meta-row">
                  <span>Last checked: {formatDateTime(providerMeta.moodle?.last_checked_at ?? null)}</span>
                </div>
                {providerMeta.moodle?.last_error && <p className="error-line">{providerMeta.moodle.last_error}</p>}
                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void handleSaveProvider('moodle')}
                    disabled={isSavingProvider === 'moodle'}
                  >
                    {isSavingProvider === 'moodle' ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void handleCheckProvider('moodle')}
                    disabled={isCheckingProvider === 'moodle' || isLoadingIntegrations}
                  >
                    {isCheckingProvider === 'moodle' ? 'Testing…' : 'Test connection'}
                  </button>
                </div>
              </div>

              <div className="provider-card">
                <div className="provider-head">
                  <h3>SCORM Cloud</h3>
                  <span className={`health ${getStatusLabel(providerMeta.scormCloud?.health_status ?? 'unknown')}`}>
                    {getStatusLabel(providerMeta.scormCloud?.health_status ?? 'unknown')}
                  </span>
                </div>
                <label>
                  App ID
                  <input
                    type="text"
                    placeholder="app id"
                    value={providerState.scorm_cloud.appId}
                    onChange={(event) =>
                      setProviderState((prev) => ({
                        ...prev,
                        scorm_cloud: { ...prev.scorm_cloud, appId: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  API Base URL
                  <input
                    type="url"
                    placeholder="https://cloud.scorm.com/api/v2"
                    value={providerState.scorm_cloud.apiBaseUrl}
                    onChange={(event) =>
                      setProviderState((prev) => ({
                        ...prev,
                        scorm_cloud: { ...prev.scorm_cloud, apiBaseUrl: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Secret Key (secret)
                  <input
                    type="password"
                    placeholder="Paste to create/rotate secret"
                    value={providerState.scorm_cloud.secretKey}
                    onChange={(event) =>
                      setProviderState((prev) => ({
                        ...prev,
                        scorm_cloud: { ...prev.scorm_cloud, secretKey: event.target.value },
                      }))
                    }
                  />
                </label>
                <div className="meta-row">
                  <span>Last checked: {formatDateTime(providerMeta.scormCloud?.last_checked_at ?? null)}</span>
                </div>
                {providerMeta.scormCloud?.last_error && <p className="error-line">{providerMeta.scormCloud.last_error}</p>}
                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void handleSaveProvider('scorm_cloud')}
                    disabled={isSavingProvider === 'scorm_cloud'}
                  >
                    {isSavingProvider === 'scorm_cloud' ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void handleCheckProvider('scorm_cloud')}
                    disabled={isCheckingProvider === 'scorm_cloud' || isLoadingIntegrations}
                  >
                    {isCheckingProvider === 'scorm_cloud' ? 'Testing…' : 'Test connection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="head-row">
            <h2>Distribution Monitor</h2>
            <Link to="/progress" className="btn">Open progress dashboard</Link>
          </div>
          {publishedCourses.length === 0 ? (
            <p className="muted">No published courses yet. Publish from the course editor to track distribution.</p>
          ) : (
            <div className="course-list">
              {publishedCourses.map((course) => (
                <div className="course-row" key={course.id}>
                  <div>
                    <div className="course-title">{course.title}</div>
                    <div className="course-meta">Updated {new Date(course.updated_at).toLocaleDateString()}</div>
                  </div>
                  <div className="course-actions">
                    <span className="pill">{shareViews[course.id] ?? 0} views</span>
                    <Link to={`/course/${course.id}`} className="btn ghost">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <style>{`
        .lms-page { min-height: 100vh; background: #0B0D1A; color: #FAFAFA; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; }
        .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(10,12,24,0.72); backdrop-filter: blur(14px); }
        .logo { color: inherit; text-decoration: none; }
        .logo-text { letter-spacing: 0.14em; font-weight: 900; }
        .nav-center { display: flex; gap: 1.25rem; align-items: center; }
        .nav-link { color: rgba(255,255,255,0.68); text-decoration: none; font-weight: 650; }
        .nav-link.active { color: rgba(255,255,255,0.95); }
        .nav-right { display: flex; align-items: center; gap: 0.9rem; }
        .content { position: relative; z-index: 1; max-width: 1100px; margin: 2rem auto; padding: 0 1rem 2rem; display: grid; gap: 1rem; }
        .card { border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(20,24,45,0.78); padding: 1.2rem; }
        h1, h2, h3 { margin: 0 0 0.45rem; }
        .sub { margin: 0; color: rgba(255,255,255,0.72); }
        .head-row { display: flex; justify-content: space-between; align-items: center; gap: 0.55rem; margin-bottom: 0.6rem; }
        .summary { margin-top: 0.8rem; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; }
        .summary-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.55rem 0.65rem; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; }
        .summary-card span { color: rgba(255,255,255,0.68); font-size: 0.82rem; }
        .workspace-select { width: 100%; border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; background: rgba(255,255,255,0.03); color: #FAFAFA; padding: 0.55rem; font-size: 0.9rem; }
        .provider-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-top: 0.4rem; }
        .provider-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 0.75rem; display: grid; gap: 0.45rem; }
        .provider-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
        .health { border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); padding: 0.18rem 0.5rem; font-size: 0.72rem; text-transform: capitalize; color: rgba(255,255,255,0.84); }
        .health.healthy { color: #aef0c4; border-color: rgba(174,240,196,0.55); }
        .health.degraded { color: #f5d596; border-color: rgba(245,213,150,0.55); }
        .health.failed { color: #ffb4b4; border-color: rgba(255,180,180,0.55); }
        .meta-row { font-size: 0.74rem; color: rgba(255,255,255,0.66); }
        .error-line { margin: 0; font-size: 0.75rem; color: #ffb4b4; }
        label { display: grid; gap: 0.24rem; font-size: 0.8rem; color: rgba(255,255,255,0.76); }
        input { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; background: rgba(255,255,255,0.03); color: #FAFAFA; padding: 0.5rem 0.55rem; font-size: 0.9rem; }
        .course-list { display: grid; gap: 0.5rem; margin-top: 0.6rem; }
        .course-row { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.55rem 0.65rem; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
        .course-title { font-weight: 700; }
        .course-meta { font-size: 0.76rem; color: rgba(255,255,255,0.66); }
        .course-actions { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
        .pill { border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 0.2rem 0.45rem; font-size: 0.74rem; color: rgba(255,255,255,0.78); }
        .btn { border: 1px solid rgba(255,255,255,0.16); color: #FAFAFA; text-decoration: none; border-radius: 10px; padding: 0.48rem 0.8rem; background: rgba(255,255,255,0.06); cursor: pointer; font-weight: 700; }
        .btn.ghost { background: transparent; }
        .message { color: #c6f2d3; }
        .error { color: #ffb4b4; }
        .muted { color: rgba(255,255,255,0.68); }
        @media (max-width: 900px) {
          .nav-center { display: none; }
          .summary { grid-template-columns: 1fr; }
          .provider-grid { grid-template-columns: 1fr; }
          .course-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
