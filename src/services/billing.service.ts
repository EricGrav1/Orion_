import { supabase } from './supabase';

export type CheckoutTier = 'team' | 'pro' | 'solo' | 'creator';

export const billingService = {
  async createCheckoutUrl(input: { tier: CheckoutTier; priceId?: string }): Promise<string> {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: input,
    });
    if (error) throw error;
    const url = (data as { url?: unknown } | null)?.url;
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('Stripe checkout did not return a redirect URL.');
    }
    return url;
  },
  async createPortalUrl(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: {},
    });
    if (error) throw error;
    const url = (data as { url?: unknown } | null)?.url;
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('Stripe portal did not return a redirect URL.');
    }
    return url;
  },
};
