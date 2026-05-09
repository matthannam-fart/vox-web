import { useCallback, useEffect, useRef } from "react";
import { WebRTCManager } from "../lib/webrtc";
import {
  usePresenceStore,
  setWebRTCSignalHandler,
  setRemoteEndCallHandler,
} from "../stores/presenceStore";
import { useAuthStore } from "../stores/authStore";
import { usePinStore } from "../stores/pinStore";
import { useAudio } from "./useAudio";

export const useWebRTC = () => {
  const rtcRef = useRef<WebRTCManager>(null as unknown as WebRTCManager);
  if (rtcRef.current === null) {
    rtcRef.current = new WebRTCManager();
    rtcRef.current.label = "call";
  }
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track which peer ID we currently have an active WebRTC connection with
  const activePeerIdRef = useRef<string | null>(null);
  // Stream queued by the initiator while waiting for CALL_ACCEPTED — peer is
  // created once the receiver has accepted, to avoid an offer arriving before
  // the receiver's peer exists (which would silently drop the offer).
  const pendingInitiatorStreamRef = useRef<MediaStream | null>(null);

  // Open-mic pin peer. Co-exists with the call peer; lifecycle tracks
  // pinStore.partner. Mic stream is shared with the call peer via
  // useAudio's micStreamRef cache (one mic, two peers).
  const pinRtcRef = useRef<WebRTCManager>(null as unknown as WebRTCManager);
  if (pinRtcRef.current === null) {
    pinRtcRef.current = new WebRTCManager();
    pinRtcRef.current.label = "pin";
  }
  const pinAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePinPeerIdRef = useRef<string | null>(null);

  const {
    micLevel,
    speakerLevel,
    requestMicrophone,
    stopMicrophone,
    playRemoteStream,
    muteMic,
    unmuteMic,
  } = useAudio();

  const { call, client, callUser, acceptCall, declineCall, markCallConnected, endCall } =
    usePresenceStore();
  const userId = useAuthStore((s) => s.userId);
  const pinPartner = usePinStore((s) => s.partner);

  // Local cleanup of WebRTC + audio. Used by both user-initiated hangup
  // (handleEndCall, which also calls store.endCall to send CALL_END) and
  // remote hangup (CALL_ENDED handler, which clears store state itself).
  const teardownLocal = useCallback(() => {
    activePeerIdRef.current = null;
    pendingInitiatorStreamRef.current = null;
    rtcRef.current.destroy();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    // Only stop the mic if the pin peer also isn't using it. Both share
    // useAudio's micStreamRef; stopping while pin is live would silence
    // the open-mic side too.
    if (activePinPeerIdRef.current === null) {
      stopMicrophone();
    }
  }, [stopMicrophone]);

  const teardownPin = useCallback(() => {
    activePinPeerIdRef.current = null;
    pinRtcRef.current.destroy();
    if (pinAudioRef.current) {
      pinAudioRef.current.pause();
      pinAudioRef.current.srcObject = null;
      pinAudioRef.current.remove();
      pinAudioRef.current = null;
    }
    // If no call is active either, the mic can release.
    if (activePeerIdRef.current === null) {
      stopMicrophone();
    }
  }, [stopMicrophone]);

  const handleEndCall = useCallback(() => {
    teardownLocal();
    endCall();
  }, [teardownLocal, endCall]);

  // Wire up WEBRTC_SIGNAL handling from presence store (one-time setup)
  useEffect(() => {
    const rtc = rtcRef.current;
    const pinRtc = pinRtcRef.current;

    rtc.onStream = (stream) => {
      audioRef.current = playRemoteStream(stream);
    };

    rtc.onConnect = () => {
      markCallConnected();
    };

    // Only end call if peer closes unexpectedly (not when we replace it)
    rtc.onClose = () => {
      console.log("[webrtc] onClose fired, activePeerId:", activePeerIdRef.current);
      // Don't trigger endCall here — handleEndCall is the only authority
    };

    pinRtc.onStream = (stream) => {
      pinAudioRef.current = playRemoteStream(stream);
    };
    pinRtc.onConnect = () => {
      console.log("[pin] open-mic peer connected");
    };
    pinRtc.onClose = () => {
      // Audio peer dropped on its own. Pin state stays as-is — partner
      // disconnect is reconciled via PRESENCE_UPDATE / PIN_REMOVED.
      console.log("[pin] open-mic peer closed");
    };

    setWebRTCSignalHandler((fromUserId, signal) => {
      // Two peers can be live at once (call + pin). The relay routes by
      // user_id, so the signal envelope itself doesn't say which peer
      // it's for — but from_user_id does: if it matches the pinned
      // partner it's pin traffic, otherwise it's the call peer's.
      const sigType = (signal as { type?: string } | undefined)?.type ?? "candidate";
      if (activePinPeerIdRef.current === fromUserId) {
        console.log(`[webrtc] inbound ${sigType} → pin peer (from ${fromUserId})`);
        pinRtc.signal(signal);
      } else {
        console.log(`[webrtc] inbound ${sigType} → call peer (from ${fromUserId})`);
        rtc.signal(signal);
      }
    });

    setRemoteEndCallHandler(() => {
      teardownLocal();
    });

    return () => {
      rtc.onStream = null;
      rtc.onConnect = null;
      rtc.onClose = null;
      pinRtc.onStream = null;
      pinRtc.onConnect = null;
      pinRtc.onClose = null;
      setWebRTCSignalHandler(null);
      setRemoteEndCallHandler(null);
    };
  }, [playRemoteStream, markCallConnected, teardownLocal]);

  // Wire onSignal separately so each closure has the latest target id.
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
    pinRtcRef.current.onSignal = (data) => {
      const targetId = activePinPeerIdRef.current;
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

  // Pin audio lifecycle. Both sides run this on partner-set; the lower
  // lexicographic user_id offers, the other answers — deterministic
  // glare resolution mirrors the mac client's startPinAudio.
  useEffect(() => {
    const partnerId = pinPartner?.userId ?? null;
    const currentPin = activePinPeerIdRef.current;

    if (partnerId === currentPin) return; // no change

    if (currentPin && partnerId !== currentPin) {
      teardownPin();
    }

    if (partnerId && userId) {
      const amInitiator = userId < partnerId;
      activePinPeerIdRef.current = partnerId;
      console.log(
        `[pin] open-mic peer starting — initiator=${amInitiator} partner=${partnerId}`,
      );
      // Mic stays unmuted the whole pin lifetime — that's what "open mic"
      // means. requestMicrophone reuses the existing stream if a call is
      // already running, so call + pin share one mic.
      void requestMicrophone().then((stream) => {
        stream.getAudioTracks().forEach((t) => { t.enabled = true; });
        pinRtcRef.current.createPeer(amInitiator, stream);
      });
    }
  }, [pinPartner, userId, requestMicrophone, teardownPin]);

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
