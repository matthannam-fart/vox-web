import { useEffect, useState } from "react";
import { usePresenceStore } from "../stores/presenceStore";
import { useTeamStore } from "../stores/teamStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import { useWebRTC } from "../hooks/useWebRTC";
import { UserRow, type UserRowState } from "../components/UserRow";
import { ContentHeader } from "../components/ContentHeader";
import { PTTButton } from "../components/PTTButton";
import { IncomingCallBanner } from "../components/IncomingCallBanner";
import { OutgoingCallBanner } from "../components/OutgoingCallBanner";
import { CallBanner } from "../components/CallBanner";
import { DARK } from "../lib/theme";
import type { Page } from "../components/Layout";

interface UsersPageProps {
  onNavigate: (page: Page) => void;
}

export const UsersPage = ({ onNavigate }: UsersPageProps) => {
  const { userId } = useAuthStore();
  const { onlineUsers, connected } = usePresenceStore();
  const { teamMembers, getTeamMembers } = useTeamStore();
  const { activeTeamId, activeTeamName } = useSettingsStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const {
    call,
    micLevel,
    speakerLevel,
    startCall,
    acceptCall: rtcAcceptCall,
    declineCall: rtcDeclineCall,
    endCall: rtcEndCall,
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ContentHeader teamName={activeTeamName} onNavigate={onNavigate} />

      {/* Call banners */}
      {isIncomingCall && call.peerName && call.peerId && (
        <IncomingCallBanner
          callerName={call.peerName}
          onAccept={() => rtcAcceptCall(call.peerId!, call.roomCode ?? "")}
          onDecline={() => rtcDeclineCall(call.peerId!)}
        />
      )}
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
              onClick={(uid) =>
                setSelectedUserId(uid === selectedUserId ? null : uid)
              }
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
        <PTTButton
          targetName={selectedUser?.name ?? null}
          disabled={!selectedUserId || call.status !== "idle"}
          onPress={() => {
            if (selectedUserId) startCall(selectedUserId);
          }}
          onRelease={rtcEndCall}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
            {teamOnlineUsers.length} online
          </span>
        </div>
      </div>
    </div>
  );
};
