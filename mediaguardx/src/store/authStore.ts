import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isDemoMode } from '@/lib/supabase';
import type { User, UserRole } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  isAdmin: () => boolean;
  isInvestigator: () => boolean;
}

// ── Demo mode helpers ──────────────────────────────────────────────

const DEMO_USERS_KEY = 'mediaguardx_demo_users';

interface DemoUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

function getDemoUsers(): DemoUser[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDemoUsers(users: DemoUser[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

// Seed default demo accounts on first load
function ensureDemoSeeded() {
  const users = getDemoUsers();
  if (users.length === 0) {
    saveDemoUsers([
      {
        id: 'demo-admin-001',
        email: 'admin@mediaguardx.com',
        name: 'Admin',
        password: 'admin123',
        role: 'admin',
      },
      {
        id: 'demo-user-001',
        email: 'user@mediaguardx.com',
        name: 'Demo User',
        password: 'user123',
        role: 'user',
      },
    ]);
  }
}

function makeDemoProfile(du: DemoUser): Profile {
  return {
    id: du.id,
    email: du.email,
    name: du.name,
    role: du.role,
    is_active: true,
  };
}

function makeDemoUser(du: DemoUser): User {
  return { id: du.id, email: du.email, name: du.name, role: du.role };
}

// ── Store ──────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,

      initialize: async () => {
        if (isDemoMode) {
          ensureDemoSeeded();
          set({ initialized: true });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
              role: 'user',
            };
            set({ session, user, isAuthenticated: true });
            await get().fetchProfile();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ initialized: true });
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
              role: 'user',
            };
            set({ session, user, isAuthenticated: true });
            await get().fetchProfile();
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, session: null, profile: null, isAuthenticated: false });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ session });
          }
        });
      },

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          if (isDemoMode) {
            const users = getDemoUsers();
            const found = users.find((u) => u.email === email && u.password === password);
            if (!found) throw new Error('Invalid email or password.');
            const profile = makeDemoProfile(found);
            set({ user: makeDemoUser(found), profile, isAuthenticated: true });
            return;
          }

          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data.session) {
            const user: User = {
              id: data.session.user.id,
              email: data.session.user.email || '',
              name: data.session.user.user_metadata?.name || email.split('@')[0],
              role: 'user',
            };
            set({ session: data.session, user, isAuthenticated: true });
            await get().fetchProfile();
          }
        } finally {
          set({ loading: false });
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ loading: true });
        try {
          if (isDemoMode) {
            const users = getDemoUsers();
            if (users.find((u) => u.email === email)) {
              throw new Error('An account with this email already exists.');
            }
            const newUser: DemoUser = {
              id: `demo-${Date.now()}`,
              email,
              name,
              password,
              role: 'user',
            };
            users.push(newUser);
            saveDemoUsers(users);
            const profile = makeDemoProfile(newUser);
            set({ user: makeDemoUser(newUser), profile, isAuthenticated: true });
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });
          if (error) throw error;
          if (data.session) {
            const user: User = {
              id: data.session.user.id,
              email,
              name,
              role: 'user',
            };
            set({ session: data.session, user, isAuthenticated: true });
            await get().fetchProfile();
          }
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        if (!isDemoMode) {
          await supabase.auth.signOut();
        }
        set({ user: null, session: null, profile: null, isAuthenticated: false });
      },

      resetPassword: async (email: string) => {
        if (isDemoMode) {
          const users = getDemoUsers();
          if (!users.find((u) => u.email === email)) {
            throw new Error('No account found with that email.');
          }
          // In demo mode just pretend it worked
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },

      fetchProfile: async () => {
        if (isDemoMode) return;

        const { session } = get();
        if (!session) return;

        try {
          // Fetch profile via backend API to avoid RLS recursion on profiles table
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (!response.ok) throw new Error('Failed to fetch profile');

          const data = await response.json();
          if (data) {
            const profile: Profile = {
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              is_active: data.is_active,
              avatar_url: data.avatar_url,
            };
            const user: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
            };
            set({ profile, user });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      },

      isAdmin: () => {
        const { profile } = get();
        return profile?.role === 'admin';
      },

      isInvestigator: () => {
        const { profile } = get();
        return profile?.role === 'investigator' || profile?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
