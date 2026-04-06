import { useSettingsStore } from "../stores/settingsStore";
import { Sidebar } from "./Sidebar";
import { DARK, LIGHT, PANEL_RADIUS } from "../lib/theme";

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

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: theme.BG }}
    >
      <div
        className="flex w-[316px] min-h-[480px] overflow-hidden"
        style={{
          background: theme.BG,
          borderRadius: `${PANEL_RADIUS}px`,
          border: `1px solid ${theme.BORDER}`,
          width: showSidebar ? 316 : 260,
        }}
      >
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar onNavigate={onNavigate} currentPage={page} />
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ width: 260 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
