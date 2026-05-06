// Browser-side mic recorder that captures to a single Blob ready to upload
// to Supabase Storage. Mirrors the Swift VoicemailRecorder's lifecycle so
// the UsersPage PTT branch can drive both clients with the same shape.
//
//   const r = new VoicemailRecorder();
//   await r.start();
//   ...
//   const result = await r.stop();   // { blob, mimeType, duration_ms } | null
//
// `start()` requests microphone permission via getUserMedia. Tracks are
// fully torn down in `stop()` / `cancel()` so the browser's "recording"
// indicator goes away.

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  duration_ms: number;
}

/// Picks the best mime type the browser supports for our pipeline. Order:
/// Safari-friendly mp4 first, then Chrome/Firefox webm, finally bare webm.
function pickMimeType(): string {
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return ""; // fall back to MediaRecorder default
}

export class VoicemailRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mimeType = "";

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    await this.cancel();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    this.mimeType = pickMimeType();
    const opts: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {};
    this.recorder = new MediaRecorder(this.stream, opts);

    this.chunks = [];
    this.recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    });
    this.recorder.start();
    this.startedAt = performance.now();
  }

  async stop(): Promise<RecordingResult | null> {
    const recorder = this.recorder;
    const stream = this.stream;
    if (!recorder || recorder.state !== "recording") {
      await this.cancel();
      return null;
    }

    // Wait for the stop event so the final dataavailable lands first.
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    recorder.stop();
    await stopped;

    const duration_ms = Math.round(performance.now() - this.startedAt);
    const mimeType = this.mimeType || recorder.mimeType || "audio/webm";

    // Free the mic right away so the browser indicator clears.
    stream?.getTracks().forEach((t) => t.stop());

    this.recorder = null;
    this.stream = null;
    this.startedAt = 0;

    if (duration_ms < 500 || this.chunks.length === 0) {
      this.chunks = [];
      return null;
    }

    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];
    return { blob, mimeType, duration_ms };
  }

  async cancel(): Promise<void> {
    try {
      if (this.recorder && this.recorder.state === "recording") {
        this.recorder.stop();
      }
    } catch {
      // Already stopped — ignore.
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.startedAt = 0;
  }
}
