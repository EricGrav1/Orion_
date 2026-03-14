import { supabase } from './supabase';
import type { Profile } from '../types/database.types';

export const profileService = {
  async getMyProfile(): Promise<Profile> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Profile;

    // Self-heal: existing auth users might not have a profiles row (if trigger was added later).
    const meta = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;
    const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : null;

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userData.user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;
    return inserted as Profile;
  },
};
