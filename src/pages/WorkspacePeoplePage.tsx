import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { teamService, type InviteRole } from '../services/team.service';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { AccountMenu } from '../components/navigation/AccountMenu';
import type { Team, TeamInvite, TeamMember } from '../types/database.types';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function WorkspacePeoplePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useOrionTheme();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [usage, setUsage] = useState<{ seats: number; members: number; pendingInvites: number; available: number } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [roleSavingKey, setRoleSavingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [copyingInviteId, setCopyingInviteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const seatUsageLabel = useMemo(() => {
    if (!usage) return '0 / 0';
    return `${usage.members + usage.pendingInvites} / ${usage.seats}`;
  }, [usage]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch {
      setMessage('Unable to sign out right now.');
    }
  };

  const loadData = async () => {
    if (!teamId) return;
    setLoading(true);
    setMessage(null);
    try {
      const [teamData, memberData, inviteData, usageData] = await Promise.all([
        teamService.getTeamById(teamId),
        teamService.getTeamMembers(teamId),
        teamService.getTeamInvites(teamId),
        teamService.getTeamUsage(teamId),
      ]);
      setTeam(teamData);
      setMembers(memberData);
      setInvites(inviteData);
      setUsage(usageData);
      if (!teamData) {
        setMessage('Workspace not found or unavailable.');
      }
    } catch (loadError) {
      setMessage((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [teamId]);

  const handleSendInvite = async () => {
    if (!teamId) return;
    setIsInviting(true);
    setMessage(null);
    try {
      const result = await teamService.inviteMember(teamId, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setMessage(result.emailError ? `Invite created. Email not sent: ${result.emailError}` : 'Invite sent.');
      await loadData();
    } catch (inviteError) {
      setMessage((inviteError as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, nextRole: InviteRole) => {
    if (!teamId) return;
    const key = `${member.team_id}:${member.user_id}`;
    setRoleSavingKey(key);
    setMessage(null);
    try {
      await teamService.updateMemberRole(teamId, member.user_id, nextRole);
      await loadData();
      setMessage('Role updated.');
    } catch (roleError) {
      setMessage((roleError as Error).message);
    } finally {
      setRoleSavingKey(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!teamId) return;
    const key = `${member.team_id}:${member.user_id}`;
    setRemovingKey(key);
    setMessage(null);
    try {
      await teamService.removeMember(teamId, member.user_id);
      await loadData();
      setMessage('Member removed.');
    } catch (removeError) {
      setMessage((removeError as Error).message);
    } finally {
      setRemovingKey(null);
    }
  };

  const handleRevokeInvite = async (invite: TeamInvite) => {
    setRevokingInviteId(invite.id);
    setMessage(null);
    try {
      await teamService.revokeInvite(invite.id);
      await loadData();
      setMessage('Invite revoked.');
    } catch (revokeError) {
      setMessage((revokeError as Error).message);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleResendInvite = async (invite: TeamInvite) => {
    setResendingInviteId(invite.id);
    setMessage(null);
    try {
      const result = await teamService.resendInvite(invite.id);
      setMessage(result.error ? `Resend failed: ${result.error}` : 'Invite email sent.');
      await loadData();
    } catch (resendError) {
      setMessage((resendError as Error).message);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCopyInviteLink = async (invite: TeamInvite) => {
    setCopyingInviteId(invite.id);
    setMessage(null);
    try {
      const link = teamService.getInviteJoinUrl(invite.token);
      await navigator.clipboard.writeText(link);
      setMessage('Invite link copied.');
    } catch {
      setMessage('Unable to copy invite link.');
    } finally {
      setCopyingInviteId(null);
    }
  };

  return (
    <div className={`people-page ${theme}`}>
      <SpaceScene />
      <nav className="nav">
        <div className="nav-left">
          <Link to="/app" className="logo"><span className="logo-text">ORION</span></Link>
        </div>
        <div className="nav-center">
          <Link to="/courses" className="nav-link">Courses</Link>
          <Link to="/account" className="nav-link">Account</Link>
          <span className="nav-link active">Workspace People</span>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
          <AccountMenu email={user?.email} onSignOut={handleSignOut} compact />
        </div>
      </nav>

      <main className="content">
        <section className="card">
          <div className="head">
            <div>
              <h1>{team?.name || 'Workspace People'}</h1>
              <p className="sub">Members, invites, and role access for this workspace.</p>
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => void loadData()} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
              <Link to="/account" className="btn">Back to account</Link>
            </div>
          </div>

          <div className="summary">
            <div className="summary-card"><span>Seat usage</span><strong>{seatUsageLabel}</strong></div>
            <div className="summary-card"><span>Available</span><strong>{usage?.available ?? 0}</strong></div>
            <div className="summary-card"><span>Pending invites</span><strong>{usage?.pendingInvites ?? 0}</strong></div>
          </div>

          <div className="invite-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Invite email"
              disabled={!team}
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as InviteRole)}
              disabled={!team}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              className="btn primary"
              onClick={() => void handleSendInvite()}
              disabled={!team || isInviting || (usage?.available ?? 0) <= 0}
            >
              {isInviting ? 'Inviting…' : (usage?.available ?? 0) <= 0 ? 'No seats left' : 'Send invite'}
            </button>
          </div>

          {message && <p className="message">{message}</p>}

          <div className="grid">
            <div className="panel">
              <h3>Members ({members.length})</h3>
              {members.length === 0 ? (
                <p className="muted">No members.</p>
              ) : (
                <div className="list">
                  {members.map((member) => {
                    const key = `${member.team_id}:${member.user_id}`;
                    const isOwner = team?.owner_id === member.user_id || member.role === 'owner';
                    return (
                      <div className="list-row" key={key}>
                        <div className="member-meta">
                          <strong>{isOwner ? 'Owner' : member.role}</strong>
                          <span>{member.user_id}</span>
                        </div>
                        <div className="row-actions">
                          {isOwner ? (
                            <span className="pill">Owner</span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(event) => void handleRoleChange(member, event.target.value as InviteRole)}
                                disabled={roleSavingKey === key}
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() => void handleRemoveMember(member)}
                                disabled={removingKey === key}
                              >
                                {removingKey === key ? 'Removing…' : 'Remove'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="panel">
              <h3>Invites ({invites.filter((invite) => invite.status === 'pending').length} pending)</h3>
              {invites.length === 0 ? (
                <p className="muted">No invites.</p>
              ) : (
                <div className="list">
                  {invites.map((invite) => (
                    <div className="list-row" key={invite.id}>
                      <div className="member-meta">
                        <strong>{invite.email}</strong>
                        <span>{invite.role} · {invite.status}</span>
                        <span className="invite-meta">
                          Delivery: <em className={`delivery ${invite.email_delivery_status}`}>{invite.email_delivery_status}</em> · Last send {formatDateTime(invite.email_sent_at)}
                        </span>
                      </div>
                      <div className="row-actions">
                        {invite.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void handleCopyInviteLink(invite)}
                              disabled={copyingInviteId === invite.id}
                            >
                              {copyingInviteId === invite.id ? 'Copying…' : 'Copy link'}
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void handleResendInvite(invite)}
                              disabled={resendingInviteId === invite.id}
                            >
                              {resendingInviteId === invite.id ? 'Sending…' : 'Resend'}
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void handleRevokeInvite(invite)}
                              disabled={revokingInviteId === invite.id}
                            >
                              {revokingInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                            </button>
                          </>
                        ) : (
                          <span className="pill">{invite.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .people-page { min-height: 100vh; background: #0B0D1A; color: #FAFAFA; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; }
        .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(10,12,24,0.72); backdrop-filter: blur(14px); }
        .logo { color: inherit; text-decoration: none; }
        .logo-text { letter-spacing: 0.14em; font-weight: 900; }
        .nav-center { display: flex; gap: 1.25rem; align-items: center; }
        .nav-link { color: rgba(255,255,255,0.68); text-decoration: none; font-weight: 650; }
        .nav-link.active { color: rgba(255,255,255,0.95); }
        .nav-right { display: flex; align-items: center; gap: 0.9rem; }
        .content { position: relative; z-index: 1; max-width: 1100px; margin: 2rem auto; padding: 0 1rem 2rem; }
        .card { border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(20,24,45,0.78); padding: 1.2rem; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.8rem; }
        h1, h3 { margin: 0 0 0.4rem; }
        .sub { margin: 0; color: rgba(255,255,255,0.72); }
        .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; margin: 0.9rem 0; }
        .summary-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(255,255,255,0.03); padding: 0.55rem 0.6rem; display: flex; justify-content: space-between; }
        .summary-card span { color: rgba(255,255,255,0.68); font-size: 0.8rem; }
        .invite-row { display: grid; grid-template-columns: 1fr 150px auto; gap: 0.55rem; margin-bottom: 0.8rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .panel { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 0.72rem; }
        .list { display: grid; gap: 0.45rem; }
        .list-row { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(255,255,255,0.02); padding: 0.5rem 0.58rem; display: flex; justify-content: space-between; gap: 0.5rem; }
        .member-meta { display: grid; gap: 0.16rem; min-width: 0; }
        .member-meta strong, .member-meta span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .member-meta span { color: rgba(255,255,255,0.66); font-size: 0.76rem; }
        .invite-meta { color: rgba(255,255,255,0.56); font-size: 0.72rem; }
        .delivery { font-style: normal; text-transform: capitalize; font-weight: 600; }
        .delivery.sent { color: #aef0c4; }
        .delivery.failed { color: #ffc2c2; }
        .delivery.not_sent { color: #f5d596; }
        .row-actions { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
        .pill { border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 0.2rem 0.45rem; font-size: 0.74rem; color: rgba(255,255,255,0.78); }
        .message { color: #c6f2d3; }
        .muted { color: rgba(255,255,255,0.68); }
        .btn { border: 1px solid rgba(255,255,255,0.16); color: #FAFAFA; text-decoration: none; border-radius: 10px; padding: 0.48rem 0.8rem; background: rgba(255,255,255,0.06); cursor: pointer; font-weight: 700; }
        .btn.primary { background: linear-gradient(135deg, #D4A84B, #7ac9ff); border-color: transparent; color: #101327; }
        .btn.ghost { background: transparent; }
        .btn:disabled { opacity: 0.6; cursor: default; }
        .actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
        input, select { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; background: rgba(255,255,255,0.03); color: #FAFAFA; padding: 0.5rem 0.55rem; }
        @media (max-width: 920px) {
          .nav-center { display: none; }
          .summary { grid-template-columns: 1fr; }
          .invite-row { grid-template-columns: 1fr; }
          .grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
