import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useSettingsStore } from "../stores/settingsStore";
import { usePresenceStore } from "../stores/presenceStore";
import { useTeamStore } from "../stores/teamStore";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { DARK, MODE_LABELS } from "../lib/theme";
import type { Page } from "../components/Layout";

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
}

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";

export const SettingsPage = ({ onNavigate }: SettingsPageProps) => {
  const { userId, email, displayName: authDisplayName, signOut } = useAuthStore();
  const { darkMode, setDarkMode, incognito, setIncognito, displayName, setDisplayName, activeTeamId } =
    useSettingsStore();
  const { mode, setMode } = usePresenceStore();
  const { teams, leaveTeam } = useTeamStore();

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const [nameInput, setNameInput] = useState(displayName || authDisplayName);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [copiedField, setCopiedField] = useState<"code" | "invite" | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter((d) => d.kind === "audioinput" || d.kind === "audiooutput"));
    });
  }, []);

  const flashCopied = (field: "code" | "invite") => {
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1200);
  };

  const handleCopyCode = () => {
    if (!activeTeam?.invite_code) return;
    navigator.clipboard.writeText(activeTeam.invite_code);
    flashCopied("code");
  };

  const handleCopyInvite = () => {
    if (!activeTeam) return;
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?code=${activeTeam.invite_code}`;
    const message = `Join me on Vox!\n\nTeam: ${activeTeam.name}\nCode: ${activeTeam.invite_code}\n\nOpen: ${url}`;
    navigator.clipboard.writeText(message);
    flashCopied("invite");
  };

  const handleLeaveTeam = async () => {
    if (!activeTeam || !userId) return;
    if (!confirm(`Leave "${activeTeam.name}"? You can rejoin with the invite code.`)) return;
    await leaveTeam(activeTeam.id, userId);
    // Returning to welcome happens automatically since activeTeamId is still set;
    // clear it so the user sees the welcome flow again.
    useSettingsStore.getState().setActiveTeam(null, null);
  };

  const inputDevices = audioDevices.filter((d) => d.kind === "audioinput");
  const outputDevices = audioDevices.filter((d) => d.kind === "audiooutput");

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setDisplayName(nameInput.trim());
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center px-4 py-2.5"
        style={{ borderBottom: `1px solid ${DARK.BORDER_LT}` }}
      >
        <button
          onClick={() => onNavigate("users")}
          className="text-[11px] font-medium cursor-pointer bg-transparent border-none"
          style={{ color: DARK.TEAL }}
        >
          &#8592; Back
        </button>
        <span
          className="flex-1 text-center text-[13px] font-semibold"
          style={{ color: DARK.TEXT }}
        >
          Settings
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Profile */}
        <SectionHeader>Profile</SectionHeader>
        <div className="mb-3">
          <label className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1" style={{ color: DARK.TEXT_FAINT }}>
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              className="flex-1 rounded-[6px] px-2.5 py-[7px] text-xs outline-none"
              style={{
                background: DARK.BG_RAISED,
                border: `1px solid ${DARK.BORDER}`,
                color: DARK.TEXT,
              }}
            />
            <button
              onClick={handleNameSave}
              className="rounded-[6px] px-3 py-[7px] text-[10px] font-semibold cursor-pointer"
              style={{ background: DARK.TEAL, color: "white", border: "none" }}
            >
              Save
            </button>
          </div>
          {email && (
            <p className="text-[10px] mt-1" style={{ color: DARK.TEXT_FAINT }}>
              {email}
            </p>
          )}
        </div>

        {/* Status mode */}
        <SectionHeader>Status</SectionHeader>
        <div className="flex gap-1.5 mb-3">
          {(["GREEN", "YELLOW", "RED"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 rounded-[6px] py-1.5 text-[10px] font-semibold cursor-pointer"
              style={{
                background: mode === m ? `${DARK.ACCENT}22` : DARK.BG_RAISED,
                border: `1px solid ${mode === m ? DARK.ACCENT : DARK.BORDER}`,
                color: mode === m ? DARK.ACCENT_LT : DARK.TEXT_DIM,
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Team */}
        {activeTeam && (
          <>
            <SectionHeader>Team</SectionHeader>
            <div className="mb-2">
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: DARK.TEXT }}
              >
                {activeTeam.name}
              </p>
              <label
                className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
                style={{ color: DARK.TEXT_FAINT }}
              >
                Invite Code
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 rounded-[6px] px-2.5 py-[7px] text-xs font-mono tracking-[2px] text-center cursor-pointer"
                  style={{
                    background: DARK.BG_RAISED,
                    border: `1px solid ${DARK.BORDER}`,
                    color: copiedField === "code" ? DARK.ACCENT_LT : DARK.TEXT,
                  }}
                  title="Click to copy"
                >
                  {copiedField === "code" ? "✓ Copied" : activeTeam.invite_code || "—"}
                </button>
                <button
                  onClick={handleCopyInvite}
                  disabled={!activeTeam.invite_code}
                  className="rounded-[6px] px-3 py-[7px] text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: DARK.TEAL, color: "white", border: "none" }}
                  title="Copy a shareable invite message"
                >
                  {copiedField === "invite" ? "✓" : "Share"}
                </button>
              </div>
              {activeTeam.role !== "admin" && (
                <button
                  onClick={handleLeaveTeam}
                  className="text-[10px] font-medium cursor-pointer bg-transparent border-none"
                  style={{ color: DARK.DANGER }}
                >
                  Leave team
                </button>
              )}
            </div>
          </>
        )}

        {/* Appearance */}
        <SectionHeader>Appearance</SectionHeader>
        <SettingRow label="Dark Mode">
          <ToggleSwitch on={darkMode} onToggle={setDarkMode} />
        </SettingRow>
        <SettingRow label="Incognito">
          <ToggleSwitch on={incognito} onToggle={setIncognito} />
        </SettingRow>

        {/* Audio */}
        <SectionHeader>Audio</SectionHeader>
        {inputDevices.length > 0 && (
          <div className="mb-2">
            <label className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1" style={{ color: DARK.TEXT_FAINT }}>
              Input Device
            </label>
            <select
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              className="w-full rounded-[6px] px-2 py-[6px] text-[11px] outline-none"
              style={{
                background: DARK.BG_RAISED,
                border: `1px solid ${DARK.BORDER}`,
                color: DARK.TEXT,
              }}
            >
              <option value="">Default</option>
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {outputDevices.length > 0 && (
          <div className="mb-2">
            <label className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1" style={{ color: DARK.TEXT_FAINT }}>
              Output Device
            </label>
            <select
              value={selectedOutput}
              onChange={(e) => setSelectedOutput(e.target.value)}
              className="w-full rounded-[6px] px-2 py-[6px] text-[11px] outline-none"
              style={{
                background: DARK.BG_RAISED,
                border: `1px solid ${DARK.BORDER}`,
                color: DARK.TEXT,
              }}
            >
              <option value="">Default</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sign out */}
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="w-full rounded-[6px] py-2 text-[11px] font-medium cursor-pointer"
            style={{
              background: "transparent",
              border: `1px solid rgba(229, 57, 53, 0.3)`,
              color: DARK.DANGER,
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Version */}
        <p
          className="text-[9px] text-center mt-4"
          style={{ color: DARK.TEXT_FAINT }}
        >
          Vox · {APP_VERSION}
        </p>
      </div>
    </div>
  );
};

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-[9px] font-bold uppercase tracking-[1.5px] mb-2 mt-3 first:mt-0"
    style={{ color: DARK.TEXT_FAINT }}
  >
    {children}
  </p>
);

const SettingRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-1.5 mb-1">
    <span className="text-xs" style={{ color: DARK.TEXT }}>
      {label}
    </span>
    {children}
  </div>
);
