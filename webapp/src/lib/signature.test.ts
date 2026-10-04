import { describe, expect, it } from "vitest";
import {
  amplitudeAt,
  parseDraft,
  durationOf,
  validateSignature,
  type Signature,
} from "./signature";
import { exportCpp } from "./export";
const sample: Signature = {
  schemaVersion: 1,
  blocks: [
    { id: "a", type: "effect", startMs: 0, effectId: 1 },
    {
      id: "b",
      type: "pulse",
      startMs: 200,
      durationMs: 100,
      keyframes: [
        { timeMs: 0, amplitudePercent: 0 },
        { timeMs: 100, amplitudePercent: 100 },
      ],
    },
  ],
};
describe("signature", () => {
  it("validates mixed blocks and interpolation", () => {
    expect(validateSignature(sample)).toBeNull();
    expect(durationOf(sample)).toBe(300);
    expect(
      amplitudeAt(
        sample.blocks[1].type === "pulse" ? sample.blocks[1].keyframes : [],
        50,
      ),
    ).toBe(50);
    expect(
      amplitudeAt(
        [
          { timeMs: 0, amplitudePercent: 100 },
          { timeMs: 2, amplitudePercent: 99 },
        ],
        1,
      ),
    ).toBe(99);
  });
  it("rejects overlap, overrun, and malformed keyframes", () => {
    expect(
      validateSignature({
        ...sample,
        blocks: [sample.blocks[0], { ...sample.blocks[1], startMs: 100 }],
      }),
    ).toMatch(/overlap/);
    expect(
      validateSignature({
        ...sample,
        blocks: [{ ...sample.blocks[1], startMs: 4950 }],
      }),
    ).toMatch(/5 seconds/);
    expect(
      validateSignature({
        ...sample,
        blocks: [
          {
            ...sample.blocks[1],
            keyframes: [
              { timeMs: 5, amplitudePercent: 0 },
              { timeMs: 100, amplitudePercent: 100 },
            ],
          },
        ],
      }),
    ).toMatch(/begin at 0/);
  });
  it("ignores malformed persisted drafts and enforces limits", () => {
    expect(parseDraft("{broken")).toBeNull();
    expect(
      parseDraft(
        JSON.stringify({
          ...sample,
          blocks: [{ ...sample.blocks[0], effectId: 99 }],
        }),
      ),
    ).toBeNull();
    expect(parseDraft(JSON.stringify(sample))).toEqual(sample);
    expect(
      validateSignature({
        ...sample,
        blocks: Array.from({ length: 33 }, (_, i) => ({
          id: String(i),
          type: "effect",
          startMs: i * 120,
          effectId: 1,
        })),
      }),
    ).toMatch(/1–32 blocks/);
  });
  it("exports same sequence", () => {
    const code = exportCpp(sample);
    expect(code).toContain("{0, 120, 1, 0, 0}");
    expect(code).toContain("{200, 100, 0, 0, 2}");
    expect(code).toContain("signatureEndMs = 300");
  });
});

it("restores an empty draft after deleting the last beat without making it playable", () => {
  const lastSaved = sample;
  const draft = parseDraft('{"schemaVersion":1,"blocks":[]}');
  const recovered = draft ?? lastSaved;
  expect(recovered).toEqual({ schemaVersion: 1, blocks: [] });
  expect(validateSignature(recovered)).toMatch(/1–32 blocks/);
});

it.each(['{"schemaVersion":2,"blocks":[]}', '{"blocks":[]}', '{"schemaVersion":1,"blocks":{}}', 'null'])(
  "still rejects malformed or unsupported empty drafts: %s", (raw) => {
    expect(parseDraft(raw)).toBeNull();
  },
);
