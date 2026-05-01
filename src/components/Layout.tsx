import { useSettingsStore } from "../stores/settingsStore";
import { Sidebar } from "./Sidebar";
import { DARK, LIGHT, PANEL_RADIUS } from "../lib/theme";
import { useIsMobile } from "../lib/useMediaQuery";

export type Page = "welcome" | "users" | "teams" | "radio" | "settings";

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

  // On phones: fill viewport, no border. On desktop: centered fixed-width panel.
  const panelStyle = isMobile
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
        isMobile
          ? "min-h-screen flex"
          : "min-h-screen flex items-center justify-center"
      }
      style={{ background: theme.BG }}
    >
      <div className="flex overflow-hidden" style={panelStyle}>
        {showSidebar && <Sidebar onNavigate={onNavigate} currentPage={page} />}

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={isMobile ? undefined : { width: 260 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
