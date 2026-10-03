import {
  blockDuration,
  effectById,
  sortedBlocks,
  type Block,
  type Signature,
} from "./signature";

/** Absolute-time envelope point; equal neighbouring times encode a step. */
export type EnvelopePoint = { timeMs: number; amplitude: number };

// Illustrative shapes only. ROM effect output depends on the actuator and
// auto-calibration, so these are not measured DRV2605L waveforms.
const SHAPES: Record<string, [number, number][]> = {
  "Strong click": [
    [0, 0],
    [5, 1],
    [25, 0.9],
    [60, 0],
  ],
  "Sharp click": [
    [0, 0],
    [3, 1],
    [18, 0.8],
    [36, 0],
  ],
  "Soft bump": [
    [0, 0],
    [35, 1],
    [70, 0.7],
    [140, 0],
  ],
};

export function effectEnvelope(effectId: number): EnvelopePoint[] {
  const effect = effectById(effectId);
  if (!effect) return [];
  const strength = Number.parseInt(effect.strength, 10);
  const duration = effect.durationMs;
  const shape = SHAPES[effect.name] ?? [
    [0, 0],
    [20, 1],
    [duration - 40, 1],
    [duration, 0],
  ];
  const points = shape.map(([timeMs, level]) => ({
    timeMs,
    amplitude: level * strength,
  }));
  if (points[points.length - 1].timeMs < duration)
    points.push({ timeMs: duration, amplitude: 0 });
  return points;
}

function blockEnvelope(block: Block): EnvelopePoint[] {
  return block.type === "pulse"
    ? block.keyframes.map((point) => ({
        timeMs: point.timeMs,
        amplitude: point.amplitudePercent,
      }))
    : effectEnvelope(block.effectId);
}

/** Whole-signature envelope, silent between blocks and after the last one. */
export function signatureEnvelope(signature: Signature): EnvelopePoint[] {
  const points: EnvelopePoint[] = [{ timeMs: 0, amplitude: 0 }];
  const push = (timeMs: number, amplitude: number) => {
    const last = points[points.length - 1];
    if (last.timeMs === timeMs && last.amplitude === amplitude) return;
    points.push({ timeMs, amplitude });
  };
  for (const block of sortedBlocks(signature.blocks)) {
    const shape = blockEnvelope(block);
    if (!shape.length) continue;
    push(block.startMs, 0);
    for (const point of shape)
      push(block.startMs + point.timeMs, point.amplitude);
    push(block.startMs + blockDuration(block), 0);
  }
  return points;
}

export function envelopeAt(points: EnvelopePoint[], timeMs: number): number {
  if (!points.length || timeMs < points[0].timeMs) return 0;
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (timeMs < right.timeMs) {
      const left = points[index - 1];
      return (
        left.amplitude +
        ((right.amplitude - left.amplitude) * (timeMs - left.timeMs)) /
          (right.timeMs - left.timeMs)
      );
    }
  }
  return points[points.length - 1].amplitude;
}

/** Samples 0–1 gain values at a fixed step for Web Audio value curves. */
export function sampleEnvelope(
  points: EnvelopePoint[],
  durationMs: number,
  stepMs = 1,
): Float32Array {
  const count = Math.max(2, Math.ceil(durationMs / stepMs) + 1);
  const samples = new Float32Array(count);
  for (let index = 0; index < count; index++)
    samples[index] =
      envelopeAt(points, Math.min(durationMs, index * stepMs)) / 100;
  return samples;
}
