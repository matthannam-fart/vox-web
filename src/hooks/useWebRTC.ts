import { useCallback, useEffect, useRef } from "react";
import { WebRTCManager } from "../lib/webrtc";
import { usePresenceStore, setWebRTCSignalHandler } from "../stores/presenceStore";
import { useAudio } from "./useAudio";

export const useWebRTC = () => {
  const rtcRef = useRef(new WebRTCManager());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    micStream,
    micLevel,
    speakerLevel,
    requestMicrophone,
    stopMicrophone,
    playRemoteStream,
  } = useAudio();

  const { call, client, callUser, acceptCall, declineCall, endCall } =
    usePresenceStore();

  // Use a ref for the cleanup function so the effect can reference it
  // without a forward-declaration issue
  const cleanupRef = useRef(() => {});

  const handleEndCall = useCallback(() => {
    rtcRef.current.destroy();
    stopMicrophone();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    endCall();
  }, [stopMicrophone, endCall]);

  // Keep ref in sync
  useEffect(() => {
    cleanupRef.current = handleEndCall;
  }, [handleEndCall]);

  // Wire up WEBRTC_SIGNAL handling from presence store
  useEffect(() => {
    const rtc = rtcRef.current;

    // Forward outgoing signals to relay via presence WebSocket
    rtc.onSignal = (data) => {
      if (call.peerId) {
        client?.send({
          type: "WEBRTC_SIGNAL",
          target_user_id: call.peerId,
          signal: data,
        });
      }
    };

    // Play incoming audio stream
    rtc.onStream = (stream) => {
      audioRef.current = playRemoteStream(stream);
    };

    // Clean up on peer close
    rtc.onClose = () => {
      cleanupRef.current();
    };

    // Register to receive incoming WebRTC signals from presence store
    setWebRTCSignalHandler((signal) => {
      rtc.signal(signal);
    });

    return () => {
      rtc.onSignal = null;
      rtc.onStream = null;
      rtc.onClose = null;
      setWebRTCSignalHandler(null);
    };
  }, [call.peerId, client, playRemoteStream]);

  const handleStartCall = useCallback(
    async (targetUserId: string) => {
      const stream = await requestMicrophone();
      // Start muted — PTT unmutes
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      callUser(targetUserId);
      rtcRef.current.createPeer(true, stream);
    },
    [requestMicrophone, callUser],
  );

  const handleAcceptCall = useCallback(
    async (fromUserId: string, roomCode: string) => {
      const stream = await requestMicrophone();
      // Start muted — PTT unmutes
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
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

  const muteMic = useCallback(() => {
    micStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
  }, [micStream]);

  const unmuteMic = useCallback(() => {
    micStream?.getAudioTracks().forEach((t) => { t.enabled = true; });
  }, [micStream]);

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
