import { create } from "zustand";

interface SettingsState {
  darkMode: boolean;
  displayName: string;
  activeTeamId: string | null;
  activeTeamName: string | null;
  incognito: boolean;

  setDarkMode: (dark: boolean) => void;
  setDisplayName: (name: string) => void;
  setActiveTeam: (teamId: string | null, teamName: string | null) => void;
  setIncognito: (incognito: boolean) => void;
}

const STORAGE_KEY = "vox-settings";

function loadPersistedState(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function persist(state: Partial<SettingsState>) {
  try {
    const existing = loadPersistedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch {
    // ignore
  }
}

const persisted = loadPersistedState();

export const useSettingsStore = create<SettingsState>((set) => ({
  darkMode: persisted.darkMode ?? true,
  displayName: persisted.displayName ?? "",
  activeTeamId: persisted.activeTeamId ?? null,
  activeTeamName: persisted.activeTeamName ?? null,
  incognito: persisted.incognito ?? false,

  setDarkMode: (dark) => {
    set({ darkMode: dark });
    persist({ darkMode: dark });
  },
  setDisplayName: (name) => {
    set({ displayName: name });
    persist({ displayName: name });
  },
  setActiveTeam: (teamId, teamName) => {
    set({ activeTeamId: teamId, activeTeamName: teamName });
    persist({ activeTeamId: teamId, activeTeamName: teamName });
  },
  setIncognito: (incognito) => {
    set({ incognito });
    persist({ incognito });
  },
}));
