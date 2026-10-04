// Register math follows TI DRV2605L datasheet SLOS854D, section 8.5:
// Equation 5 (closed-loop LRA rated voltage, RMS), Equation 9 (LRA overdrive
// clamp, peak) and the Control1 DRIVE_TIME field (0.1 ms steps from 0.5 ms).
export const DATASHEET_URL = "https://www.ti.com/lit/ds/symlink/drv2605l.pdf";

// Firmware never writes Control2, so SAMPLE_TIME keeps its 300 µs reset value.
const SAMPLE_TIME_S = 300e-6;
const RATED_LSB_V = 20.58e-3;
const CLAMP_LSB_V = 21.22e-3;
const DRIVE_TIME_MAX = 31;
export const MIN_HZ = 140;
export const MAX_HZ = 600;
export const MAX_PIN = 48;

export type VoltageConvention = "peak" | "rms";
export type LraInputs = {
  ratedVrms: number | null;
  maxVoltage: number | null;
  maxConvention: VoltageConvention;
  resonantHz: number | null;
};
export type PinInputs = { sda: number | null; scl: number | null };

export type LraProfile = {
  resonantHz: number;
  ratedVoltage: number;
  clampVoltage: number;
  driveTime: number;
  ratedVrms: number;
  clampVpeak: number;
  driveTimeMs: number;
  halfPeriodMs: number;
};
export type LraField = "ratedVrms" | "maxVoltage" | "resonantHz";
export type LraResult = {
  profile: LraProfile | null;
  errors: Partial<Record<LraField, string>>;
  warnings: string[];
};
export type Pins = { sda: number; scl: number };
export type PinResult = {
  pins: Pins | null;
  errors: Partial<Record<"sda" | "scl", string>>;
};

export const EXAMPLE_LRA: LraInputs = {
  ratedVrms: 1.2,
  maxVoltage: 1.68,
  maxConvention: "peak",
  resonantHz: 170,
};
export const EXAMPLE_PINS: PinInputs = { sda: 4, scl: 5 };

export const emptyLra = (): LraInputs => ({
  ratedVrms: null,
  maxVoltage: null,
  maxConvention: "peak",
  resonantHz: null,
});
export const emptyPins = (): PinInputs => ({ sda: null, scl: null });

export const hex = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;

const positive = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const loopFactor = (hz: number) =>
  Math.sqrt(1 - (4 * SAMPLE_TIME_S + 300e-6) * hz);

// Voltage codes round down so the configured drive never exceeds the rating.
const floorCode = (ratio: number) => Math.floor(ratio + 1e-9);

export function deriveLra(input: LraInputs): LraResult {
  const errors: LraResult["errors"] = {};
  const warnings: string[] = [];
  const { ratedVrms, maxVoltage, maxConvention, resonantHz } = input;

  if (!positive(resonantHz))
    errors.resonantHz = "Enter the nominal resonant frequency.";
  else if (resonantHz < MIN_HZ || resonantHz > MAX_HZ)
    errors.resonantHz = `DRV2605L drive time supports ${MIN_HZ}–${MAX_HZ} Hz.`;
  if (!positive(ratedVrms))
    errors.ratedVrms = "Enter the rated voltage in volts RMS.";
  if (!positive(maxVoltage))
    errors.maxVoltage = "Enter the maximum drive voltage.";
  if (Object.keys(errors).length) return { profile: null, errors, warnings };

  const hz = resonantHz as number;
  const factor = loopFactor(hz);
  const ratedVoltage = floorCode(((ratedVrms as number) * factor) / RATED_LSB_V);
  const maxPeak =
    maxConvention === "rms" ? (maxVoltage as number) * Math.SQRT2 : (maxVoltage as number);
  const clampVoltage = floorCode(maxPeak / CLAMP_LSB_V);
  const halfPeriodMs = 500 / hz;
  const driveTime = Math.min(
    DRIVE_TIME_MAX,
    Math.max(0, Math.round((halfPeriodMs - 0.5) / 0.1)),
  );

  if (ratedVoltage < 1)
    errors.ratedVrms = "Too low for the driver's 20.58 mV steps.";
  else if (ratedVoltage > 255)
    errors.ratedVrms = `Driver maximum at ${hz} Hz is ${((255 * RATED_LSB_V) / factor).toFixed(2)} V RMS.`;
  if (clampVoltage < 1)
    errors.maxVoltage = "Too low for the driver's 21.22 mV steps.";
  else if (clampVoltage > 255)
    errors.maxVoltage = `Driver maximum is ${(255 * CLAMP_LSB_V).toFixed(2)} V peak.`;
  if (Object.keys(errors).length) return { profile: null, errors, warnings };

  const profile: LraProfile = {
    resonantHz: hz,
    ratedVoltage,
    clampVoltage,
    driveTime,
    ratedVrms: (ratedVoltage * RATED_LSB_V) / factor,
    clampVpeak: clampVoltage * CLAMP_LSB_V,
    driveTimeMs: driveTime * 0.1 + 0.5,
    halfPeriodMs,
  };
  if (profile.clampVpeak < profile.ratedVrms)
    warnings.push(
      `The clamp (${profile.clampVpeak.toFixed(2)} V peak) is below the rated voltage (${profile.ratedVrms.toFixed(2)} V RMS). The driver takes the clamp first, so output stays under your rated voltage.`,
    );
  return { profile, errors, warnings };
}

export function derivePins(input: PinInputs): PinResult {
  const errors: PinResult["errors"] = {};
  for (const key of ["sda", "scl"] as const) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value))
      errors[key] = "Enter a GPIO number.";
    else if (!Number.isInteger(value) || value < 0 || value > MAX_PIN)
      errors[key] = `Use a whole GPIO number from 0 to ${MAX_PIN}.`;
  }
  if (!errors.sda && !errors.scl && input.sda === input.scl)
    errors.scl = "SDA and SCL need different pins.";
  return {
    pins:
      errors.sda || errors.scl
        ? null
        : { sda: input.sda as number, scl: input.scl as number },
    errors,
  };
}

export const profileLabel = (profile: LraProfile, pins: Pins) =>
  `LRA-v2-${Math.round(profile.resonantHz)}Hz-GPIO${pins.sda}-${pins.scl}-R${profile.ratedVoltage}-C${profile.clampVoltage}-D${profile.driveTime}`;
