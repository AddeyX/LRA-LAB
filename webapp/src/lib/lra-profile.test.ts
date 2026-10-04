import { describe, expect, it } from "vitest";
import {
  EXAMPLE_LRA,
  EXAMPLE_PINS,
  deriveLra,
  derivePins,
  emptyLra,
  profileLabel,
} from "./lra-profile";

describe("deriveLra", () => {
  it("reproduces the bundled 170 Hz firmware registers from the example values", () => {
    const { profile, errors } = deriveLra(EXAMPLE_LRA);
    expect(errors).toEqual({});
    expect(profile).toMatchObject({
      ratedVoltage: 0x32,
      clampVoltage: 0x4f,
      driveTime: 0x18,
    });
    expect(profile!.ratedVrms).toBeLessThanOrEqual(1.2);
    expect(profile!.clampVpeak).toBeLessThanOrEqual(1.68);
  });

  it("matches the datasheet drive-time example (200 Hz -> 2.5 ms)", () => {
    const { profile } = deriveLra({ ...EXAMPLE_LRA, resonantHz: 200 });
    expect(profile!.driveTimeMs).toBeCloseTo(2.5);
    expect(profile!.driveTime).toBe(20);
  });

  it("converts an RMS maximum to peak before encoding the clamp", () => {
    const peak = deriveLra({ ...EXAMPLE_LRA, maxVoltage: 2, maxConvention: "peak" });
    const rms = deriveLra({ ...EXAMPLE_LRA, maxVoltage: 2, maxConvention: "rms" });
    expect(peak.profile!.clampVoltage).toBe(94);
    expect(rms.profile!.clampVoltage).toBe(133);
  });

  it("never rounds voltages above the entered ratings", () => {
    for (const rated of [0.9, 1.8, 2, 2.5]) {
      const { profile } = deriveLra({ ...EXAMPLE_LRA, ratedVrms: rated, maxVoltage: 5 });
      expect(profile!.ratedVrms).toBeLessThanOrEqual(rated);
    }
  });

  it("reports missing values without substituting defaults", () => {
    const { profile, errors } = deriveLra(emptyLra());
    expect(profile).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["maxVoltage", "ratedVrms", "resonantHz"]);
  });

  it("rejects unsupported resonance and out-of-range voltages", () => {
    expect(deriveLra({ ...EXAMPLE_LRA, resonantHz: 90 }).errors.resonantHz).toBeTruthy();
    expect(deriveLra({ ...EXAMPLE_LRA, resonantHz: 900 }).errors.resonantHz).toBeTruthy();
    expect(deriveLra({ ...EXAMPLE_LRA, ratedVrms: 9 }).errors.ratedVrms).toMatch(/maximum/);
    expect(deriveLra({ ...EXAMPLE_LRA, maxVoltage: 6 }).errors.maxVoltage).toMatch(/maximum/);
    expect(deriveLra({ ...EXAMPLE_LRA, maxVoltage: 0.01 }).errors.maxVoltage).toMatch(/low/);
  });

  it("warns when the clamp sits below the nominal rated peak", () => {
    const low = deriveLra({ ...EXAMPLE_LRA, ratedVrms: 2, maxVoltage: 1.5 });
    expect(low.profile).not.toBeNull();
    expect(low.warnings).toHaveLength(1);
    expect(deriveLra({ ...EXAMPLE_LRA, maxVoltage: 1.8 }).warnings).toEqual([]);
  });
});

describe("derivePins", () => {
  it("accepts distinct GPIO numbers", () => {
    expect(derivePins(EXAMPLE_PINS)).toEqual({ pins: { sda: 4, scl: 5 }, errors: {} });
  });
  it("rejects missing, fractional, out-of-range and shared pins", () => {
    expect(derivePins({ sda: null, scl: 5 }).errors.sda).toBeTruthy();
    expect(derivePins({ sda: 2.5, scl: 5 }).errors.sda).toBeTruthy();
    expect(derivePins({ sda: 4, scl: 49 }).errors.scl).toBeTruthy();
    expect(derivePins({ sda: 4, scl: 4 }).errors.scl).toMatch(/different/);
  });
});

it("labels the profile with resonance and pins", () => {
  const { profile } = deriveLra(EXAMPLE_LRA);
  expect(profileLabel(profile!, { sda: 4, scl: 5 })).toBe("LRA-v2-170Hz-GPIO4-5-R50-C79-D24");
});


it("distinguishes every drive register and pin in the firmware identity", () => {
  const profile = deriveLra(EXAMPLE_LRA).profile!;
  const label = profileLabel(profile, { sda: 4, scl: 5 });
  for (const field of ["ratedVoltage", "clampVoltage", "driveTime"] as const) {
    expect(profileLabel({ ...profile, [field]: profile[field] + 1 }, { sda: 4, scl: 5 })).not.toBe(label);
  }
  expect(profileLabel(profile, { sda: 8, scl: 5 })).not.toBe(label);
  expect(profileLabel(profile, { sda: 4, scl: 9 })).not.toBe(label);
});


it("warns when clamp is above rated RMS but below the rated sinusoidal peak", () => {
  const peak = deriveLra({ ...EXAMPLE_LRA, maxVoltage: 1.5, maxConvention: "peak" });
  const rms = deriveLra({ ...EXAMPLE_LRA, maxVoltage: 1.5 / Math.SQRT2, maxConvention: "rms" });
  expect(peak.warnings).toHaveLength(1);
  expect(rms.warnings).toHaveLength(1);
  expect(peak.profile!.clampVpeak).toBeCloseTo(1.4854);
  expect(peak.warnings[0]).toContain("V peak");
});
