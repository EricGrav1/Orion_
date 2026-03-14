import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { teamService, type InviteRole } from '../services/team.service';
import { SpaceScene } from '../components/space/SpaceScene';
import { OrionClock } from '../components/space/OrionClock';
import { ThemeToggle } from '../components/space/ThemeToggle';
import { useOrionTheme } from '../hooks/useOrionTheme';
import { AccountMenu } from '../components/navigation/AccountMenu';
import type { Team, TeamInvite, TeamMember } from '../types/database.types';

interface TeamDraft {
  name: string;
  seatCount: number;
}

type TeamDraftMap = Record<string, TeamDraft>;

function formatDate(value: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function toDraftMap(teams: Team[]): TeamDraftMap {
  return teams.reduce<TeamDraftMap>((acc, team) => {
    acc[team.id] = {
      name: team.name,
      seatCount: team.seat_count,
    };
    return acc;
  }, {});
}

export function AccountPage() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, error, isBypassUser } = useProfile();
  const { theme, toggleTheme } = useOrionTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDrafts, setTeamDrafts] = useState<TeamDraftMap>({});
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [usage, setUsage] = useState<{ seats: number; members: number; pendingInvites: number; available: number } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSeats, setNewTeamSeats] = useState(3);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [roleSavingKey, setRoleSavingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [copyingInviteId, setCopyingInviteId] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  const seatUsageLabel = useMemo(() => {
    if (!usage) return '0 / 0';
    return `${usage.members + usage.pendingInvites} / ${usage.seats}`;
  }, [usage]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch {
      setWorkspaceMessage('Unable to sign out right now.');
    }
  };

  const loadTeams = async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const data = await teamService.getMyTeams();
      setTeams(data);
      setTeamDrafts(toDraftMap(data));
      setActiveTeamId((prev) => prev && data.some((team) => team.id === prev) ? prev : (data[0]?.id ?? null));
    } catch (teamsLoadError) {
      setTeamsError((teamsLoadError as Error).message);
    } finally {
      setTeamsLoading(false);
    }
  };

  const loadTeamAdminData = async (teamId: string) => {
    setMembersLoading(true);
    try {
      const [memberData, inviteData, usageData] = await Promise.all([
        teamService.getTeamMembers(teamId),
        teamService.getTeamInvites(teamId),
        teamService.getTeamUsage(teamId),
      ]);
      setMembers(memberData);
      setInvites(inviteData);
      setUsage(usageData);
    } catch (adminLoadError) {
      setWorkspaceMessage((adminLoadError as Error).message);
      setMembers([]);
      setInvites([]);
      setUsage(null);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  useEffect(() => {
    if (!activeTeamId) {
      setMembers([]);
      setInvites([]);
      setUsage(null);
      return;
    }
    void loadTeamAdminData(activeTeamId);
  }, [activeTeamId]);

  const handleTeamDraftChange = (teamId: string, patch: Partial<TeamDraft>) => {
    setTeamDrafts((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        ...patch,
      },
    }));
  };

  const handleSaveTeam = async (teamId: string) => {
    const draft = teamDrafts[teamId];
    if (!draft) return;
    setWorkspaceMessage(null);
    setSavingTeamId(teamId);
    try {
      await teamService.updateTeam(teamId, {
        name: draft.name,
        seat_count: draft.seatCount,
      });
      setWorkspaceMessage('Workspace updated.');
      await loadTeams();
      if (teamId === activeTeamId) {
        await loadTeamAdminData(teamId);
      }
    } catch (saveTeamError) {
      setWorkspaceMessage((saveTeamError as Error).message);
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleCreateWorkspace = async () => {
    setWorkspaceMessage(null);
    setIsCreatingTeam(true);
    try {
      const team = await teamService.createTeam(newTeamName || `Workspace ${teams.length + 1}`, newTeamSeats);
      setNewTeamName('');
      setNewTeamSeats(3);
      setWorkspaceMessage('Workspace created.');
      await loadTeams();
      setActiveTeamId(team.id);
    } catch (createTeamError) {
      setWorkspaceMessage((createTeamError as Error).message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleSendInvite = async () => {
    if (!activeTeamId) return;
    setWorkspaceMessage(null);
    setIsInviting(true);
    try {
      const result = await teamService.inviteMember(activeTeamId, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setWorkspaceMessage(result.emailError ? `Invite created. Email not sent: ${result.emailError}` : 'Invite created and email sent.');
      await loadTeamAdminData(activeTeamId);
    } catch (inviteError) {
      setWorkspaceMessage((inviteError as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, nextRole: InviteRole) => {
    if (!activeTeamId) return;
    const key = `${member.team_id}:${member.user_id}`;
    setRoleSavingKey(key);
    setWorkspaceMessage(null);
    try {
      await teamService.updateMemberRole(activeTeamId, member.user_id, nextRole);
      await loadTeamAdminData(activeTeamId);
      setWorkspaceMessage('Member role updated.');
    } catch (roleError) {
      setWorkspaceMessage((roleError as Error).message);
    } finally {
      setRoleSavingKey(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!activeTeamId) return;
    const key = `${member.team_id}:${member.user_id}`;
    setRemovingKey(key);
    setWorkspaceMessage(null);
    try {
      await teamService.removeMember(activeTeamId, member.user_id);
      await loadTeamAdminData(activeTeamId);
      setWorkspaceMessage('Member removed.');
    } catch (removeError) {
      setWorkspaceMessage((removeError as Error).message);
    } finally {
      setRemovingKey(null);
    }
  };

  const handleRevokeInvite = async (invite: TeamInvite) => {
    if (!activeTeamId) return;
    setRevokingInviteId(invite.id);
    setWorkspaceMessage(null);
    try {
      await teamService.revokeInvite(invite.id);
      await loadTeamAdminData(activeTeamId);
      setWorkspaceMessage('Invite revoked.');
    } catch (revokeError) {
      setWorkspaceMessage((revokeError as Error).message);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleResendInvite = async (invite: TeamInvite) => {
    if (!activeTeamId) return;
    setResendingInviteId(invite.id);
    setWorkspaceMessage(null);
    try {
      const result = await teamService.resendInvite(invite.id);
      setWorkspaceMessage(result.error ? `Resend failed: ${result.error}` : 'Invite email sent.');
      await loadTeamAdminData(activeTeamId);
    } catch (resendError) {
      setWorkspaceMessage((resendError as Error).message);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCopyInviteLink = async (invite: TeamInvite) => {
    setCopyingInviteId(invite.id);
    setWorkspaceMessage(null);
    try {
      const link = teamService.getInviteJoinUrl(invite.token);
      await navigator.clipboard.writeText(link);
      setWorkspaceMessage('Invite link copied.');
    } catch {
      setWorkspaceMessage('Unable to copy invite link.');
    } finally {
      setCopyingInviteId(null);
    }
  };

  return (
    <div className={`account-page ${theme}`}>
      <SpaceScene />
      <nav className="nav">
        <div className="nav-left">
          <Link to="/app" className="logo"><span className="logo-text">ORION</span></Link>
        </div>
        <div className="nav-center">
          <Link to="/app" className="nav-link">Dashboard</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <span className="nav-link active">Account</span>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <OrionClock />
          <AccountMenu email={user?.email} onSignOut={handleSignOut} compact />
        </div>
      </nav>

      <main className="content">
        <section className="card">
          <h1>Account Overview</h1>
          <p className="sub">Subscription profile and billing state for this Orion workspace.</p>
          {isLoading && <p>Loading profile...</p>}
          {error && <p className="error">{error}</p>}
          {!isLoading && !error && (
            <div className="grid">
              <div className="row"><span>Email</span><strong>{user?.email || 'N/A'}</strong></div>
              <div className="row"><span>Tier</span><strong>{profile?.subscription_tier || 'trial'}</strong></div>
              <div className="row"><span>Status</span><strong>{profile?.subscription_status || 'active'}</strong></div>
              <div className="row"><span>Trial Ends</span><strong>{formatDate(profile?.trial_ends_at || null)}</strong></div>
              <div className="row"><span>Dev Pro Bypass</span><strong>{isBypassUser ? 'Enabled' : 'Disabled'}</strong></div>
            </div>
          )}
          <div className="actions">
            <Link to="/pricing" className="btn primary">Manage billing</Link>
            <Link to="/courses" className="btn">Open courses</Link>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Workspace Admin</h2>
              <p className="sub">Manage workspaces, seats, roles, and pending invites.</p>
            </div>
            <button type="button" className="btn ghost" onClick={() => void loadTeams()} disabled={teamsLoading}>
              {teamsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="create-row">
            <input
              type="text"
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="New workspace name"
            />
            <input
              type="number"
              min={1}
              max={500}
              value={newTeamSeats}
              onChange={(event) => setNewTeamSeats(Number(event.target.value))}
            />
            <button type="button" className="btn primary" onClick={() => void handleCreateWorkspace()} disabled={isCreatingTeam}>
              {isCreatingTeam ? 'Creating…' : 'Create workspace'}
            </button>
          </div>

          {teamsLoading && <p>Loading workspace data...</p>}
          {teamsError && <p className="error">{teamsError}</p>}
          {workspaceMessage && <p className="message">{workspaceMessage}</p>}

          {!teamsLoading && teams.length === 0 ? (
            <p className="muted">No workspace yet. Create one to start seat and team setup.</p>
          ) : (
            <div className="team-grid">
              {teams.map((team) => {
                const draft = teamDrafts[team.id] ?? { name: team.name, seatCount: team.seat_count };
                const isSaving = savingTeamId === team.id;
                const isActive = team.id === activeTeamId;
                return (
                  <div className={`team-card ${isActive ? 'active' : ''}`} key={team.id}>
                    <button className="team-select" type="button" onClick={() => setActiveTeamId(team.id)}>
                      {isActive ? 'Managing this workspace' : 'Manage workspace'}
                    </button>
                    <div className="team-meta">{new Date(team.created_at).toLocaleDateString()}</div>
                    <label>
                      Workspace name
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(event) => handleTeamDraftChange(team.id, { name: event.target.value })}
                      />
                    </label>
                    <label>
                      Seats
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={draft.seatCount}
                        onChange={(event) => handleTeamDraftChange(team.id, { seatCount: Number(event.target.value) })}
                      />
                    </label>
                    <button type="button" className="btn" onClick={() => void handleSaveTeam(team.id)} disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Save workspace'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Members & Invites</h2>
              <p className="sub">{activeTeam ? activeTeam.name : 'Select a workspace'} · Seat usage {seatUsageLabel}</p>
            </div>
            {activeTeam && (
              <Link to={`/workspace/${activeTeam.id}/people`} className="btn">
                Open people page
              </Link>
            )}
          </div>

          <div className="invite-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Invite email"
              disabled={!activeTeam}
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as InviteRole)}
              disabled={!activeTeam}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              className="btn primary"
              onClick={() => void handleSendInvite()}
              disabled={!activeTeam || isInviting || (usage?.available ?? 0) <= 0}
            >
              {isInviting ? 'Inviting…' : (usage?.available ?? 0) <= 0 ? 'No seats left' : 'Send invite'}
            </button>
          </div>

          {membersLoading ? (
            <p>Loading members and invites…</p>
          ) : (
            <div className="admin-grid">
              <div className="admin-panel">
                <h3>Members ({members.length})</h3>
                {members.length === 0 ? (
                  <p className="muted">No members yet.</p>
                ) : (
                  <div className="list">
                    {members.map((member) => {
                      const key = `${member.team_id}:${member.user_id}`;
                      const isOwner = activeTeam?.owner_id === member.user_id || member.role === 'owner';
                      return (
                        <div className="list-row" key={key}>
                          <div className="member-meta">
                            <strong>{isOwner ? 'Owner' : 'Member'}</strong>
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
              <div className="admin-panel">
                <h3>Invites ({invites.filter((invite) => invite.status === 'pending').length} pending)</h3>
                {invites.length === 0 ? (
                  <p className="muted">No invites yet.</p>
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
          )}
        </section>
      </main>

      <style>{`
        .account-page { min-height: 100vh; background: #0B0D1A; color: #FAFAFA; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; }
        .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(10,12,24,0.72); backdrop-filter: blur(14px); }
        .logo { color: inherit; text-decoration: none; }
        .logo-text { letter-spacing: 0.14em; font-weight: 900; }
        .nav-center { display: flex; gap: 1.25rem; align-items: center; }
        .nav-link { color: rgba(255,255,255,0.68); text-decoration: none; font-weight: 650; }
        .nav-link.active { color: rgba(255,255,255,0.95); }
        .nav-right { display: flex; align-items: center; gap: 0.9rem; }
        .content { position: relative; z-index: 1; max-width: 1100px; margin: 2rem auto; padding: 0 1rem 2rem; display: grid; gap: 1rem; }
        .card { border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.25rem; background: rgba(20,24,45,0.78); }
        .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.8rem; }
        h1, h2, h3 { margin: 0 0 0.4rem; }
        .sub { margin: 0 0 1rem; color: rgba(255,255,255,0.72); }
        .error { color: #ffb4b4; }
        .message { color: #c6f2d3; }
        .muted { color: rgba(255,255,255,0.66); }
        .grid { display: grid; gap: 0.55rem; margin-bottom: 1rem; }
        .row { display: flex; justify-content: space-between; gap: 0.8rem; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.6rem 0.7rem; background: rgba(255,255,255,0.03); }
        .row span { color: rgba(255,255,255,0.68); }
        .actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
        .btn { border: 1px solid rgba(255,255,255,0.16); color: #FAFAFA; text-decoration: none; border-radius: 10px; padding: 0.48rem 0.8rem; background: rgba(255,255,255,0.06); cursor: pointer; font-weight: 700; }
        .btn.primary { background: linear-gradient(135deg, #D4A84B, #7ac9ff); color: #101327; border-color: transparent; }
        .btn.ghost { background: transparent; }
        .btn:disabled { opacity: 0.6; cursor: default; }
        .create-row { display: grid; grid-template-columns: 1.2fr 120px auto; gap: 0.55rem; margin-bottom: 0.9rem; }
        .team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.7rem; margin-top: 0.65rem; }
        .team-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem; background: rgba(255,255,255,0.03); display: grid; gap: 0.5rem; }
        .team-card.active { border-color: rgba(122,201,255,0.6); box-shadow: 0 0 0 1px rgba(122,201,255,0.25) inset; }
        .team-select { border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); padding: 0.3rem 0.55rem; font-size: 0.74rem; cursor: pointer; justify-self: start; }
        .team-meta { font-size: 0.72rem; color: rgba(255,255,255,0.6); }
        .invite-row { display: grid; grid-template-columns: 1fr 150px auto; gap: 0.55rem; margin-bottom: 0.9rem; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
        .admin-panel { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem; background: rgba(255,255,255,0.03); }
        .list { display: grid; gap: 0.45rem; }
        .list-row { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.52rem 0.58rem; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; }
        .member-meta { display: grid; gap: 0.18rem; min-width: 0; }
        .member-meta strong, .member-meta span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .member-meta span { color: rgba(255,255,255,0.68); font-size: 0.76rem; }
        .invite-meta { color: rgba(255,255,255,0.56); font-size: 0.72rem; }
        .delivery { font-style: normal; text-transform: capitalize; font-weight: 600; }
        .delivery.sent { color: #aef0c4; }
        .delivery.failed { color: #ffc2c2; }
        .delivery.not_sent { color: #f5d596; }
        .row-actions { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
        .pill { border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 0.22rem 0.45rem; font-size: 0.74rem; color: rgba(255,255,255,0.78); }
        label { display: grid; gap: 0.22rem; font-size: 0.8rem; color: rgba(255,255,255,0.76); }
        input, select {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          color: #FAFAFA;
          padding: 0.5rem 0.55rem;
          font-size: 0.9rem;
        }
        @media (max-width: 900px) {
          .nav-center { display: none; }
          .create-row, .invite-row { grid-template-columns: 1fr; }
          .admin-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
