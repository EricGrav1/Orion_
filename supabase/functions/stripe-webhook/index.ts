import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type CheckoutTier = 'team' | 'pro' | 'solo' | 'creator';

type StripeEvent = {
  id?: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type ProfilePatch = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_tier?: string;
  subscription_status?: string;
  trial_ends_at?: string | null;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseStripeSignatureHeader(header: string): { t: string; v1: string[] } | null {
  if (!header) return null;
  const parts = header.split(',').map((p) => p.trim());
  const t = parts
    .map((p) => p.split('='))
    .find(([k]) => k === 't')?.[1];
  const v1 = parts
    .map((p) => p.split('='))
    .filter(([k]) => k === 'v1')
    .map(([, v]) => v)
    .filter(Boolean) as string[];
  if (!t || v1.length === 0) return null;
  return { t, v1 };
}

async function verifyStripeWebhook(input: { payload: string; signatureHeader: string; secret: string }): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(input.signatureHeader);
  if (!parsed) return false;
  const timestamp = parsed.t;
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > 300) return false;

  const signedPayload = `${timestamp}.${input.payload}`;
  const expected = await hmacSha256Hex(input.secret, signedPayload);
  return parsed.v1.some((candidate) => timingSafeEqual(candidate, expected));
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asTier(value: unknown): CheckoutTier | null {
  if (value === 'team' || value === 'pro' || value === 'solo' || value === 'creator') {
    return value;
  }
  return null;
}

function tierFromPriceId(priceId: string): CheckoutTier | null {
  const mapping: Record<CheckoutTier, string | undefined> = {
    team: Deno.env.get('STRIPE_PRICE_TEAM'),
    pro: Deno.env.get('STRIPE_PRICE_PRO'),
    solo: Deno.env.get('STRIPE_PRICE_SOLO'),
    creator: Deno.env.get('STRIPE_PRICE_CREATOR'),
  };

  const match = (Object.keys(mapping) as CheckoutTier[]).find((tier) => mapping[tier] === priceId);
  return match ?? null;
}

function normalizeSubscriptionStatus(status: string): string {
  if (!status) return 'active';
  if (status === 'trialing') return 'active';
  if (status === 'canceled') return 'inactive';
  return status;
}

async function recordEventIfFirstSeen(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  eventId: string;
  eventType: string;
  payloadHash: string;
}): Promise<boolean> {
  const supabaseAdmin = createClient(input.supabaseUrl, input.serviceRoleKey);
  const { error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      event_id: input.eventId,
      event_type: input.eventType,
      payload_sha256: input.payloadHash,
    });

  if (!error) return true;
  const code = (error as { code?: string }).code;
  if (code === '23505') return false;
  if (code === '42P01') return true;
  throw new Error(error.message);
}

async function updateProfileByUserId(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  patch: ProfilePatch;
}): Promise<void> {
  const supabaseAdmin = createClient(input.supabaseUrl, input.serviceRoleKey);
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(input.patch)
    .eq('user_id', input.userId);

  if (error) throw new Error(error.message);
}

async function findUserIdByCustomerId(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  customerId: string;
}): Promise<string | null> {
  const supabaseAdmin = createClient(input.supabaseUrl, input.serviceRoleKey);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', input.customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const userId = asString((data as { user_id?: unknown } | null)?.user_id);
  return userId || null;
}

function extractSubscriptionPriceId(object: Record<string, unknown>): string {
  const items = asObject(object.items);
  const data = Array.isArray(items.data) ? items.data : [];
  const first = asObject(data[0]);
  const price = asObject(first.price);
  return asString(price.id);
}

async function handleCheckoutCompleted(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  object: Record<string, unknown>;
}): Promise<void> {
  const metadata = asObject(input.object.metadata);
  const userId = asString(metadata.user_id);
  if (!userId) return;

  const tier = asTier(metadata.tier);
  const customerId = asString(input.object.customer);
  const subscriptionId = asString(input.object.subscription);

  const patch: ProfilePatch = {
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    subscription_status: 'active',
    trial_ends_at: null,
  };
  if (tier) patch.subscription_tier = tier;

  await updateProfileByUserId({
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    userId,
    patch,
  });
}

async function handleSubscriptionLifecycle(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  object: Record<string, unknown>;
  eventType: string;
}): Promise<void> {
  const metadata = asObject(input.object.metadata);
  const customerId = asString(input.object.customer);
  const subscriptionId = asString(input.object.id);
  const statusRaw = asString(input.object.status);

  let userId = asString(metadata.user_id);
  if (!userId && customerId) {
    userId = (await findUserIdByCustomerId({
      supabaseUrl: input.supabaseUrl,
      serviceRoleKey: input.serviceRoleKey,
      customerId,
    })) || '';
  }
  if (!userId) return;

  const tierFromMetadata = asTier(metadata.tier);
  const tierFromPrice = tierFromPriceId(extractSubscriptionPriceId(input.object));
  const resolvedTier = tierFromMetadata ?? tierFromPrice;

  const patch: ProfilePatch = {
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    subscription_status: normalizeSubscriptionStatus(statusRaw || (input.eventType === 'customer.subscription.deleted' ? 'inactive' : 'active')),
  };

  if (input.eventType === 'customer.subscription.deleted') {
    patch.subscription_status = 'inactive';
    patch.subscription_tier = 'trial';
    patch.stripe_subscription_id = null;
  } else if (resolvedTier) {
    patch.subscription_tier = resolvedTier;
    if (patch.subscription_status === 'active') patch.trial_ends_at = null;
  }

  await updateProfileByUserId({
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    userId,
    patch,
  });
}

async function handleInvoiceEvent(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  object: Record<string, unknown>;
  eventType: string;
}): Promise<void> {
  const customerId = asString(input.object.customer);
  if (!customerId) return;
  const userId = await findUserIdByCustomerId({
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    customerId,
  });
  if (!userId) return;

  const patch: ProfilePatch = {
    subscription_status: input.eventType === 'invoice.payment_failed' ? 'past_due' : 'active',
    stripe_customer_id: customerId,
  };
  if (input.eventType === 'invoice.payment_succeeded') patch.trial_ends_at = null;

  await updateProfileByUserId({
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    userId,
    patch,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const secret = requireEnv('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    const ok = await verifyStripeWebhook({ payload, signatureHeader: signature, secret });
    if (!ok) return jsonResponse({ error: 'Invalid signature' }, { status: 401 });

    const event = JSON.parse(payload) as StripeEvent;
    if (!event || typeof event.type !== 'string') {
      return jsonResponse({ error: 'Invalid event payload' }, { status: 400 });
    }

    const eventId = asString(event.id);
    if (eventId) {
      const payloadHash = await sha256Hex(payload);
      const shouldProcess = await recordEventIfFirstSeen({
        supabaseUrl,
        serviceRoleKey,
        eventId,
        eventType: event.type,
        payloadHash,
      });
      if (!shouldProcess) return jsonResponse({ received: true, duplicate: true });
    }

    const object = asObject(event.data?.object);

    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted({ supabaseUrl, serviceRoleKey, object });
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await handleSubscriptionLifecycle({
        supabaseUrl,
        serviceRoleKey,
        object,
        eventType: event.type,
      });
    } else if (event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_succeeded') {
      await handleInvoiceEvent({
        supabaseUrl,
        serviceRoleKey,
        object,
        eventType: event.type,
      });
    }

    return jsonResponse({ received: true });
  } catch (err: unknown) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
