import type { Point } from "./signature";

const increment = 10;
const clone = (points: Point[]) => points.map((point) => ({ ...point }));

/** Move one node without crossing its neighbors or quantizing untouched imports. */
export function moveNode(
  points: Point[],
  index: number,
  timeMs: number,
  amplitudePercent: number,
): Point[] {
  if (
    !points[index] ||
    !Number.isFinite(timeMs) ||
    !Number.isFinite(amplitudePercent)
  )
    return clone(points);
  const next = clone(points);
  let time = points[index].timeMs;
  if (index > 0 && index < points.length - 1 && timeMs !== time) {
    const minimum =
      Math.ceil((points[index - 1].timeMs + 1) / increment) * increment;
    const maximum =
      Math.floor((points[index + 1].timeMs - 1) / increment) * increment;
    if (minimum <= maximum) {
      const snapped = Math.min(
        maximum,
        Math.max(minimum, Math.round(timeMs / increment) * increment),
      );
      if ((timeMs - time) * (snapped - time) >= 0) time = snapped;
    }
  }
  next[index] = {
    timeMs: time,
    amplitudePercent: Math.min(100, Math.max(0, Math.round(amplitudePercent))),
  };
  return next;
}

export function insertNode(
  points: Point[],
  maxPoints: number,
): { points: Point[]; index: number } | null {
  if (points.length >= maxPoints) return null;
  let best: { index: number; time: number; gap: number } | null = null;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1].timeMs,
      right = points[index].timeMs;
    const minimum = Math.ceil((left + 1) / increment) * increment;
    const maximum = Math.floor((right - 1) / increment) * increment;
    if (minimum > maximum || (best && right - left <= best.gap)) continue;
    best = {
      index,
      gap: right - left,
      time: Math.min(
        maximum,
        Math.max(
          minimum,
          Math.round((left + right) / (2 * increment)) * increment,
        ),
      ),
    };
  }
  if (!best) return null;
  const next = clone(points);
  const left = points[best.index - 1],
    right = points[best.index];
  const amplitude =
    left.amplitudePercent +
    ((right.amplitudePercent - left.amplitudePercent) *
      (best.time - left.timeMs)) /
      (right.timeMs - left.timeMs);
  next.splice(best.index, 0, {
    timeMs: best.time,
    amplitudePercent: Math.round(amplitude),
  });
  return { points: next, index: best.index };
}

export function removeNode(points: Point[], index: number): Point[] {
  return clone(points).filter(
    (_, i) => index <= 0 || index >= points.length - 1 || i !== index,
  );
}
