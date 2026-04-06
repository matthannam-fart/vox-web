import { useEffect, useState } from "react";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import { usePresenceStore } from "./stores/presenceStore";
import { LoginPage } from "./pages/LoginPage";
import { WelcomePage } from "./pages/WelcomePage";
import { TeamsPage } from "./pages/TeamsPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RadioPage } from "./pages/RadioPage";
import { Layout, type Page } from "./components/Layout";
import { InstallPrompt } from "./components/InstallPrompt";
import { DARK } from "./lib/theme";

export const App = () => {
  const { userId, displayName, initialized, initialize } = useAuthStore();
  const { activeTeamId } = useSettingsStore();
  const { connect, disconnect, mode } = usePresenceStore();
  const [page, setPage] = useState<Page>("welcome");

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Default page based on team state
  useEffect(() => {
    if (userId && activeTeamId) {
      setPage("users");
    } else if (userId) {
      setPage("welcome");
    }
  }, [userId, activeTeamId]);

  // Connect/disconnect presence when team changes
  useEffect(() => {
    if (userId && activeTeamId && displayName) {
      connect(userId, displayName, mode, activeTeamId);
    }
    return () => {
      disconnect();
    };
  }, [userId, activeTeamId, displayName]);

  if (!initialized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: DARK.BG }}
      >
        <p className="text-xs" style={{ color: DARK.TEXT_DIM }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!userId) {
    return <LoginPage />;
  }

  const showSidebar = page !== "welcome";

  const renderPage = () => {
    switch (page) {
      case "welcome":
        return <WelcomePage onNavigate={setPage} />;
      case "teams":
        return <TeamsPage onNavigate={setPage} />;
      case "users":
        return <UsersPage onNavigate={setPage} />;
      case "settings":
        return <SettingsPage onNavigate={setPage} />;
      case "radio":
        return <RadioPage onNavigate={setPage} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Layout page={page} onNavigate={setPage} showSidebar={showSidebar}>
        {renderPage()}
      </Layout>
      <InstallPrompt />
    </>
  );
};

export default App;
