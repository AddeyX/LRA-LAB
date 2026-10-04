export const PROTOCOL_VERSION = 1;
export const CATALOG_VERSION = 1;
export const MAX_MS = 5000;
export const MAX_BLOCKS = 32;
export const MAX_POINTS = 32;

// IDs/names: TI DRV2605L datasheet, library 6. Click slot lengths reserve
// ~120 ms from TI LRA response plots; ROM timing varies by actuator.
export const EFFECTS = [
  { id: 1, name: "Strong click", strength: "100%", durationMs: 120 },
  { id: 2, name: "Strong click", strength: "60%", durationMs: 120 },
  { id: 3, name: "Strong click", strength: "30%", durationMs: 120 },
  { id: 4, name: "Sharp click", strength: "100%", durationMs: 120 },
  { id: 5, name: "Sharp click", strength: "60%", durationMs: 120 },
  { id: 6, name: "Sharp click", strength: "30%", durationMs: 120 },
  { id: 7, name: "Soft bump", strength: "100%", durationMs: 160 },
  { id: 8, name: "Soft bump", strength: "60%", durationMs: 160 },
  { id: 9, name: "Soft bump", strength: "30%", durationMs: 160 },
  { id: 15, name: "Alert", strength: "100%", durationMs: 750 },
  { id: 16, name: "Long alert", strength: "100%", durationMs: 1000 },
] as const;

export type Point = { timeMs: number; amplitudePercent: number };
export type EffectBlock = {
  id: string;
  type: "effect";
  startMs: number;
  effectId: number;
};
export type PulseBlock = {
  id: string;
  type: "pulse";
  startMs: number;
  durationMs: number;
  keyframes: Point[];
};
export type Block = EffectBlock | PulseBlock;
export type Signature = { schemaVersion: 1; blocks: Block[] };
export const emptySignature = (): Signature => ({
  schemaVersion: 1,
  blocks: [],
});
export const effectById = (id: number) =>
  EFFECTS.find((effect) => effect.id === id);
export const blockDuration = (block: Block) =>
  block.type === "effect"
    ? (effectById(block.effectId)?.durationMs ?? 0)
    : block.durationMs;
export const durationOf = (signature: Signature) =>
  Math.max(
    0,
    ...signature.blocks.map((block) => block.startMs + blockDuration(block)),
  );
export const sortedBlocks = (blocks: Block[]) =>
  [...blocks].sort((a, b) => a.startMs - b.startMs);
const integer = (value: unknown) => Number.isInteger(value);

export function validateSignature(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Signature missing.";
  const signature = input as Signature;
  if (signature.schemaVersion !== 1 || !Array.isArray(signature.blocks))
    return "Unsupported signature format.";
  if (signature.blocks.length < 1 || signature.blocks.length > MAX_BLOCKS)
    return "Use 1–32 blocks.";
  let end = 0;
  let pointCount = 0;
  const ids = new Set<string>();
  for (const block of signature.blocks) {
    if (
      !block ||
      typeof block !== "object" ||
      typeof block.id !== "string" ||
      !block.id ||
      ids.has(block.id)
    )
      return "Block IDs must be unique.";
    ids.add(block.id);
    if (!integer(block.startMs) || block.startMs < end || block.startMs < 0)
      return "Blocks must be ordered and cannot overlap.";
    let duration = 0;
    if (block.type === "effect") {
      if (!integer(block.effectId) || !effectById(block.effectId))
        return "Unsupported effect.";
      duration = blockDuration(block);
    } else if (block.type === "pulse") {
      duration = block.durationMs;
      if (!integer(duration) || duration < 10)
        return "Pulse duration must be at least 10 ms.";
      if (!Array.isArray(block.keyframes) || block.keyframes.length < 2)
        return "Pulse needs start and end keyframes.";
      pointCount += block.keyframes.length;
      if (pointCount > MAX_POINTS)
        return "Use at most 32 pulse keyframes total.";
      let previous = -1;
      for (const point of block.keyframes) {
        if (
          !point ||
          !integer(point.timeMs) ||
          !integer(point.amplitudePercent) ||
          point.timeMs <= previous ||
          point.amplitudePercent < 0 ||
          point.amplitudePercent > 100
        )
          return "Keyframe times must increase; amplitude must be 0–100%.";
        previous = point.timeMs;
      }
      if (block.keyframes[0].timeMs !== 0 || previous !== duration)
        return "Pulse keyframes must begin at 0 and end at pulse duration.";
    } else return "Unknown block type.";
    end = block.startMs + duration;
    if (end > MAX_MS) return "Signature exceeds 5 seconds.";
  }
  return null;
}

export function amplitudeAt(points: Point[], elapsedMs: number): number {
  if (elapsedMs <= points[0].timeMs) return points[0].amplitudePercent;
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (elapsedMs <= right.timeMs) {
      const left = points[index - 1];
      const numerator =
        (right.amplitudePercent - left.amplitudePercent) *
        (elapsedMs - left.timeMs);
      const denominator = right.timeMs - left.timeMs;
      const rounded =
        Math.sign(numerator) *
        Math.floor(
          (Math.abs(numerator) + Math.floor(denominator / 2)) / denominator,
        );
      return left.amplitudePercent + rounded;
    }
  }
  return points[points.length - 1].amplitudePercent;
}
export const rtpValue = (amplitudePercent: number) =>
  Math.round((amplitudePercent * 127) / 100);

export function parseDraft(raw: string | null): Signature | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" &&
      "schemaVersion" in parsed && parsed.schemaVersion === 1 &&
      "blocks" in parsed && Array.isArray(parsed.blocks) && parsed.blocks.length === 0)
      return parsed as Signature;
    return validateSignature(parsed) === null ? (parsed as Signature) : null;
  } catch {
    return null;
  }
}
