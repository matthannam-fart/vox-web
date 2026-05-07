import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useSettingsStore } from "../stores/settingsStore";
import { usePresenceStore } from "../stores/presenceStore";
import { useTeamStore } from "../stores/teamStore";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { DARK, MODE_LABELS } from "../lib/theme";
import { shareInviteMessage } from "../lib/team";
import type { Page } from "../components/Layout";

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
}

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";

export const SettingsPage = ({ onNavigate }: SettingsPageProps) => {
  const { userId, email, displayName, setDisplayName, signOut } = useAuthStore();
  const {
    darkMode,
    setDarkMode,
    activeTeamId,
    selectedInputDevice,
    selectedOutputDevice,
    setSelectedInputDevice,
    setSelectedOutputDevice,
  } = useSettingsStore();
  const { mode, setMode } = usePresenceStore();
  const { teams, leaveTeam } = useTeamStore();

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const [nameInput, setNameInput] = useState(displayName);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameError, setNameError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [copiedField, setCopiedField] = useState<"code" | "invite" | null>(null);

  // Keep input in sync if displayName changes from elsewhere (e.g. auth refresh).
  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        if (cancelled) return;
        setAudioDevices(
          devices.filter((d) => d.kind === "audioinput" || d.kind === "audiooutput"),
        );
      });
    };

    // Browsers strip device labels until mic permission is granted. Request a
    // throwaway stream first so the dropdowns show real device names ("MacBook
    // Pro Microphone (Built-in)") instead of placeholders ("Mic abc12345").
    // If permission is denied, we still enumerate — labels will be empty but
    // the user can pick by index.
    const seedPermissionThenEnumerate = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop tracks immediately — we don't need the stream, just the
        // permission grant so labels populate on the next enumerate.
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // permission denied or no mic — fall through to enumerate anyway
      }
      refresh();
    };

    seedPermissionThenEnumerate();

    // Refresh when the user plugs/unplugs a device.
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
    };
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
    // Single source for the format — `lib/team.ts` mirrors the mac
    // `Team.shareInviteMessage` extension. Avoids drift between this
    // page and the team-header dropdown that share the same intent.
    navigator.clipboard.writeText(shareInviteMessage(activeTeam));
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

  const handleNameSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) return;
    setNameStatus("saving");
    setNameError(null);
    const { error } = await setDisplayName(trimmed);
    if (error) {
      setNameStatus("error");
      setNameError(error);
    } else {
      setNameStatus("saved");
      setTimeout(() => setNameStatus((s) => (s === "saved" ? "idle" : s)), 1500);
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
              disabled={nameStatus === "saving" || !nameInput.trim() || nameInput.trim() === displayName}
              className="rounded-[6px] px-3 py-[7px] text-[10px] font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: DARK.TEAL, color: "white", border: "none" }}
            >
              {nameStatus === "saving" ? "..." : nameStatus === "saved" ? "✓" : "Save"}
            </button>
          </div>
          {nameError && (
            <p className="text-[10px] mt-1" style={{ color: DARK.DANGER }}>
              {nameError}
            </p>
          )}
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

        {/* Audio */}
        <SectionHeader>Audio</SectionHeader>
        {inputDevices.length > 0 && (
          <div className="mb-2">
            <label className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1" style={{ color: DARK.TEXT_FAINT }}>
              Input Device
            </label>
            <select
              value={selectedInputDevice ?? ""}
              onChange={(e) => setSelectedInputDevice(e.target.value || null)}
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
              value={selectedOutputDevice ?? ""}
              onChange={(e) => setSelectedOutputDevice(e.target.value || null)}
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

        {/* Help link + version */}
        <p className="text-[10px] text-center mt-4" style={{ color: DARK.TEXT_FAINT }}>
          <a
            href="/manual.html"
            target="_blank"
            rel="noopener"
            style={{ color: DARK.TEAL, textDecoration: "none" }}
          >
            How Vox works
          </a>
        </p>
        <p
          className="text-[9px] text-center mt-1"
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
