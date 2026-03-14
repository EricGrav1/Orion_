import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

function isSafeNextPath(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function getOAuthRedirectUrl(nextPath?: string | null): string {
  const configuredRedirect = import.meta.env.VITE_OAUTH_REDIRECT_TO?.trim();
  if (configuredRedirect) {
    try {
      const url = new URL(configuredRedirect);
      if (isSafeNextPath(nextPath)) {
        url.searchParams.set('next', nextPath);
      }
      return url.toString();
    } catch {
      return configuredRedirect;
    }
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    const isLocalHostname = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocalHostname) {
      const redirectUrl = new URL(`http://localhost:${port || '5173'}/auth`);
      if (isSafeNextPath(nextPath)) {
        redirectUrl.searchParams.set('next', nextPath);
      }
      return redirectUrl.toString();
    }
  }

  if (typeof window === 'undefined') return '/';
  const url = new URL('/auth', window.location.origin);
  if (isSafeNextPath(nextPath)) {
    url.searchParams.set('next', nextPath);
  }
  return url.toString();
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          isLoading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
  };

  const signInWithGoogle = async (nextPath?: string | null) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(nextPath),
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: !!authState.session,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };
}
