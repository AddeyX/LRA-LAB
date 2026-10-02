import {
  MAX_MS,
  blockDuration,
  sortedBlocks,
  validateSignature,
  type Block,
  type PulseBlock,
} from "./signature";

export const GRID_MS = 40;
export const snapTime = (timeMs: number) =>
  Math.max(0, Math.round(timeMs / GRID_MS) * GRID_MS);

/** Reject invalid edits atomically; moving a beat never packs its neighbors. */
export function editTimeline(blocks: Block[], replacement: Block) {
  const original = blocks.find((block) => block.id === replacement.id);
  const next = sortedBlocks([
    ...blocks.filter((block) => block.id !== replacement.id),
    {
      ...replacement,
      startMs:
        original?.startMs === replacement.startMs
          ? replacement.startMs
          : snapTime(replacement.startMs),
    },
  ]);
  const error = validateSignature({ schemaVersion: 1, blocks: next });
  return { blocks: error ? blocks : next, error };
}

export function firstOpenSlot(
  blocks: Block[],
  durationMs: number,
): number | null {
  let cursor = 0;
  for (const block of sortedBlocks(blocks)) {
    if (cursor + durationMs <= block.startMs) return cursor;
    cursor = Math.max(
      cursor,
      Math.ceil((block.startMs + blockDuration(block)) / GRID_MS) * GRID_MS,
    );
  }
  return cursor + durationMs <= MAX_MS ? cursor : null;
}

export function resizePulse(block: PulseBlock, durationMs: number): PulseBlock {
  const duration = Math.max(GRID_MS, snapTime(durationMs));
  let previous = -1;
  const keyframes = block.keyframes.map((point, index) => {
    // Keep integer timestamps distinct when several points scale into one ms.
    const latest = duration - (block.keyframes.length - 1 - index);
    const timeMs = Math.min(
      latest,
      Math.max(
        previous + 1,
        Math.round((point.timeMs / block.durationMs) * duration),
      ),
    );
    previous = timeMs;
    return { ...point, timeMs };
  });
  return {
    ...block,
    durationMs: duration,
    keyframes,
  };
}
