import { supabase } from './supabase';
import type { Team, TeamInvite, TeamMember } from '../types/database.types';

interface UpdateTeamInput {
  name?: string;
  seat_count?: number;
}

export type TeamRole = 'owner' | 'admin' | 'member';
export type InviteRole = 'admin' | 'member';
export type InviteDeliveryStatus = 'not_sent' | 'sent' | 'failed';

export interface TeamInviteDetails {
  invite: TeamInvite;
  team: Team | null;
}

export interface InviteEmailSendResult {
  sent: boolean;
  status: InviteDeliveryStatus;
  error: string | null;
}

export interface InviteMemberResult {
  invite: TeamInvite;
  emailSent: boolean;
  emailError: string | null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function generateInviteToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return `tinv_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  return `tinv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function getCurrentUserId(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('User not authenticated');
  return userData.user.id;
}

export const teamService = {
  async getCurrentUserId(): Promise<string> {
    return getCurrentUserId();
  },

  async getMyTeams(): Promise<Team[]> {
    const userId = await getCurrentUserId();
    const [{ data: memberRows, error: memberError }, { data: ownerRows, error: ownerError }] = await Promise.all([
      supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId),
      supabase
        .from('teams')
        .select('*')
        .eq('owner_id', userId),
    ]);
    if (memberError) throw memberError;
    if (ownerError) throw ownerError;

    const memberTeamIds = (memberRows ?? []).map((row) => row.team_id);
    const ownerTeams = (ownerRows ?? []) as Team[];
    const ownerTeamIds = ownerTeams.map((team) => team.id);
    const allTeamIds = Array.from(new Set([...memberTeamIds, ...ownerTeamIds]));

    if (allTeamIds.length === 0) return [];

    const { data: teams, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .in('id', allTeamIds)
      .order('created_at', { ascending: true });
    if (teamError) throw teamError;
    return (teams ?? []) as Team[];
  },

  async getTeamById(teamId: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as Team | null;
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as TeamMember[];
  },

  async getTeamInvites(teamId: string): Promise<TeamInvite[]> {
    const { data, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as TeamInvite[];
  },

  async getInviteByToken(token: string): Promise<TeamInviteDetails | null> {
    const normalized = token.trim();
    if (!normalized) return null;

    const { data: inviteData, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', normalized)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!inviteData) return null;

    const invite = inviteData as TeamInvite;
    const team = await this.getTeamById(invite.team_id);
    return { invite, team };
  },

  async getTeamUsage(teamId: string): Promise<{ seats: number; members: number; pendingInvites: number; available: number }> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('seat_count')
      .eq('id', teamId)
      .single();

    if (teamError) throw teamError;

    const [{ count: memberCount, error: memberError }, { count: pendingCount, error: pendingError }] = await Promise.all([
      supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId),
      supabase
        .from('team_invites')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'pending'),
    ]);

    if (memberError) throw memberError;
    if (pendingError) throw pendingError;

    const seats = team.seat_count ?? 1;
    const members = memberCount ?? 0;
    const pendingInvites = pendingCount ?? 0;
    const available = Math.max(0, seats - (members + pendingInvites));

    return { seats, members, pendingInvites, available };
  },

  async createTeam(name: string, seatCount = 1): Promise<Team> {
    const userId = await getCurrentUserId();

    const finalSeatCount = Math.max(1, Math.min(500, Math.round(seatCount)));
    const teamName = name.trim();
    if (!teamName) throw new Error('Team name is required');

    const { data, error } = await supabase
      .from('teams')
      .insert({
        owner_id: userId,
        name: teamName,
        seat_count: finalSeatCount,
      })
      .select()
      .single();

    if (error) throw error;

    const newTeam = data as Team;
    const { error: ownerMemberError } = await supabase
      .from('team_members')
      .insert({
        team_id: newTeam.id,
        user_id: userId,
        role: 'owner',
      });

    if (ownerMemberError) {
      await supabase.from('teams').delete().eq('id', newTeam.id);
      throw ownerMemberError;
    }

    return newTeam;
  },

  async updateTeam(id: string, updates: UpdateTeamInput): Promise<Team> {
    const next: UpdateTeamInput = {};

    if (typeof updates.name === 'string') {
      const trimmedName = updates.name.trim();
      if (!trimmedName) throw new Error('Team name is required');
      next.name = trimmedName;
    }

    if (typeof updates.seat_count === 'number') {
      const requestedSeatCount = Math.max(1, Math.min(500, Math.round(updates.seat_count)));
      const usage = await teamService.getTeamUsage(id);
      if (requestedSeatCount < usage.members) {
        throw new Error(`Seat count cannot be lower than current members (${usage.members}).`);
      }
      next.seat_count = requestedSeatCount;
    }

    const { data, error } = await supabase
      .from('teams')
      .update(next)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Team;
  },

