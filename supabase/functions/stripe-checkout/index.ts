import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type CheckoutTier = 'team' | 'pro' | 'solo' | 'creator';

type ProfileRow = {
  stripe_customer_id: string | null;
};

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

function getPriceIdForTier(tier: CheckoutTier): string {
  const mapping: Record<CheckoutTier, string> = {
    team: requireEnv('STRIPE_PRICE_TEAM'),
    pro: requireEnv('STRIPE_PRICE_PRO'),
    solo: requireEnv('STRIPE_PRICE_SOLO'),
    creator: requireEnv('STRIPE_PRICE_CREATOR'),
  };
  return mapping[tier];
}

async function fetchStripeCustomerId(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
}): Promise<string | null> {
  const supabaseAdmin = createClient(input.supabaseUrl, input.serviceRoleKey);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const customerId = (data as ProfileRow | null)?.stripe_customer_id;
  return typeof customerId === 'string' && customerId.length > 0 ? customerId : null;
}

async function createStripeCheckoutSession(input: {
  priceId: string;
  customerEmail: string;
  customerId: string | null;
  userId: string;
  tier: CheckoutTier;
  origin: string;
}): Promise<string> {
  const stripeKey = requireEnv('STRIPE_SECRET_KEY');
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('success_url', `${input.origin}/app?checkout=success`);
  params.set('cancel_url', `${input.origin}/pricing?checkout=cancel`);
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('allow_promotion_codes', 'true');
  params.set('client_reference_id', input.userId);
  params.set('metadata[user_id]', input.userId);
  params.set('metadata[tier]', input.tier);
  params.set('subscription_data[metadata][user_id]', input.userId);
  params.set('subscription_data[metadata][tier]', input.tier);
  params.set('subscription_data[metadata][source]', 'orion_checkout');

  if (input.customerId) params.set('customer', input.customerId);
  else params.set('customer_email', input.customerEmail);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
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
    throw new Error('Stripe checkout session missing url.');
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

    const body = (await req.json().catch(() => null)) as { tier?: unknown; priceId?: unknown } | null;
    const tier = typeof body?.tier === 'string' ? (body.tier as CheckoutTier) : null;
    if (!tier || !['team', 'pro', 'solo', 'creator'].includes(tier)) {
      return jsonResponse({ error: 'Invalid tier' }, { status: 400 });
    }

    const configuredPriceId = getPriceIdForTier(tier);
    const clientPriceId = typeof body?.priceId === 'string' ? body.priceId : '';
    if (clientPriceId && clientPriceId !== configuredPriceId) {
      return jsonResponse({ error: 'Price/tier mismatch' }, { status: 400 });
    }

    const origin = pickOrigin(req);
    const email = authData.user.email || '';
    if (!email) return jsonResponse({ error: 'User email required for checkout' }, { status: 400 });

    const customerId = await fetchStripeCustomerId({
      supabaseUrl,
      serviceRoleKey,
      userId: authData.user.id,
    });

    const url = await createStripeCheckoutSession({
      priceId: configuredPriceId,
      customerEmail: email,
      customerId,
      userId: authData.user.id,
      tier,
      origin,
    });

    return jsonResponse({ url });
  } catch (err: unknown) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
