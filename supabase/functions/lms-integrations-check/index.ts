import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type LmsProvider = 'moodle' | 'scorm_cloud';
type LmsHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'failed';

type LmsIntegrationRow = {
  id: string;
  team_id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
  health_status: string;
  last_checked_at: string | null;
  last_error: string | null;
};

type LmsCredentialRow = {
  integration_id: string;
  encrypted_payload: string;
  iv: string;
  auth_tag: string;
};

type TeamMemberRow = {
  role: string;
};

interface CheckBody {
  team_id?: unknown;
  provider?: unknown;
}

interface HealthCheckResult {
  status: LmsHealthStatus;
  error: string | null;
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

function isProvider(value: unknown): value is LmsProvider {
  return value === 'moodle' || value === 'scorm_cloud';
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function decryptCredentialPayload(row: LmsCredentialRow, secret: string): Promise<Record<string, string>> {
  const key = await importEncryptionKey(secret);
  const iv = fromBase64(row.iv);
  const ciphertext = fromBase64(row.encrypted_payload);
  const authTag = fromBase64(row.auth_tag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(decrypted))) as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string')
  ) as Record<string, string>;
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

async function checkMoodleHealth(
  config: Record<string, unknown>,
  credentials: Record<string, string>
): Promise<HealthCheckResult> {
  const baseUrl = typeof config.base_url === 'string' ? config.base_url.trim().replace(/\/+$/, '') : '';
  const token = credentials.service_token || '';
  if (!baseUrl) return { status: 'failed', error: 'Moodle base URL missing.' };
  if (!token) return { status: 'failed', error: 'Moodle service token missing.' };

  const endpoint =
    `${baseUrl}/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=core_webservice_get_site_info&wstoken=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(endpoint, { method: 'GET' });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;

    if (!response.ok) {
      return { status: 'failed', error: `Moodle HTTP ${response.status}` };
    }
    if (!payload || typeof payload !== 'object') {
      return { status: 'failed', error: 'Moodle returned non-JSON response.' };
    }
    if (typeof payload.exception === 'string' || typeof payload.errorcode === 'string') {
      const message = typeof payload.message === 'string' ? payload.message : 'Moodle rejected credentials.';
      return { status: 'failed', error: compactError(message) };
    }
    if (typeof payload.userid !== 'number' && typeof payload.userid !== 'string') {
      return { status: 'degraded', error: 'Moodle response missing user context.' };
    }
    return { status: 'healthy', error: null };
  } catch (error) {
    return {
      status: 'failed',
      error: compactError(error instanceof Error ? error.message : 'Moodle health check failed'),
    };
  }
}

async function checkScormCloudHealth(
  config: Record<string, unknown>,
  credentials: Record<string, string>
): Promise<HealthCheckResult> {
  const appId = typeof config.app_id === 'string' ? config.app_id.trim() : '';
  const secretKey = credentials.secret_key || '';
  const rawBase = typeof config.api_base_url === 'string' ? config.api_base_url.trim() : '';
  const apiBaseUrl = (rawBase || 'https://cloud.scorm.com/api/v2').replace(/\/+$/, '');

  if (!appId) return { status: 'failed', error: 'SCORM Cloud app id missing.' };
  if (!secretKey) return { status: 'failed', error: 'SCORM Cloud secret key missing.' };

  try {
    const basic = btoa(`${appId}:${secretKey}`);
    const response = await fetch(`${apiBaseUrl}/ping`, {
      method: 'GET',
      headers: {
        authorization: `Basic ${basic}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const compact = compactError(body);
      return {
        status: 'failed',
        error: `SCORM Cloud HTTP ${response.status}${compact ? `: ${compact}` : ''}`,
      };
    }
    return { status: 'healthy', error: null };
  } catch (error) {
    return {
      status: 'failed',
      error: compactError(error instanceof Error ? error.message : 'SCORM Cloud health check failed'),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionSecret = requireEnv('LMS_CREDENTIALS_ENCRYPTION_KEY');

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return jsonResponse({ error: 'Missing Authorization token' }, { status: 401 });

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError) return jsonResponse({ error: authError.message }, { status: 401 });
    if (!authData.user) return jsonResponse({ error: 'User not found' }, { status: 401 });

    const body = (await req.json().catch(() => null)) as CheckBody | null;
    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : '';
    const providerValue = typeof body?.provider === 'string' ? body.provider.trim() : '';

    if (!teamId) return jsonResponse({ error: 'team_id is required' }, { status: 400 });
    if (!isProvider(providerValue)) {
      return jsonResponse({ error: 'provider must be moodle or scorm_cloud' }, { status: 400 });
    }
    const provider = providerValue as LmsProvider;

    const canManage = await canManageWorkspace(adminClient, teamId, authData.user.id);
    if (!canManage) {
      return jsonResponse({ error: 'Only workspace owner/admin can test LMS integrations' }, { status: 403 });
    }

    const { data: integrationData, error: integrationError } = await adminClient
      .from('lms_integrations')
      .select('*')
      .eq('team_id', teamId)
      .eq('provider', provider)
      .maybeSingle();
    if (integrationError) throw new Error(integrationError.message);
    if (!integrationData) {
      return jsonResponse({ error: 'Integration not configured yet.' }, { status: 404 });
    }

    const integration = integrationData as LmsIntegrationRow;
    const { data: credentialData, error: credentialError } = await adminClient
      .from('lms_integration_credentials')
      .select('integration_id, encrypted_payload, iv, auth_tag')
      .eq('integration_id', integration.id)
      .maybeSingle();
    if (credentialError) throw new Error(credentialError.message);
    if (!credentialData) {
      const nowIso = new Date().toISOString();
      await adminClient
        .from('lms_integrations')
        .update({
          health_status: 'failed',
          last_checked_at: nowIso,
          last_error: 'Credentials missing.',
          updated_by: authData.user.id,
          updated_at: nowIso,
        })
        .eq('id', integration.id);
      return jsonResponse({
        status: 'failed',
        error: 'Credentials missing.',
      });
    }

    const credentials = await decryptCredentialPayload(credentialData as LmsCredentialRow, encryptionSecret);
    const result =
      provider === 'moodle'
        ? await checkMoodleHealth(integration.config, credentials)
        : await checkScormCloudHealth(integration.config, credentials);

    const nowIso = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from('lms_integrations')
      .update({
        health_status: result.status,
        last_checked_at: nowIso,
        last_error: result.error,
        updated_by: authData.user.id,
        updated_at: nowIso,
      })
      .eq('id', integration.id);
    if (updateError) throw new Error(updateError.message);

    return jsonResponse({
      status: result.status,
      error: result.error,
      last_checked_at: nowIso,
    });
  } catch (error) {
    return jsonResponse(
      { error: compactError(error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
});
