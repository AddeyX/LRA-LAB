import { describe, expect, it } from "vitest";
import { editTimeline, firstOpenSlot, resizePulse, snapTime } from "./timeline";
import { type Block, type PulseBlock } from "./signature";

const click: Block = { id: "click", type: "effect", effectId: 1, startMs: 0 };
const pulse: PulseBlock = {
  id: "pulse",
  type: "pulse",
  startMs: 240,
  durationMs: 320,
  keyframes: [
    { timeMs: 0, amplitudePercent: 0 },
    { timeMs: 80, amplitudePercent: 75 },
    { timeMs: 320, amplitudePercent: 0 },
  ],
};

describe("40 ms timeline editing", () => {
  it("snaps placement to a grid step and keeps blocks sorted", () => {
    const result = editTimeline([pulse], { ...click, startMs: 59 });
    expect(result.error).toBeNull();
    expect(result.blocks.map((b) => b.startMs)).toEqual([40, 240]);
    expect(snapTime(-12)).toBe(0);
    expect(snapTime(61)).toBe(80);
  });
  it("moves an existing beat without duplicating it or shifting neighbors", () => {
    const result = editTimeline([click, pulse], { ...click, startMs: 603 });
    expect(result.error).toBeNull();
    expect(result.blocks.map((b) => [b.id, b.startMs])).toEqual([
      ["pulse", 240],
      ["click", 600],
    ]);
  });
  it("rejects occupied slots and preserves the original sequence", () => {
    const original = [click, pulse];
    const result = editTimeline(original, { ...click, startMs: 200 });
    expect(result.error).toMatch(/overlap/);
    expect(result.blocks).toEqual(original);
    expect(original[0].startMs).toBe(0);
  });
  it("rejects a beat that extends beyond five seconds", () => {
    const result = editTimeline([click], { ...click, startMs: 4920 });
    expect(result.error).toMatch(/5 seconds/);
    expect(result.blocks[0].startMs).toBe(0);
  });
  it("finds usable gaps on grid even after effects with non-grid durations", () => {
    expect(firstOpenSlot([pulse], 120)).toBe(0);
    expect(firstOpenSlot([click, pulse], 120)).toBe(120);
    expect(firstOpenSlot([{ ...click, effectId: 15 }], 120)).toBe(760);
    expect(
      firstOpenSlot([{ ...pulse, startMs: 0, durationMs: 5000 }], 120),
    ).toBeNull();
  });
  it("resizes pulses in grid steps while preserving their envelope shape", () => {
    const resized = resizePulse(pulse, 479);
    expect(resized.durationMs).toBe(480);
    expect(resized.keyframes).toEqual([
      { timeMs: 0, amplitudePercent: 0 },
      { timeMs: 120, amplitudePercent: 75 },
      { timeMs: 480, amplitudePercent: 0 },
    ]);
    expect(resizePulse(pulse, 0).durationMs).toBe(40);
    expect(pulse.durationMs).toBe(320);
  });
  it("keeps closely spaced envelope points valid when shrinking to one cell", () => {
    const dense: PulseBlock = {
      ...pulse,
      keyframes: [0, 1, 2, 3, 319, 320].map((timeMs) => ({
        timeMs,
        amplitudePercent: 50,
      })),
    };
    const resized = resizePulse(dense, 40);
    expect(resized.keyframes.map((p) => p.timeMs)).toEqual([
      0, 1, 2, 3, 39, 40,
    ]);
    expect(editTimeline([], resized).error).toBeNull();
  });
  it("preserves imported timing when editing feel rather than moving a beat", () => {
    const legacy = { ...click, startMs: 15 };
    const edited = editTimeline([legacy], { ...legacy, effectId: 4 });
    expect(edited.error).toBeNull();
    expect(edited.blocks[0].startMs).toBe(15);
    expect(
      editTimeline([legacy], { ...legacy, startMs: 59 }).blocks[0].startMs,
    ).toBe(40);
  });
});
