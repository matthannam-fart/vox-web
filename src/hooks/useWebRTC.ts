import { useCallback, useEffect, useRef } from "react";
import { WebRTCManager } from "../lib/webrtc";
import { usePresenceStore, setWebRTCSignalHandler } from "../stores/presenceStore";
import { useAudio } from "./useAudio";

export const useWebRTC = () => {
  const rtcRef = useRef(new WebRTCManager());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track which peer ID we currently have an active WebRTC connection with
  const activePeerIdRef = useRef<string | null>(null);
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
      callUser(targetUserId);
      rtcRef.current.createPeer(true, stream);
    },
    [requestMicrophone, callUser],
  );

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
