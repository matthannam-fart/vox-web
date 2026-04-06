/**
 * Theme constants — ported from ui_constants.py
 */

export const COLORS = {
  GREEN: "#00a651",
  YELLOW: "#e6af00",
  RED: "#e22a1a",
  INCOGNITO: "#555555",
} as const;

export const MODE_LABELS = {
  GREEN: "Available",
  YELLOW: "Busy",
  RED: "DND",
} as const;

export const RADIO_STATIONS = {
  "NTS Radio": "https://stream-relay-geo.ntslive.net/stream?client=NTSRadio",
} as const;

// Panel dimensions
export const PANEL_W = 260;
export const SIDEBAR_W = 56;
export const PANEL_RADIUS = 14;
export const STRIP_W = 56;
export const STRIP_AVATAR_SIZE = 36;
export const STRIP_RADIUS = 12;

export const DARK = {
  BG: "#1e1e1e",
  BG_RAISED: "#2a2a2a",
  BG_HOVER: "#333333",
  BORDER: "#3a3a3a",
  BORDER_LT: "#2e2e2e",
  TEXT: "#e8e8e8",
  TEXT_DIM: "#999999",
  TEXT_FAINT: "#666666",
  ACCENT: "#00a651",
  ACCENT_DIM: "#008040",
  ACCENT_LT: "#66bb6a",
  INFO: "#42a5f5",
  INFO_LT: "#90caf9",
  TEAL: "#2ABFBF",
  DANGER: "#e53935",
  WARN: "#e6af00",
} as const;

export const LIGHT = {
  BG: "#f5f5f5",
  BG_RAISED: "#ffffff",
  BG_HOVER: "#e8e8e8",
  BORDER: "#d0d0d0",
  BORDER_LT: "#e0e0e0",
  TEXT: "#1e1e1e",
  TEXT_DIM: "#666666",
  TEXT_FAINT: "#999999",
  ACCENT: "#00a651",
  ACCENT_DIM: "#008040",
  ACCENT_LT: "#2e7d32",
  INFO: "#1976d2",
  INFO_LT: "#1565c0",
  TEAL: "#00897b",
  DANGER: "#d32f2f",
  WARN: "#f9a825",
} as const;

export type ThemePalette = typeof DARK;
