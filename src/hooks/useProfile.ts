import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { profileService } from '../services/profile.service';
import type { Profile } from '../types/database.types';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export function useProfile() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (authLoading) return;
      if (!isAuthenticated || !user) {
        setState({ profile: null, isLoading: false, error: null });
        return;
      }
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const profile = await profileService.getMyProfile();
        if (cancelled) return;
        setState({ profile, isLoading: false, error: null });
      } catch (err: unknown) {
        if (cancelled) return;
        setState({
          profile: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load profile',
        });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const isBypassUser = useMemo(() => {
    const forceProMode = import.meta.env.DEV && import.meta.env.VITE_FORCE_PRO_MODE === 'true';
    if (forceProMode) return true;

    const email = user?.email?.trim().toLowerCase();
    if (!email) return false;
    const allowlist = (import.meta.env.VITE_PRO_ACCESS_EMAILS || '')
      .split(',')
      .map((value: string) => value.trim().toLowerCase())
      .filter(Boolean);
    return allowlist.includes(email);
  }, [user?.email]);

  const isTrialExpired = useMemo(() => {
    if (isBypassUser) return false;
    const profile = state.profile;
    if (!profile) return false;
    if (profile.subscription_status !== 'active') return true;
    if (profile.subscription_tier !== 'trial') return false;
    if (!profile.trial_ends_at) return false;
    const ends = new Date(profile.trial_ends_at).getTime();
    if (!Number.isFinite(ends)) return false;
    return ends < Date.now();
  }, [isBypassUser, state.profile]);

  return { ...state, isTrialExpired, isBypassUser };
}
