import { describe, expect, it } from "vitest";
import {
  effectEnvelope,
  envelopeAt,
  sampleEnvelope,
  signatureEnvelope,
} from "./simulation";
import type { Signature } from "./signature";

const signature: Signature = {
  schemaVersion: 1,
  blocks: [
    {
      id: "pulse",
      type: "pulse",
      startMs: 400,
      durationMs: 200,
      keyframes: [
        { timeMs: 0, amplitudePercent: 80 },
        { timeMs: 200, amplitudePercent: 40 },
      ],
    },
    { id: "click", type: "effect", startMs: 0, effectId: 2 },
  ],
};

describe("signature simulation envelope", () => {
  it("scales effect shapes by catalog strength and ends at the slot length", () => {
    const points = effectEnvelope(2);
    expect(Math.max(...points.map((p) => p.amplitude))).toBe(60);
    expect(points.at(-1)).toEqual({ timeMs: 120, amplitude: 0 });
  });

  it("stays silent in gaps and steps into pulses that start above zero", () => {
    const points = signatureEnvelope(signature);
    expect(envelopeAt(points, 200)).toBe(0);
    expect(envelopeAt(points, 399)).toBe(0);
    expect(envelopeAt(points, 400)).toBe(80);
    expect(envelopeAt(points, 500)).toBeCloseTo(60);
    expect(envelopeAt(points, 600)).toBe(0);
    expect(envelopeAt(points, 4000)).toBe(0);
  });

  it("samples a gain curve in the 0–1 range", () => {
    const curve = sampleEnvelope(signatureEnvelope(signature), 600, 100);
    expect(curve).toHaveLength(7);
    expect(curve[0]).toBe(0);
    expect(curve[4]).toBeCloseTo(0.8);
    expect(curve[6]).toBe(0);
  });
});
