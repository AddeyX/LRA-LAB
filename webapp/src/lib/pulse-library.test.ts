import { describe, expect, it } from "vitest";
import {
  clonePulse,
  nextPresetSlot,
  PULSE_LIBRARY_KEY,
  readPulseLibrary,
  writePulseLibrary,
  savePulsePreset,
  removePulsePreset,
  type PulsePreset,
} from "./pulse-library";
import { validateSignature } from "./signature";

const preset: PulsePreset = {
  id: "one",
  slot: 0,
  name: "Click",
  durationMs: 320,
  keyframes: [
    { timeMs: 0, amplitudePercent: 0 },
    { timeMs: 83, amplitudePercent: 75 },
    { timeMs: 320, amplitudePercent: 0 },
  ],
};
function storageWith(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set("lra-studio-pulse-library-v1", raw);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("custom pulse library", () => {
  it("preserves other tabs' presets and resolves new slot collisions", () => {
    const storage = storageWith();
    savePulsePreset(storage, preset);
    const second = { ...preset, id: "two", name: "Second" };
    expect(savePulsePreset(storage, second).map((p) => [p.id, p.slot])).toEqual(
      [
        ["one", 0],
        ["two", 1],
      ],
    );
    const updated = savePulsePreset(storage, { ...second, name: "Renamed" });
    expect(updated.map((p) => [p.id, p.slot, p.name])).toEqual([
      ["one", 0, "Click"],
      ["two", 1, "Renamed"],
    ]);
    expect(removePulsePreset(storage, "one")).toEqual([updated[1]]);
  });
  it("retries saving after transient read denial clears", () => {
    const underlying = storageWith();
    let denied = true;
    const storage = {
      ...underlying,
      getItem: (key: string) => {
        if (denied) throw Error("denied");
        return underlying.getItem(key);
      },
    };
    expect(readPulseLibrary(storage).writable).toBe(false);
    expect(() => savePulsePreset(storage, preset)).toThrow();
    denied = false;
    expect(savePulsePreset(storage, preset)).toEqual([preset]);
  });
  it("round trips normalized presets without touching project storage", () => {
    const storage = storageWith();
    storage.setItem("lra-studio-projects-v1", "keep");
    const saved = writePulseLibrary(storage, [
      { ...preset, name: "  Click  " },
    ]);
    expect(saved[0].name).toBe("Click");
    expect(readPulseLibrary(storage).presets).toEqual([preset]);
    expect(storage.getItem("lra-studio-projects-v1")).toBe("keep");
    expect(readPulseLibrary(storage).writable).toBe(true);
  });
  it("retains first valid ID and slot and skips corrupt records", () => {
    const storage = storageWith(
      JSON.stringify({
        schemaVersion: 1,
        presets: [
          { ...preset, durationMs: 0 },
          preset,
          { ...preset, name: "Duplicate" },
          { ...preset, id: "slot-duplicate" },
          { ...preset, id: "two", slot: 1 },
        ],
      }),
    );
    const loaded = readPulseLibrary(storage);
    expect(loaded.presets.map((p) => p.id)).toEqual(["one", "two"]);
    expect(loaded.notice).toBeTruthy();
    expect(loaded.writable).toBe(true);
  });
  it.each([
    "broken",
    '{"schemaVersion":2,"presets":[]}',
    '{"schemaVersion":1,"presets":{}}',
  ])("does not overwrite unreadable library %s", (raw) => {
    const storage = storageWith(raw);
    expect(readPulseLibrary(storage).writable).toBe(false);
    expect(() => writePulseLibrary(storage, [preset])).toThrow();
    expect(storage.getItem(PULSE_LIBRARY_KEY)).toBe(raw);
  });
  it.each([
    { durationMs: 321 },
    { name: " " },
    { name: "x".repeat(61) },
    { slot: -1 },
    {
      keyframes: [
        { timeMs: 0, amplitudePercent: 101 },
        { timeMs: 320, amplitudePercent: 0 },
      ],
    },
    {
      keyframes: [
        { timeMs: 0, amplitudePercent: 0 },
        { timeMs: 0, amplitudePercent: 20 },
        { timeMs: 320, amplitudePercent: 0 },
      ],
    },
  ])("rejects invalid preset data %j", (changes) => {
    const storage = storageWith();
    expect(() =>
      writePulseLibrary(storage, [{ ...preset, ...changes }]),
    ).toThrow();
    expect(storage.getItem(PULSE_LIBRARY_KEY)).toBeNull();
  });
  it("retains existing library after quota failure and handles read denial", () => {
    const storage = storageWith(
      JSON.stringify({ schemaVersion: 1, presets: [preset] }),
    );
    expect(() =>
      writePulseLibrary(
        {
          ...storage,
          setItem: () => {
            throw Error("quota");
          },
        },
        [],
      ),
    ).toThrow("quota");
    expect(readPulseLibrary(storage).presets).toEqual([preset]);
    expect(
      readPulseLibrary({
        getItem: () => {
          throw Error("denied");
        },
      }).writable,
    ).toBe(false);
  });
  it("reuses the first free slot and creates independent schema-v1 blocks", () => {
    expect(
      nextPresetSlot([
        { ...preset, slot: 1 },
        { ...preset, id: "three", slot: 3 },
      ]),
    ).toBe(0);
    expect(nextPresetSlot([preset, { ...preset, id: "three", slot: 2 }])).toBe(
      1,
    );
    const first = clonePulse(preset, "block-1", 0);
    const second = clonePulse(preset, "block-2", 400);
    first.keyframes[1].amplitudePercent = 10;
    expect(second.keyframes[1].amplitudePercent).toBe(75);
    expect(preset.keyframes[1].amplitudePercent).toBe(75);
    expect(
      validateSignature({ schemaVersion: 1, blocks: [first, second] }),
    ).toBeNull();
  });
});
