// Short generated tones for call events. No audio assets — uses WebAudio.

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  try {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
};

const tone = (
  freq: number,
  durationMs: number,
  startOffsetMs = 0,
  gain = 0.18,
) => {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const start = c.currentTime + startOffsetMs / 1000;
  const end = start + durationMs / 1000;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);

  // Soft attack/release
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(end + 0.02);
};

// Two-note rising chime — incoming call.
export const playIncomingCue = () => {
  tone(660, 180, 0);
  tone(880, 220, 180);
};

// Single soft note — call connected.
export const playConnectedCue = () => {
  tone(740, 140, 0, 0.14);
};

// Descending two-note — call ended.
export const playEndedCue = () => {
  tone(540, 140, 0, 0.12);
  tone(440, 180, 140, 0.10);
};
