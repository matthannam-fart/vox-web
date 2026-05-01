import { useCallback, useRef, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";

// HTMLMediaElement.setSinkId is not in lib.dom yet for all targets — narrow type.
type AudioElementWithSink = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

export const useAudio = () => {
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  const requestMicrophone = useCallback(async () => {
    // Reuse existing stream if available
    if (micStreamRef.current) {
      return micStreamRef.current;
    }
    const selectedInput = useSettingsStore.getState().selectedInputDevice;
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (selectedInput) {
      audioConstraints.deviceId = { exact: selectedInput };
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });
    micStreamRef.current = stream;
    setMicStream(stream);

    // Set up level metering
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    // Start level monitoring
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setMicLevel(Math.min(1, rms * 3)); // Boost for visibility
      animFrameRef.current = requestAnimationFrame(updateLevel);
    };
    updateLevel();

    return stream;
  }, []);

  const stopMicrophone = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      setMicStream(null);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const muteMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
      console.log("[audio] Mic MUTED");
    }
  }, []);

  const unmuteMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
      console.log("[audio] Mic UNMUTED");
    } else {
      console.warn("[audio] unmuteMic: no mic stream available");
    }
  }, []);

  const playRemoteStream = useCallback((stream: MediaStream) => {
    const audio = document.createElement("audio") as AudioElementWithSink;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.muted = false;
    audio.volume = 1.0;
    document.body.appendChild(audio);

    // Route to user-selected output device when supported (Chrome/Edge; not Safari/Firefox).
    const selectedOutput = useSettingsStore.getState().selectedOutputDevice;
    if (selectedOutput && typeof audio.setSinkId === "function") {
      audio.setSinkId(selectedOutput).catch((err: unknown) => {
        console.warn("[audio] setSinkId failed, falling back to default:", err);
      });
    }

    audio.play().catch((err) => {
      console.warn("[audio] autoplay blocked, will retry on click:", err);
      const retry = () => {
        audio.play().then(() => {
          document.removeEventListener("click", retry);
        }).catch(() => {});
      };
      document.addEventListener("click", retry);
    });

    // Monitor speaker level
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setSpeakerLevel(Math.min(1, rms * 3));
      requestAnimationFrame(updateLevel);
    };
    updateLevel();

    return audio;
  }, []);

  return {
    micStream,
    micLevel,
    speakerLevel,
    requestMicrophone,
    stopMicrophone,
    playRemoteStream,
    muteMic,
    unmuteMic,
  };
};
