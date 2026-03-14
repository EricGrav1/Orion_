import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

function asHttpOrigin(input: string | null): string | null {
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  const siteOrigin = asHttpOrigin(requireEnv('SITE_URL'));
  if (siteOrigin) allowed.add(siteOrigin);

  const extrasRaw = Deno.env.get('ALLOWED_ORIGINS') || '';
  extrasRaw
    .split(',')
    .map((value) => asHttpOrigin(value.trim()))
    .filter((value): value is string => Boolean(value))
    .forEach((value) => allowed.add(value));

  return allowed;
}

function pickOrigin(req: Request): string {
  const allowedOrigins = getAllowedOrigins();
  const siteOrigin = asHttpOrigin(requireEnv('SITE_URL'));
  if (!siteOrigin) throw new Error('SITE_URL must be a valid absolute URL');

  const originHeader = asHttpOrigin(req.headers.get('origin'));
  if (originHeader && allowedOrigins.has(originHeader)) return originHeader;

  const referer = req.headers.get('referer');
  const refererOrigin = referer ? asHttpOrigin(referer) : null;
  if (refererOrigin && allowedOrigins.has(refererOrigin)) return refererOrigin;

  return siteOrigin;
}

async function createPortalSession(input: { customerId: string; origin: string }): Promise<string> {
  const stripeKey = requireEnv('STRIPE_SECRET_KEY');
  const params = new URLSearchParams();
  params.set('customer', input.customerId);
  params.set('return_url', `${input.origin}/app`);

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stripeKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const compact = text.replace(/\s+/g, ' ').trim().slice(0, 240);
    throw new Error(`Stripe error ${res.status}: ${compact || 'Unknown error'}`);
  }

  const payload = (await res.json().catch(() => null)) as { url?: unknown } | null;
  const url = payload?.url;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Stripe portal session missing url.');
  }
  return url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return jsonResponse({ error: 'Missing Authorization token' }, { status: 401 });

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError) return jsonResponse({ error: authError.message }, { status: 401 });
    if (!authData.user) return jsonResponse({ error: 'User not found' }, { status: 401 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError) return jsonResponse({ error: profileError.message }, { status: 500 });
    const customerId = (profile as { stripe_customer_id?: unknown } | null)?.stripe_customer_id;
    if (typeof customerId !== 'string' || customerId.length === 0) {
      return jsonResponse({ error: 'No Stripe customer found for this account.' }, { status: 400 });
    }

    const origin = pickOrigin(req);
    const url = await createPortalSession({ customerId, origin });
    return jsonResponse({ url });
  } catch (err: unknown) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
