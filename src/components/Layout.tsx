import { useSettingsStore } from "../stores/settingsStore";
import { Sidebar } from "./Sidebar";
import { DARK, LIGHT, PANEL_RADIUS } from "../lib/theme";
import { useIsMobile, useIsStandalone } from "../lib/useMediaQuery";

export type Page = "welcome" | "users" | "teams" | "radio" | "messages" | "settings";

interface LayoutProps {
  children: React.ReactNode;
  page: Page;
  onNavigate: (page: Page) => void;
  showSidebar?: boolean;
}

export const Layout = ({ children, page, onNavigate, showSidebar = false }: LayoutProps) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? DARK : LIGHT;
  const isMobile = useIsMobile();
  const isStandalone = useIsStandalone();
  // In a phone viewport OR an installed PWA window, the app IS the canvas — fill it.
  // Only in a regular desktop browser tab do we render as a centered fixed-width panel.
  const fillViewport = isMobile || isStandalone;

  const panelStyle = fillViewport
    ? {
        background: theme.BG,
        width: "100vw",
        height: "100dvh",
        minHeight: "100dvh",
      }
    : {
        background: theme.BG,
        borderRadius: `${PANEL_RADIUS}px`,
        border: `1px solid ${theme.BORDER}`,
        width: showSidebar ? 316 : 260,
        minHeight: 480,
      };

  return (
    <div
      className={
        fillViewport
          ? "min-h-screen flex"
          : "min-h-screen flex items-center justify-center"
      }
      style={{ background: theme.BG }}
    >
      <div className="flex overflow-hidden" style={panelStyle}>
        {showSidebar && <Sidebar onNavigate={onNavigate} currentPage={page} />}

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={fillViewport ? undefined : { width: 260 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
