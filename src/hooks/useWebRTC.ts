import { useCallback, useEffect, useRef } from "react";
import { WebRTCManager } from "../lib/webrtc";
import { usePresenceStore, setWebRTCSignalHandler } from "../stores/presenceStore";
import { useAudio } from "./useAudio";

export const useWebRTC = () => {
  const rtcRef = useRef(new WebRTCManager());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track which peer ID we currently have an active WebRTC connection with
  const activePeerIdRef = useRef<string | null>(null);
  // Stream queued by the initiator while waiting for CALL_ACCEPTED — peer is
  // created once the receiver has accepted, to avoid an offer arriving before
  // the receiver's peer exists (which would silently drop the offer).
  const pendingInitiatorStreamRef = useRef<MediaStream | null>(null);
  const {
    micLevel,
    speakerLevel,
    requestMicrophone,
    stopMicrophone,
    playRemoteStream,
    muteMic,
    unmuteMic,
  } = useAudio();

  const { call, client, callUser, acceptCall, declineCall, endCall } =
    usePresenceStore();

  const handleEndCall = useCallback(() => {
    activePeerIdRef.current = null;
    pendingInitiatorStreamRef.current = null;
    rtcRef.current.destroy();
    stopMicrophone();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    endCall();
  }, [stopMicrophone, endCall]);

  // Wire up WEBRTC_SIGNAL handling from presence store (one-time setup)
  useEffect(() => {
    const rtc = rtcRef.current;

    rtc.onStream = (stream) => {
      audioRef.current = playRemoteStream(stream);
    };

    // Only end call if peer closes unexpectedly (not when we replace it)
    rtc.onClose = () => {
      console.log("[webrtc] onClose fired, activePeerId:", activePeerIdRef.current);
      // Don't trigger endCall here — handleEndCall is the only authority
    };

    setWebRTCSignalHandler((signal) => {
      rtc.signal(signal);
    });

    return () => {
      rtc.onStream = null;
      rtc.onClose = null;
      setWebRTCSignalHandler(null);
    };
  }, [playRemoteStream]);

  // Wire onSignal separately so it has the latest peerId
  useEffect(() => {
    rtcRef.current.onSignal = (data) => {
      const targetId = activePeerIdRef.current;
      if (targetId) {
        client?.send({
          type: "WEBRTC_SIGNAL",
          target_user_id: targetId,
          signal: data,
        });
      }
    };
  }, [client]);

  const handleStartCall = useCallback(
    async (targetUserId: string) => {
      // Guard: don't start if already in a call with this user
      if (activePeerIdRef.current === targetUserId) {
        console.log("[webrtc] Already in call with", targetUserId);
        return;
      }
      const stream = await requestMicrophone();
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      activePeerIdRef.current = targetUserId;
      // Stash the stream — peer is created once CALL_ACCEPTED flips status to
      // "connecting" (see effect below). Creating it here would race the
      // receiver's peer setup and lose the offer.
      pendingInitiatorStreamRef.current = stream;
      callUser(targetUserId);
    },
    [requestMicrophone, callUser],
  );

  // Initiator: create peer once the receiver has accepted.
  useEffect(() => {
    if (
      call.status === "connecting" &&
      pendingInitiatorStreamRef.current &&
      !rtcRef.current.hasPeer
    ) {
      const stream = pendingInitiatorStreamRef.current;
      pendingInitiatorStreamRef.current = null;
      console.log("[webrtc] CALL_ACCEPTED — creating initiator peer");
      rtcRef.current.createPeer(true, stream);
    }
  }, [call.status]);

  const handleAcceptCall = useCallback(
    async (fromUserId: string, roomCode: string) => {
      // Guard: don't accept if already in a call with this user
      if (activePeerIdRef.current === fromUserId) {
        console.log("[webrtc] Already accepted call from", fromUserId);
        return;
      }
      const stream = await requestMicrophone();
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      activePeerIdRef.current = fromUserId;
      acceptCall(fromUserId, roomCode);
      rtcRef.current.createPeer(false, stream);
    },
    [requestMicrophone, acceptCall],
  );

  const handleDeclineCall = useCallback(
    (fromUserId: string) => {
      declineCall(fromUserId);
    },
    [declineCall],
  );

  const handleSignal = useCallback((signal: unknown) => {
    rtcRef.current.signal(signal);
  }, []);

  return {
    call,
    micLevel,
    speakerLevel,
    startCall: handleStartCall,
    acceptCall: handleAcceptCall,
    declineCall: handleDeclineCall,
    endCall: handleEndCall,
    handleSignal,
    muteMic,
    unmuteMic,
  };
};
