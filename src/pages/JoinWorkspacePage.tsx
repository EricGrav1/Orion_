import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { teamService, type TeamInviteDetails } from '../services/team.service';
import { SpaceScene } from '../components/space/SpaceScene';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function JoinWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<TeamInviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const authRedirectPath = token ? `/auth?next=${encodeURIComponent(`/join/${token}`)}` : '/auth';

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    teamService
      .getInviteByToken(token)
      .then((data) => {
        if (!active) return;
        setDetails(data);
        if (!data) {
          setError('Invite not found or unavailable for your account.');
        }
      })
      .catch((inviteError) => {
        if (!active) return;
        setError((inviteError as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);
    try {
      const result = await teamService.acceptInvite(token);
      setAccepted(true);
      setTimeout(() => {
        navigate(`/workspace/${result.teamId}/people`);
      }, 500);
    } catch (acceptError) {
      setError((acceptError as Error).message);
    } finally {
      setIsAccepting(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return <Navigate to={authRedirectPath} replace />;
  }

  return (
    <div className="join-page">
      <SpaceScene />
      <main className="join-main">
        <section className="join-card">
          <h1>Join Workspace</h1>
          {(authLoading || loading) && isAuthenticated && (
            <p className="sub">Checking invite details...</p>
          )}

          {!loading && isAuthenticated && details && (
            <div className="invite-grid">
              <div className="row"><span>Workspace</span><strong>{details.team?.name || details.invite.team_id}</strong></div>
              <div className="row"><span>Invited email</span><strong>{details.invite.email}</strong></div>
              <div className="row"><span>Role</span><strong>{details.invite.role}</strong></div>
              <div className="row"><span>Expires</span><strong>{formatDateTime(details.invite.expires_at)}</strong></div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {accepted && <p className="ok">Invite accepted. Redirecting...</p>}

          {!loading && isAuthenticated && details && details.invite.status === 'pending' && !accepted && (
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void handleAcceptInvite()} disabled={isAccepting}>
                {isAccepting ? 'Accepting…' : 'Accept invite'}
              </button>
              <Link to="/account" className="btn">Account</Link>
            </div>
          )}
        </section>
      </main>

      <style>{`
        .join-page { min-height: 100vh; background: #0B0D1A; color: #FAFAFA; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; }
        .join-main { position: relative; z-index: 2; min-height: 100vh; display: grid; place-items: center; padding: 1.25rem; }
        .join-card { width: min(540px, 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; background: rgba(20,24,45,0.78); padding: 1.2rem; backdrop-filter: blur(12px); }
        h1 { margin: 0 0 0.5rem; }
        .sub { margin: 0 0 1rem; color: rgba(255,255,255,0.72); }
        .invite-grid { display: grid; gap: 0.5rem; margin-bottom: 0.9rem; }
        .row { display: flex; justify-content: space-between; gap: 0.6rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(255,255,255,0.03); padding: 0.56rem 0.65rem; }
        .row span { color: rgba(255,255,255,0.7); }
        .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .btn { border: 1px solid rgba(255,255,255,0.16); color: #FAFAFA; text-decoration: none; border-radius: 10px; padding: 0.5rem 0.8rem; background: rgba(255,255,255,0.06); font-weight: 700; cursor: pointer; }
        .btn.primary { background: linear-gradient(135deg, #D4A84B, #7ac9ff); border-color: transparent; color: #101327; }
        .btn:disabled { opacity: 0.6; cursor: default; }
        .error { color: #ffb4b4; }
        .ok { color: #c6f2d3; }
      `}</style>
    </div>
  );
}
