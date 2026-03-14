import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type LmsProvider = 'moodle' | 'scorm_cloud';

type LmsIntegrationRow = {
  id: string;
  team_id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
  health_status: string;
  last_checked_at: string | null;
  last_error: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type TeamMemberRow = {
  role: string;
};

interface UpsertBody {
  team_id?: unknown;
  provider?: unknown;
  config?: unknown;
  credentials?: unknown;
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

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function compactError(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function isProvider(value: unknown): value is LmsProvider {
  return value === 'moodle' || value === 'scorm_cloud';
}

function normalizeConfig(provider: LmsProvider, config: unknown): Record<string, unknown> {
  const input = typeof config === 'object' && config !== null ? (config as Record<string, unknown>) : {};
  if (provider === 'moodle') {
    const baseUrl = typeof input.base_url === 'string' ? input.base_url.trim().replace(/\/+$/, '') : '';
    return { base_url: baseUrl };
  }

  const appId = typeof input.app_id === 'string' ? input.app_id.trim() : '';
  const apiBaseUrlRaw = typeof input.api_base_url === 'string' ? input.api_base_url.trim() : '';
  const apiBaseUrl = (apiBaseUrlRaw || 'https://cloud.scorm.com/api/v2').replace(/\/+$/, '');
  return {
    app_id: appId,
    api_base_url: apiBaseUrl,
  };
}

function normalizeCredentials(provider: LmsProvider, credentials: unknown): Record<string, string> | null {
  const input = typeof credentials === 'object' && credentials !== null ? (credentials as Record<string, unknown>) : {};
  if (provider === 'moodle') {
    const serviceToken = typeof input.service_token === 'string' ? input.service_token.trim() : '';
    if (!serviceToken) return null;
    return { service_token: serviceToken };
  }

  const secretKey = typeof input.secret_key === 'string' ? input.secret_key.trim() : '';
  if (!secretKey) return null;
  return { secret_key: secretKey };
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

async function importEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptCredentialPayload(payload: Record<string, string>, secret: string) {
  const key = await importEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  const tagLength = 16;
  const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
  const authTag = encrypted.slice(encrypted.length - tagLength);

  return {
    encrypted_payload: toBase64(ciphertext),
    iv: toBase64(iv),
    auth_tag: toBase64(authTag),
    key_version: 'v1',
  };
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

    const body = (await req.json().catch(() => null)) as UpsertBody | null;
    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : '';
    const providerValue = typeof body?.provider === 'string' ? body.provider.trim() : '';

    if (!teamId) return jsonResponse({ error: 'team_id is required' }, { status: 400 });
    if (!isProvider(providerValue)) {
      return jsonResponse({ error: 'provider must be moodle or scorm_cloud' }, { status: 400 });
    }

    const canManage = await canManageWorkspace(adminClient, teamId, authData.user.id);
    if (!canManage) {
      return jsonResponse({ error: 'Only workspace owner/admin can manage LMS integrations' }, { status: 403 });
    }

    const provider = providerValue as LmsProvider;
    const nextConfig = normalizeConfig(provider, body?.config);
    const nowIso = new Date().toISOString();

    const { data: integrationData, error: integrationError } = await adminClient
      .from('lms_integrations')
      .upsert(
        {
          team_id: teamId,
          provider,
          config: nextConfig,
          updated_by: authData.user.id,
          updated_at: nowIso,
        },
        {
          onConflict: 'team_id,provider',
        }
      )
      .select('*')
      .single();
    if (integrationError) throw new Error(integrationError.message);

    const integration = integrationData as LmsIntegrationRow;
    const normalizedCredentials = normalizeCredentials(provider, body?.credentials);

    if (normalizedCredentials) {
      const encrypted = await encryptCredentialPayload(normalizedCredentials, encryptionSecret);
      const { error: credentialError } = await adminClient
        .from('lms_integration_credentials')
        .upsert(
          {
            integration_id: integration.id,
            encrypted_payload: encrypted.encrypted_payload,
            iv: encrypted.iv,
            auth_tag: encrypted.auth_tag,
            key_version: encrypted.key_version,
            updated_at: nowIso,
          },
          { onConflict: 'integration_id' }
        );
      if (credentialError) throw new Error(credentialError.message);
    }

    return jsonResponse({ integration });
  } catch (error) {
    return jsonResponse(
      { error: compactError(error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
});
