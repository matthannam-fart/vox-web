import { create } from "zustand";

interface SettingsState {
  darkMode: boolean;
  activeTeamId: string | null;
  activeTeamName: string | null;
  selectedInputDevice: string | null;
  selectedOutputDevice: string | null;

  setDarkMode: (dark: boolean) => void;
  setActiveTeam: (teamId: string | null, teamName: string | null) => void;
  setSelectedInputDevice: (deviceId: string | null) => void;
  setSelectedOutputDevice: (deviceId: string | null) => void;
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
  activeTeamId: persisted.activeTeamId ?? null,
  activeTeamName: persisted.activeTeamName ?? null,
  selectedInputDevice: persisted.selectedInputDevice ?? null,
  selectedOutputDevice: persisted.selectedOutputDevice ?? null,

  setDarkMode: (dark) => {
    set({ darkMode: dark });
    persist({ darkMode: dark });
  },
  setActiveTeam: (teamId, teamName) => {
    set({ activeTeamId: teamId, activeTeamName: teamName });
    persist({ activeTeamId: teamId, activeTeamName: teamName });
  },
  setSelectedInputDevice: (deviceId) => {
    set({ selectedInputDevice: deviceId });
    persist({ selectedInputDevice: deviceId });
  },
  setSelectedOutputDevice: (deviceId) => {
    set({ selectedOutputDevice: deviceId });
    persist({ selectedOutputDevice: deviceId });
  },
}));