  async inviteMember(teamId: string, email: string, role: InviteRole = 'member'): Promise<InviteMemberResult> {
    const userId = await getCurrentUserId();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    const usage = await teamService.getTeamUsage(teamId);
    if (usage.available <= 0) {
      throw new Error('No seats available. Increase seat count before inviting.');
    }

    const { data: existingPendingInvite, error: existingInviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingInviteError) throw existingInviteError;
    if (existingPendingInvite) {
      throw new Error('A pending invite already exists for this email.');
    }

    const { data, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: normalizedEmail,
        role,
        status: 'pending',
        invited_by: userId,
        token: generateInviteToken(),
      })
      .select()
      .single();

    if (error) throw error;

    const invite = data as TeamInvite;
    let emailError: string | null = null;
    let emailSent = false;
    try {
      const emailResult = await this.sendInviteEmail(invite.id);
      emailSent = emailResult.sent;
      emailError = emailResult.error;
    } catch (sendError) {
      emailError = sendError instanceof Error ? sendError.message : 'Invite created, but email delivery failed.';
    }

    return {
      invite,
      emailSent,
      emailError,
    };
  },

  getInviteJoinUrl(token: string): string {
    const baseUrl = (import.meta.env.VITE_APP_BASE_URL?.trim() || window.location.origin).replace(/\/+$/, '');
    return `${baseUrl}/join/${token}`;
  },

  async sendInviteEmail(inviteId: string): Promise<InviteEmailSendResult> {
    const trimmed = inviteId.trim();
    if (!trimmed) throw new Error('Invite ID is required.');

    const { data, error } = await supabase.functions.invoke('team-invite-send', {
      body: { invite_id: trimmed },
    });

    if (error) throw error;
    const sent = Boolean(data?.sent);
    const status = (data?.status ?? (sent ? 'sent' : 'failed')) as InviteDeliveryStatus;
    const message = typeof data?.error === 'string' && data.error.trim().length > 0 ? data.error.trim() : null;
    return {
      sent,
      status,
      error: message,
    };
  },

  async resendInvite(inviteId: string): Promise<InviteEmailSendResult> {
    return this.sendInviteEmail(inviteId);
  },

  async acceptInvite(token: string): Promise<{ teamId: string }> {
    const normalized = token.trim();
    if (!normalized) throw new Error('Invalid invite token.');

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error('User not authenticated');
    const userEmail = normalizeEmail(userData.user.email ?? '');
    if (!userEmail) throw new Error('Authenticated user has no email.');

    const details = await this.getInviteByToken(normalized);
    if (!details) throw new Error('Invite not found or unavailable.');

    const { invite, team } = details;
    if (!team) throw new Error('Workspace not found for this invite.');
    if (invite.status !== 'pending') throw new Error('Invite is no longer pending.');

    const inviteEmail = normalizeEmail(invite.email);
    if (inviteEmail !== userEmail) {
      throw new Error('Invite email does not match the current signed-in account.');
    }
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      throw new Error('Invite has expired.');
    }

    const { count: memberCount, error: memberCountError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', invite.team_id);
    if (memberCountError) throw memberCountError;
    if ((memberCount ?? 0) >= (team.seat_count ?? 1)) {
      throw new Error('No seats available in this workspace.');
    }

    const { error: memberUpsertError } = await supabase
      .from('team_members')
      .upsert(
        {
          team_id: invite.team_id,
          user_id: userData.user.id,
          role: invite.role,
        },
        {
          onConflict: 'team_id,user_id',
        }
      );
    if (memberUpsertError) throw memberUpsertError;

    const { error: inviteUpdateError } = await supabase
      .from('team_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);
    if (inviteUpdateError) throw inviteUpdateError;

    return { teamId: invite.team_id };
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('team_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  async updateMemberRole(teamId: string, userId: string, role: InviteRole): Promise<TeamMember> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();
    if (teamError) throw teamError;
    if (team.owner_id === userId) {
      throw new Error('Owner role cannot be changed.');
    }

    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as TeamMember;
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();
    if (teamError) throw teamError;
    if (team.owner_id === userId) {
      throw new Error('Owner cannot be removed from workspace.');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
