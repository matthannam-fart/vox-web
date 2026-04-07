import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

interface AuthState {
  // State
  userId: string | null;
  email: string | null;
  displayName: string;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  displayName: "",
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      set({
        userId: session.user.id,
        email: session.user.email ?? null,
        initialized: true,
      });

      // Fetch profile from Supabase (same as supabase_client.py get_profile)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        set({ profile, displayName: profile.display_name });
      }
    } else {
      set({ initialized: true });
    }

    // Listen for auth state changes (handles token refresh automatically)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ userId: session.user.id, email: session.user.email ?? null });
      } else {
        set({ userId: null, email: null, profile: null, displayName: "" });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return error ? { error: error.message } : {};
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ loading: false });
      return { error: error.message };
    }

    // Upsert profile (same as supabase_client.py upsert_profile)
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: displayName,
      });
      set({ displayName });
    }

    set({ loading: false });
    return {};
  },

  signInWithGoogle: async () => {
    // Use the full app URL including base path so OAuth redirects back correctly
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return error ? { error: error.message } : {};
  },

  signInWithMagicLink: async (email) => {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ userId: null, email: null, profile: null, displayName: "" });
  },

  setDisplayName: (name) => set({ displayName: name }),
}));
