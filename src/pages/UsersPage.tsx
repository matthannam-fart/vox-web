import { useEffect, useRef, useState } from "react";
import { usePresenceStore } from "../stores/presenceStore";
import { useTeamStore } from "../stores/teamStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import { useVoicemailStore } from "../stores/voicemailStore";
import { useWebRTC } from "../hooks/useWebRTC";
import { useNotifications } from "../hooks/useNotifications";
import { UserRow, type UserRowState } from "../components/UserRow";
import { ContentHeader } from "../components/ContentHeader";
import { PTTButton } from "../components/PTTButton";
import { OutgoingCallBanner } from "../components/OutgoingCallBanner";
import { CallBanner } from "../components/CallBanner";
import { DARK } from "../lib/theme";
import { playIncomingCue, playConnectedCue, playEndedCue } from "../lib/audioCues";
import { VoicemailRecorder } from "../lib/voicemailRecorder";
import type { Page } from "../components/Layout";

interface UsersPageProps {
  onNavigate: (page: Page) => void;
}

export const UsersPage = ({ onNavigate }: UsersPageProps) => {
  const { userId } = useAuthStore();
  const { onlineUsers, connected } = usePresenceStore();
  const { teamMembers, getTeamMembers } = useTeamStore();
  const { activeTeamId, activeTeamName } = useSettingsStore();
  const { send: sendVoicemail, error: voicemailError } = useVoicemailStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [voicemailStatus, setVoicemailStatus] = useState<
    | { kind: "idle" }
    | { kind: "recording" }
    | { kind: "sending" }
    | { kind: "sent"; name: string }
    | { kind: "failed"; reason: string }
  >({ kind: "idle" });
  const recorderRef = useRef<VoicemailRecorder | null>(null);
  if (recorderRef.current === null) recorderRef.current = new VoicemailRecorder();

  const {
    call,
    micLevel,
    speakerLevel,
    startCall,
    acceptCall: rtcAcceptCall,
    endCall: rtcEndCall,
    muteMic,
    unmuteMic,
  } = useWebRTC();

  useEffect(() => {
    if (activeTeamId) getTeamMembers(activeTeamId);
  }, [activeTeamId, getTeamMembers]);

  // Filter to current team, exclude self
  const teamOnlineUsers = onlineUsers.filter(
    (u) => u.team_id === activeTeamId && u.user_id !== userId,
  );

  const onlineIds = new Set(teamOnlineUsers.map((u) => u.user_id));
  const offlineMembers = teamMembers.filter(
    (m) => !onlineIds.has(m.user_id) && m.user_id !== userId,
  );

  const selectedUser = teamOnlineUsers.find((u) => u.user_id === selectedUserId);

  // Voicemail mode: when the picked user is BUSY (yellow), the PTT
  // button records a message instead of opening a call. Mirrors mac.
  const voicemailMode = selectedUser?.mode === "YELLOW";

  const getUserState = (uid: string): UserRowState => {
    if (call.status !== "idle" && call.peerId === uid) {
      if (call.status === "connected") return "live";
      return "connecting";
    }
    if (uid === selectedUserId) return "selected";
    return "idle";
  };

  // Determine if we're the receiver of an incoming call
  const isIncomingCall =
    call.status === "ringing" &&
    call.peerId !== null &&
    // If we didn't initiate it (selectedUserId differs from peerId), it's incoming
    selectedUserId !== call.peerId;

  const isOutgoingCall =
    call.status === "ringing" && selectedUserId === call.peerId;

  // Auto-accept incoming calls (matches desktop GREEN mode — instant intercom).
  useEffect(() => {
    if (isIncomingCall && call.peerId && call.peerName) {
      console.log("[users] Auto-accepting call from", call.peerName);
      rtcAcceptCall(call.peerId, call.roomCode ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncomingCall, call.peerId, call.peerName]);

  // Audio + notification cues. Track previous call status so we only fire on transitions.
  const { requestPermission, notify } = useNotifications();
  const prevStatusRef = useRef(call.status);
  // Notification permission must be requested from a user gesture (Safari requirement),
  // so we ask on first row interaction below rather than on mount.
  const askedForNotificationsRef = useRef(false);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = call.status;
    if (prev === next) return;

    if (prev === "idle" && next === "ringing" && isIncomingCall && call.peerName) {
      playIncomingCue();
      notify("Vox — incoming call", { body: `${call.peerName} is calling`, tag: "vox-call" });
    } else if (prev !== "connected" && next === "connected") {
      playConnectedCue();
    } else if ((prev === "connected" || prev === "connecting") && next === "idle") {
      playEndedCue();
    }
    prevStatusRef.current = next;
  }, [call.status, isIncomingCall, call.peerName, notify]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ContentHeader teamName={activeTeamName} onNavigate={onNavigate} />

      {/* Call banners — receiver auto-accepts (matches desktop GREEN mode), so no incoming banner. */}
      {isOutgoingCall && call.peerName && (
        <OutgoingCallBanner
          targetName={call.peerName}
          onCancel={rtcEndCall}
        />
      )}
      {(call.status === "connected" || call.status === "connecting") &&
        call.peerName && (
          <CallBanner
            peerName={call.peerName}
            micLevel={micLevel}
            speakerLevel={speakerLevel}
            onEnd={rtcEndCall}
          />
        )}

      <div className="flex-1 overflow-y-auto">
        {/* Online section */}
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
          <span
            className="text-[11px] font-bold tracking-[1.2px]"
            style={{ color: DARK.TEXT_FAINT }}
          >
            ONLINE
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
            style={{ color: DARK.TEXT_DIM, background: DARK.BG_RAISED }}
          >
            {teamOnlineUsers.length}
          </span>
        </div>

        <div className="px-2 pb-2 flex flex-col gap-1">
          {teamOnlineUsers.length === 0 && (
            <p
              className="text-[11px] text-center py-4"
              style={{ color: DARK.TEXT_FAINT }}
            >
              {connected ? "No one else is online" : "Connecting..."}
            </p>
          )}
          {teamOnlineUsers.map((user) => (
            <UserRow
              key={user.user_id}
              userId={user.user_id}
              name={user.name}
              mode={user.mode}
              state={getUserState(user.user_id)}
              onClick={(uid) => {
                // First interaction is a good time to request Notification permission
                // (Safari requires a user gesture). Done once per session.
                if (!askedForNotificationsRef.current) {
                  askedForNotificationsRef.current = true;
                  requestPermission();
                }
                if (uid === selectedUserId) {
                  // Clicking selected user ends call
                  rtcEndCall();
                  setSelectedUserId(null);
                } else {
                  setSelectedUserId(uid);
                  // BUSY recipients route through the voicemail flow —
                  // don't open a call; the PTT button captures and uploads.
                  const target = teamOnlineUsers.find((u) => u.user_id === uid);
                  if (target?.mode === "YELLOW") return;
                  if (call.status === "idle") {
                    startCall(uid);
                  }
                }
              }}
            />
          ))}
        </div>

        {/* Offline section */}
        {offlineMembers.length > 0 && (
          <>
            <div className="px-4 pt-2 pb-1">
              <span
                className="text-[11px] font-bold tracking-[1.2px]"
                style={{ color: DARK.TEXT_FAINT }}
              >
                OFFLINE
              </span>
            </div>
            <div className="px-2 pb-2 flex flex-col gap-1">
              {offlineMembers.map((member) => (
                <UserRow
                  key={member.user_id}
                  userId={member.user_id}
                  name={member.display_name}
                  mode="OFFLINE"
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* PTT + status bar */}
      <div
        className="px-3 py-2 flex flex-col gap-2"
        style={{ borderTop: `1px solid ${DARK.BORDER_LT}` }}
      >
        {(call.status === "connected" || call.status === "connecting") && (
          <button
            onClick={rtcEndCall}
            className="text-[10px] cursor-pointer bg-transparent border-none self-end"
            style={{ color: DARK.DANGER }}
          >
            End call
          </button>
        )}
        <PTTButton
          targetName={
            call.status === "connected" || call.status === "connecting"
              ? call.peerName
              : voicemailMode
                ? `${selectedUser?.name ?? "user"} (leave a message)`
                : selectedUser?.name ?? null
          }
          disabled={
            !voicemailMode &&
            call.status !== "connected" &&
            call.status !== "connecting"
          }
          isInCall={call.status === "connected" || call.status === "connecting"}
          onPress={() => {
            if (voicemailMode) {
              setVoicemailStatus({ kind: "recording" });
              void recorderRef.current?.start().catch((e) => {
                setVoicemailStatus({
                  kind: "failed",
                  reason: e instanceof Error ? e.message : "Mic unavailable",
                });
              });
              return;
            }
            if (call.status === "connected" || call.status === "connecting") {
              unmuteMic();
            }
          }}
          onRelease={() => {
            if (voicemailMode) {
              const recorder = recorderRef.current;
              const targetName = selectedUser?.name ?? "them";
              const targetId = selectedUser?.user_id;
              const teamId = activeTeamId;
              const senderId = userId;
              if (!recorder || !targetId || !teamId || !senderId) {
                void recorder?.cancel();
                setVoicemailStatus({ kind: "idle" });
                return;
              }
              setVoicemailStatus({ kind: "sending" });
              void recorder.stop().then(async (result) => {
                if (!result) {
                  setVoicemailStatus({ kind: "idle" });
                  return;
                }
                const ok = await sendVoicemail({
                  blob: result.blob,
                  mimeType: result.mimeType,
                  duration_ms: result.duration_ms,
                  teamId,
                  senderId,
                  recipientId: targetId,
                });
                if (ok) {
                  setVoicemailStatus({ kind: "sent", name: targetName });
                  // Voicemail is a one-shot action, not a persistent
                  // channel. Clear the selection so the user isn't
                  // left feeling "tuned in" to someone they just left
                  // an asynchronous message for; the next click picks
                  // a new target cleanly.
                  setSelectedUserId(null);
                  setTimeout(() => setVoicemailStatus({ kind: "idle" }), 2500);
                } else {
                  setVoicemailStatus({
                    kind: "failed",
                    reason: voicemailError ?? "Send failed",
                  });
                }
              });
              return;
            }
            if (call.status === "connected" || call.status === "connecting") {
              muteMic();
            }
          }}
        />
        <div className="flex justify-center text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
          {voicemailStatus.kind === "recording" && (
            <span style={{ color: DARK.WARN }}>● Recording…</span>
          )}
          {voicemailStatus.kind === "sending" && <span>Sending message…</span>}
          {voicemailStatus.kind === "sent" && (
            <span style={{ color: DARK.ACCENT }}>
              Message sent to {voicemailStatus.name} ✓
            </span>
          )}
          {voicemailStatus.kind === "failed" && (
            <span style={{ color: DARK.DANGER }}>{voicemailStatus.reason}</span>
          )}
          {voicemailStatus.kind === "idle" && (
            <span>{connected ? "● Connected" : "○ Connecting…"}</span>
          )}
        </div>
      </div>
    </div>
  );
};
