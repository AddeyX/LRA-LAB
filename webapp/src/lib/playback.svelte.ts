import { durationOf, type Signature } from "./signature";
import {
  envelopeAt,
  sampleEnvelope,
  signatureEnvelope,
  type EnvelopePoint,
} from "./simulation";

export type PlaybackSource = "simulation" | "board";
export type PlaybackStatus =
  | "idle"
  | "starting"
  | "playing"
  | "completed"
  | "stopped"
  | "failed";

// Audible stand-in for the default 170 Hz LRA resonance; harmonics keep it
// audible on laptop speakers that cannot reproduce the fundamental.
const CARRIER_HZ = 170;
const VOLUME = 0.35;
const LEAD_S = 0.04;
const MOTION_EASE_MS = 45;
const LINGER_MS = 1800;

type Voice = {
  oscillator: OscillatorNode;
  analyser: AnalyserNode;
  output: GainNode;
};

/** One clock for the timeline arm, visualizers, and simulated audio. */
export class Playback {
  status = $state<PlaybackStatus>("idle");
  source = $state<PlaybackSource>("simulation");
  positionMs = $state(0);
  totalMs = $state(0);
  envelope = $state.raw<EnvelopePoint[]>([]);
  /** Eased 0–1 amplitude so motion visuals never jump. */
  motion = $state(0);
  /** Frame clock for oscillation phase; keeps ticking while motion settles. */
  clockMs = $state(0);
  muted = $state(false);
  /** Keeps the expanded readout visible briefly after playback ends. */
  showing = $state(false);
  active = $derived(this.status === "starting" || this.status === "playing");

  private context: AudioContext | null = null;
  private voice: Voice | null = null;
  private startedAt = 0;
  private frame = 0;
  private lastFrame = 0;
  private linger: ReturnType<typeof setTimeout> | undefined;

  /** Call synchronously from the user gesture so browsers allow audio. */
  prime() {
    if (typeof AudioContext === "undefined") return;
    this.context ??= new AudioContext({ latencyHint: "interactive" });
    if (this.context.state === "suspended") void this.context.resume();
  }

  begin(signature: Signature, source: PlaybackSource) {
    clearTimeout(this.linger);
    this.stopVoice();
    this.envelope = signatureEnvelope(signature);
    this.totalMs = durationOf(signature);
    this.source = source;
    this.positionMs = 0;
    this.status = "starting";
    this.showing = true;
  }

  run() {
    if (this.status !== "starting") return;
    const context = this.context;
    let leadMs = 0;
    if (context && this.totalMs > 0) {
      const start = context.currentTime + LEAD_S;
      this.voice = this.createVoice(context, start);
      leadMs = (LEAD_S + (context.outputLatency || context.baseLatency || 0)) * 1000;
    }
    this.startedAt = performance.now() + leadMs;
    this.status = "playing";
    this.loop();
  }

  /** Board reported completion; simulation completes on its own clock. */
  finish() {
    if (!this.active) return;
    this.positionMs = this.totalMs;
    this.settle("completed");
  }

  stop(status: "stopped" | "failed" = "stopped") {
    if (this.active) this.settle(status);
  }

  /** Drop the frozen arm once the signature it describes has changed. */
  clear() {
    if (this.active || this.status === "idle") return;
    clearTimeout(this.linger);
    this.status = "idle";
    this.positionMs = 0;
    this.showing = false;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const voice = this.voice;
    if (voice && this.context && this.source === "simulation")
      voice.output.gain.setTargetAtTime(
        muted ? 0 : VOLUME,
        this.context.currentTime,
        0.015,
      );
  }

  /** Fills `buffer` with the live audio waveform; false when silent. */
  readWaveform(buffer: Float32Array<ArrayBuffer>): boolean {
    if (!this.voice) return false;
    this.voice.analyser.getFloatTimeDomainData(buffer);
    return true;
  }

  dispose() {
    clearTimeout(this.linger);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.stopVoice();
    void this.context?.close();
    this.context = null;
  }

  private settle(status: "completed" | "stopped" | "failed") {
    this.status = status;
    this.stopVoice();
    clearTimeout(this.linger);
    this.linger = setTimeout(() => {
      if (!this.active) this.showing = false;
    }, LINGER_MS);
  }

  private createVoice(context: AudioContext, start: number): Voice {
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(
      context.createPeriodicWave(
        new Float32Array([0, 0, 0, 0]),
        new Float32Array([0, 1, 0.35, 0.15]),
      ),
    );
    oscillator.frequency.value = CARRIER_HZ;
    const envelope = context.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueCurveAtTime(
      sampleEnvelope(this.envelope, this.totalMs),
      start,
      this.totalMs / 1000,
    );
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const output = context.createGain();
    // Board previews keep the analyser fed but let the actuator be heard.
    output.gain.value =
      this.source === "simulation" && !this.muted ? VOLUME : 0;
    oscillator.connect(envelope).connect(analyser).connect(output);
    output.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + this.totalMs / 1000 + 0.1);
    return { oscillator, analyser, output };
  }

  private stopVoice() {
    const voice = this.voice;
    const context = this.context;
    this.voice = null;
    if (!voice || !context) return;
    const now = context.currentTime;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setTargetAtTime(0, now, 0.01);
    voice.oscillator.onended = () => voice.output.disconnect();
    try {
      voice.oscillator.stop(now + 0.08);
    } catch {
      /* already stopped */
    }
  }

  private loop() {
    if (!this.frame) {
      this.lastFrame = 0;
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private tick = (time: number) => {
    const elapsed = this.lastFrame ? time - this.lastFrame : 16;
    this.lastFrame = time;
    this.clockMs = time;
    if (this.status === "playing") {
      const position = Math.max(0, time - this.startedAt);
      this.positionMs = Math.min(this.totalMs, position);
      // Board previews wait for DONE so the arm never claims early completion.
      if (position >= this.totalMs && this.source === "simulation")
        this.settle("completed");
    }
    const target = this.active
      ? envelopeAt(this.envelope, this.positionMs) / 100
      : 0;
    this.motion +=
      (target - this.motion) * (1 - Math.exp(-elapsed / MOTION_EASE_MS));
    if (this.active || this.motion > 0.002)
      this.frame = requestAnimationFrame(this.tick);
    else {
      this.motion = 0;
      this.frame = 0;
    }
  };
}
