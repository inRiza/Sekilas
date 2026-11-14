'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { createBusiness } from '@/lib/api/crud';
import { CURRENT_USER } from '@/lib/mock/business';
import { createClient } from '@/lib/supabase/client';
import type { UserAccount } from '@/types/api';

const DEMO_SESSION_KEY = 'sekilas_demo_user_v1';
const AUTH_EVENT = 'sekilas:auth-changed';

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
}

function mapSupabaseUser(user: User): UserAccount {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    user.email?.split('@')[0] ||
    'Pengguna Sekilas';

  return {
    id: user.id,
    name: fullName,
    email: user.email ?? '',
    avatar_url: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
  };
}

export function setDemoUserSession(user: UserAccount | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
  }
  notifyAuthChanged();
}

export function getDemoUserSession(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserAccount) : null;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<{ user: UserAccount | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('invalid login credentials')) {
      return { user: null, error: 'Email atau kata sandi belum tepat.' };
    }
    if (msg.includes('email not confirmed')) {
      return { user: null, error: 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.' };
    }
    return { user: null, error: error?.message ?? 'Gagal masuk. Silakan coba lagi.' };
  }

  const mapped = mapSupabaseUser(data.user);
  setDemoUserSession(null);
  notifyAuthChanged();
  return { user: mapped, error: null };
}

export async function signUpWithEmailPassword(params: {
  name: string;
  businessName: string;
  email: string;
  password: string;
}): Promise<{
  user: UserAccount | null;
  needsEmailConfirmation: boolean;
  error: string | null;
}> {
  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/businesses`,
      data: {
        full_name: params.name.trim(),
        business_name: params.businessName.trim(),
      },
    },
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('already registered')) {
      return {
        user: null,
        needsEmailConfirmation: false,
        error: 'Email ini sudah terdaftar. Silakan masuk ke akun Anda.',
      };
    }
    return {
      user: null,
      needsEmailConfirmation: false,
      error: error?.message ?? 'Gagal mendaftarkan akun.',
    };
  }

  const mapped = mapSupabaseUser(data.user);
  const needsEmailConfirmation = !data.session;

  // Pastikan bisnis awal juga tersedia di state lokal FE
  if (params.businessName.trim()) {
    await createBusiness({
      name: params.businessName.trim(),
      branch_name: 'Pusat',
      category: 'kedai',
      address: 'Alamat tempat usaha baru',
    });
  }

  notifyAuthChanged();
  return {
    user: mapped,
    needsEmailConfirmation,
    error: null,
  };
}

export async function signInWithGoogleOAuth(): Promise<{ error: string | null }> {
  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/businesses`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function signOutUser(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Abaikan bila offline
  }
  setDemoUserSession(null);
  notifyAuthChanged();
}

export function useAuthUser(): { user: UserAccount; isAuthenticated: boolean; loading: boolean } {
  const [user, setUser] = useState<UserAccount>(() => getDemoUserSession() ?? CURRENT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const syncUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (data.user) {
          setUser(mapSupabaseUser(data.user));
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback ke sesi demo bila belum login Supabase
      }
      if (!mounted) return;
      const demo = getDemoUserSession();
      setUser(demo ?? CURRENT_USER);
      setIsAuthenticated(Boolean(demo));
      setLoading(false);
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setIsAuthenticated(true);
      } else {
        const demo = getDemoUserSession();
        setUser(demo ?? CURRENT_USER);
        setIsAuthenticated(Boolean(demo));
      }
      setLoading(false);
    });

    const handleCustom = () => {
      void syncUser();
    };
    window.addEventListener(AUTH_EVENT, handleCustom);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_EVENT, handleCustom);
    };
  }, []);

  return { user, isAuthenticated, loading };
}
