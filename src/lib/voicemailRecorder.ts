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

/// Mac's `AVPlayer` doesn't decode WebM, so a voicemail recorded as
/// `audio/webm` from Chrome/Firefox arrives intact in the recipient's
/// inbox but silently won't play. We therefore force `audio/mp4` (an
/// MP4 container with AAC) — the only `MediaRecorder` mime that mac
/// can play natively. Returns null if the browser can't record mp4
/// (older Firefox builds in particular); `start()` translates that
/// into a clear user-facing error rather than producing a webm file
/// that half the team can't hear.
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return null;
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

    // Verify mp4 recording support BEFORE asking for the mic — failing
    // here means the user never sees the macOS permission prompt for
    // a feature their browser can't deliver.
    const mime = pickMimeType();
    if (!mime) {
      throw new Error(
        "Voicemail recording isn't supported in this browser. Use Chrome or Safari to leave a message.",
      );
    }
    this.mimeType = mime;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });

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
