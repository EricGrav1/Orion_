import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type TeamInviteRow = {
  id: string;
  team_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  email_attempts: number;
};

type TeamRow = {
  id: string;
  name: string;
  owner_id: string;
};

type TeamMemberRow = {
  role: string;
};

interface InviteSendRequestBody {
  invite_id?: unknown;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
      ...(init?.headers ?? {}),
    },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function compactError(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function getJoinBaseUrl(req: Request): string {
  const configured = Deno.env.get('APP_BASE_URL') || Deno.env.get('SITE_URL') || '';
  if (configured) return configured.replace(/\/+$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/+$/, '');
  throw new Error('Missing APP_BASE_URL or SITE_URL.');
}

async function canManageWorkspace(adminClient: ReturnType<typeof createClient>, teamId: string, userId: string): Promise<boolean> {
  const { data: teamData, error: teamError } = await adminClient
    .from('teams')
    .select('id, owner_id')
    .eq('id', teamId)
    .maybeSingle();
  if (teamError) throw new Error(teamError.message);
  if (!teamData) return false;
  if ((teamData as { owner_id: string }).owner_id === userId) return true;

  const { data: membership, error: memberError } = await adminClient
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  if (memberError) throw new Error(memberError.message);
  if (!membership) return false;
  return ['owner', 'admin'].includes((membership as TeamMemberRow).role);
}

async function markDelivery(
  adminClient: ReturnType<typeof createClient>,
  invite: TeamInviteRow,
  patch: {
    email_delivery_status: 'sent' | 'failed';
    email_delivery_error: string | null;
    email_sent_at?: string | null;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const nextAttempts = (invite.email_attempts ?? 0) + 1;
  const { error } = await adminClient
    .from('team_invites')
    .update({
      email_delivery_status: patch.email_delivery_status,
      email_delivery_error: patch.email_delivery_error,
      email_last_attempt_at: nowIso,
      email_sent_at: patch.email_sent_at ?? null,
      email_attempts: nextAttempts,
    })
    .eq('id', invite.id);
  if (error) throw new Error(error.message);
}

async function sendInviteEmail(input: {
  resendApiKey: string;
  fromEmail: string;
  invite: TeamInviteRow;
  team: TeamRow;
  joinBaseUrl: string;
}): Promise<void> {
  const joinUrl = `${input.joinBaseUrl}/join/${input.invite.token}`;
  const subject = `You're invited to join ${input.team.name} on Orion`;
  const html = `
    <div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Join ${input.team.name} on Orion</h2>
      <p>You were invited to collaborate in Orion. Click the button below to accept your invite.</p>
      <p style="margin: 20px 0;">
        <a href="${joinUrl}" style="display: inline-block; background: #101327; color: #FFFFFF; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700;">Accept invite</a>
      </p>
      <p style="font-size: 13px; color: #6B7280;">If the button does not work, paste this link into your browser:</p>
      <p style="font-size: 13px; color: #4B5563;">${joinUrl}</p>
    </div>
  `.trim();
  const text = [
    `Join ${input.team.name} on Orion`,
    '',
    'You were invited to collaborate in Orion.',
    `Accept invite: ${joinUrl}`,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: input.fromEmail,
      to: [input.invite.email],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const compact = compactError(errorBody);
    throw new Error(`Resend error ${response.status}${compact ? `: ${compact}` : ''}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = requireEnv('RESEND_API_KEY');
    const inviteFromEmail = requireEnv('INVITE_FROM_EMAIL');

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return jsonResponse({ error: 'Missing Authorization token' }, { status: 401 });

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError) return jsonResponse({ error: authError.message }, { status: 401 });
    if (!authData.user) return jsonResponse({ error: 'User not found' }, { status: 401 });

    const body = (await req.json().catch(() => null)) as InviteSendRequestBody | null;
    const inviteId = typeof body?.invite_id === 'string' ? body.invite_id.trim() : '';
    if (!inviteId) {
      return jsonResponse({ error: 'invite_id is required' }, { status: 400 });
    }

    const { data: inviteData, error: inviteError } = await adminClient
      .from('team_invites')
      .select('id, team_id, email, token, status, expires_at, email_attempts')
      .eq('id', inviteId)
      .maybeSingle();
    if (inviteError) throw new Error(inviteError.message);
    if (!inviteData) return jsonResponse({ error: 'Invite not found' }, { status: 404 });

    const invite = inviteData as TeamInviteRow;
    const canManage = await canManageWorkspace(adminClient, invite.team_id, authData.user.id);
    if (!canManage) {
      return jsonResponse({ error: 'Only workspace owner/admin can send invites' }, { status: 403 });
    }

    if (invite.status !== 'pending') {
      return jsonResponse({ error: 'Invite is not pending' }, { status: 400 });
    }
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await adminClient
        .from('team_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)
        .eq('status', 'pending');
      return jsonResponse({ error: 'Invite has expired' }, { status: 400 });
    }

    const { data: teamData, error: teamError } = await adminClient
      .from('teams')
      .select('id, name, owner_id')
      .eq('id', invite.team_id)
      .single();
    if (teamError) throw new Error(teamError.message);

    const team = teamData as TeamRow;
    const joinBaseUrl = getJoinBaseUrl(req);

    try {
      await sendInviteEmail({
        resendApiKey,
        fromEmail: inviteFromEmail,
        invite,
        team,
        joinBaseUrl,
      });
      await markDelivery(adminClient, invite, {
        email_delivery_status: 'sent',
        email_delivery_error: null,
        email_sent_at: new Date().toISOString(),
      });
      return jsonResponse({ sent: true, status: 'sent' });
    } catch (sendError) {
      const reason = compactError(sendError instanceof Error ? sendError.message : 'Invite email send failed');
      await markDelivery(adminClient, invite, {
        email_delivery_status: 'failed',
        email_delivery_error: reason,
      });
      return jsonResponse({ sent: false, status: 'failed', error: reason }, { status: 200 });
    }
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
