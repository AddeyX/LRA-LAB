import { describe, expect, it } from "vitest";
import { BUZZ_SIGNATURE, SetupState } from "./setup.svelte";
import { validateSignature } from "./signature";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const memory = () => new MemoryStorage() as unknown as Storage;

describe("SetupState", () => {
  it("round-trips progress through storage", () => {
    const storage = memory();
    const first = new SetupState();
    first.parts = ["esp32", "cable"];
    first.lra = { ratedVrms: 2, maxVoltage: 2.5, maxConvention: "rms", resonantHz: 235 };
    first.pins = { sda: 8, scl: 9 };
    first.route = "platformio";
    first.nativeUsb = false;
    first.downloaded = true;
    first.completed = true;
    first.preferredMode = "docs";
    first.rigOpen = false;
    first.save(storage);

    const second = new SetupState();
    second.load(storage);
    expect(second.parts).toEqual(["esp32", "cable"]);
    expect(second.lra).toEqual(first.lra);
    expect(second.pins).toEqual({ sda: 8, scl: 9 });
    expect(second.route).toBe("platformio");
    expect(second.nativeUsb).toBe(false);
    expect(second.downloaded).toBe(true);
    expect(second.preferredMode).toBe("docs");
    expect(second.rigOpen).toBe(false);
  });

  it("starts guided with empty values and ignores corrupt storage", () => {
    const storage = memory();
    storage.setItem("lra-lab-setup-v1", "{not json");
    const state = new SetupState();
    state.load(storage);
    expect(state.preferredMode).toBeNull();
    expect(state.lra.ratedVrms).toBeNull();
    expect(state.pins.sda).toBeNull();
  });

  it("drops unknown or malformed saved values", () => {
    const storage = memory();
    storage.setItem(
      "lra-lab-setup-v1",
      JSON.stringify({
        parts: ["esp32", "toaster"],
        lra: { ratedVrms: "2", maxConvention: "volts", resonantHz: 170 },
        route: "make",
        preferredMode: "wizard",
      }),
    );
    const state = new SetupState();
    state.load(storage);
    expect(state.parts).toEqual(["esp32"]);
    expect(state.lra).toEqual({ ratedVrms: null, maxVoltage: null, maxConvention: "peak", resonantHz: 170 });
    expect(state.route).toBe("arduino");
    expect(state.preferredMode).toBeNull();
  });
});

it("ships a valid test pattern for the first buzz", () => {
  expect(validateSignature(BUZZ_SIGNATURE)).toBeNull();
});


describe("configuration-bound completion", () => {
  const configured = () => {
    const setup = new SetupState();
    setup.lra = { ratedVrms: 1.2, maxVoltage: 1.68, maxConvention: "peak", resonantHz: 170 };
    setup.pins = { sda: 4, scl: 5 };
    setup.downloaded = true;
    setup.felt = true;
    setup.completed = true;
    return setup;
  };

  it.each([
    ["rated voltage", (s: SetupState) => { s.lra.ratedVrms = 2; }],
    ["clamp voltage", (s: SetupState) => { s.lra.maxVoltage = 3; }],
    ["voltage convention", (s: SetupState) => { s.lra.maxConvention = "rms"; }],
    ["resonance", (s: SetupState) => { s.lra.resonantHz = 235; }],
    ["SDA", (s: SetupState) => { s.pins.sda = 8; }],
    ["SCL", (s: SetupState) => { s.pins.scl = 9; }],
    ["route", (s: SetupState) => { s.route = "platformio"; }],
    ["board", (s: SetupState) => { s.boardId = "esp32dev"; }],
    ["USB", (s: SetupState) => { s.nativeUsb = false; }],
  ])("invalidates downloaded and dependent progress after changing %s", (_, change) => {
    const setup = configured();
    expect(setup.downloaded).toBe(true);
    change(setup);
    expect(setup.downloaded).toBe(false);
    expect(setup.felt).toBe(false);
    expect(setup.completed).toBe(false);
    const storage = memory();
    setup.save(storage);
    const restored = new SetupState();
    restored.load(storage);
    expect(restored.downloaded).toBe(false);
    setup.downloaded = true;
    expect(setup.downloaded).toBe(true);
    expect(setup.felt).toBe(false);
  });

  it("does not trust legacy completion booleans without a configuration snapshot", () => {
    const storage = memory();
    storage.setItem("lra-lab-setup-v1", JSON.stringify({ downloaded: true, felt: true, completed: true }));
    const restored = new SetupState();
    restored.load(storage);
    expect(restored.downloaded).toBe(false);
    expect(restored.felt).toBe(false);
    expect(restored.completed).toBe(false);
  });
});
