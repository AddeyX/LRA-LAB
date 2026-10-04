import { describe, expect, it } from "vitest";
import { insertNode, moveNode, removeNode } from "./envelope";
import type { Point } from "./signature";

const points: Point[] = [
  { timeMs: 0, amplitudePercent: 0 },
  { timeMs: 80, amplitudePercent: 75 },
  { timeMs: 320, amplitudePercent: 0 },
];

describe("envelope node editing", () => {
  it("snaps timing and clamps amplitude without mutating the original", () => {
    expect(moveNode(points, 1, 97, 103)[1]).toEqual({
      timeMs: 100,
      amplitudePercent: 100,
    });
    expect(moveNode(points, 1, -40, -3)[1]).toEqual({
      timeMs: 10,
      amplitudePercent: 0,
    });
    expect(moveNode(points, 1, 400, 12.7)[1]).toEqual({
      timeMs: 310,
      amplitudePercent: 13,
    });
    expect(points[1]).toEqual({ timeMs: 80, amplitudePercent: 75 });
  });
  it("pins endpoints while allowing vertical movement", () => {
    expect(moveNode(points, 0, 80, 30)[0]).toEqual({
      timeMs: 0,
      amplitudePercent: 30,
    });
    expect(moveNode(points, 2, 80, 50)[2]).toEqual({
      timeMs: 320,
      amplitudePercent: 50,
    });
  });
  it("preserves off-grid times for amplitude-only edits and tight neighbors", () => {
    const dense = [0, 11, 12, 13, 40].map((timeMs) => ({
      timeMs,
      amplitudePercent: 50,
    }));
    expect(moveNode(dense, 2, 20, 80)[2]).toEqual({
      timeMs: 12,
      amplitudePercent: 80,
    });
    expect(moveNode(dense, 1, 11, 30)[1]).toEqual({
      timeMs: 11,
      amplitudePercent: 30,
    });
  });
  it("does not move off-grid nodes backward when no forward snapped slot exists", () => {
    const dense = [0, 11, 12, 40].map((timeMs) => ({
      timeMs,
      amplitudePercent: 50,
    }));
    expect(moveNode(dense, 1, 21, 70)[1]).toEqual({
      timeMs: 11,
      amplitudePercent: 70,
    });
  });
  it("inserts into the largest legal gap and interpolates amplitude", () => {
    expect(insertNode(points, 32)).toEqual({
      index: 2,
      points: [
        points[0],
        points[1],
        { timeMs: 200, amplitudePercent: 38 },
        points[2],
      ],
    });
    expect(insertNode(points, 3)).toBeNull();
    expect(
      insertNode(
        [
          { timeMs: 0, amplitudePercent: 0 },
          { timeMs: 9, amplitudePercent: 100 },
        ],
        32,
      ),
    ).toBeNull();
  });
  it("removes interior nodes but protects endpoints", () => {
    expect(removeNode(points, 1)).toEqual([points[0], points[2]]);
    expect(removeNode(points, 0)).toEqual(points);
    expect(removeNode(points, 2)).toEqual(points);
  });
  it("ignores invalid coordinates rather than producing invalid pulse data", () => {
    expect(moveNode(points, 1, NaN, 40)).toEqual(points);
    expect(moveNode(points, 1, 100, Infinity)).toEqual(points);
  });
});
