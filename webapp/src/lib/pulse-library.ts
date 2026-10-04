import {
  MAX_MS,
  MAX_POINTS,
  validateSignature,
  type Point,
  type PulseBlock,
} from "./signature";

export const PULSE_LIBRARY_KEY = "lra-studio-pulse-library-v1";
export type PulseTemplate = { durationMs: number; keyframes: Point[] };
export type PulsePreset = PulseTemplate & {
  id: string;
  slot: number;
  name: string;
};
export type BrushKind = number | "pulse" | `preset:${string}`;
export type LibraryRead = {
  presets: PulsePreset[];
  writable: boolean;
  notice: string;
};

export function defaultPulse(): PulseTemplate {
  return {
    durationMs: 320,
    keyframes: [
      { timeMs: 0, amplitudePercent: 0 },
      { timeMs: 80, amplitudePercent: 75 },
      { timeMs: 320, amplitudePercent: 0 },
    ],
  };
}

export function clonePulse(
  template: PulseTemplate,
  id: string,
  startMs: number,
): PulseBlock {
  return {
    id,
    type: "pulse",
    startMs,
    durationMs: template.durationMs,
    keyframes: template.keyframes.map((point) => ({ ...point })),
  };
}

export function validPreset(value: unknown): value is PulsePreset {
  if (!value || typeof value !== "object") return false;
  const p = value as PulsePreset;
  if (
    typeof p.id !== "string" ||
    !p.id.trim() ||
    !Number.isSafeInteger(p.slot) ||
    p.slot < 0 ||
    p.slot > 10000 ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.trim().length > 60 ||
    !Number.isInteger(p.durationMs) ||
    p.durationMs < 40 ||
    p.durationMs > MAX_MS ||
    p.durationMs % 40 ||
    !Array.isArray(p.keyframes) ||
    p.keyframes.length > MAX_POINTS
  )
    return false;
  return (
    validateSignature({
      schemaVersion: 1,
      blocks: [clonePulse(p, "validation", 0)],
    }) === null
  );
}

export function readPulseLibrary(
  storage: Pick<Storage, "getItem">,
): LibraryRead {
  try {
    const raw = storage.getItem(PULSE_LIBRARY_KEY);
    if (raw === null) return { presets: [], writable: true, notice: "" };
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("schemaVersion" in parsed) ||
      parsed.schemaVersion !== 1 ||
      !("presets" in parsed) ||
      !Array.isArray(parsed.presets)
    )
      throw new Error("Unsupported library");
    const presets: PulsePreset[] = [],
      ids = new Set<string>(),
      slots = new Set<number>();
    for (const record of parsed.presets) {
      if (!validPreset(record) || ids.has(record.id) || slots.has(record.slot))
        continue;
      ids.add(record.id);
      slots.add(record.slot);
      presets.push({
        id: record.id,
        slot: record.slot,
        name: record.name.trim(),
        durationMs: record.durationMs,
        keyframes: record.keyframes.map((point) => ({ ...point })),
      });
    }
    return {
      presets,
      writable: true,
      notice:
        presets.length !== parsed.presets.length
          ? "Some saved pulses could not be loaded. Valid pulses are available."
          : "",
    };
  } catch {
    return {
      presets: [],
      writable: false,
      notice: "Saved pulse library could not be read. Existing data was kept.",
    };
  }
}

export function writePulseLibrary(
  storage: Pick<Storage, "getItem" | "setItem">,
  presets: PulsePreset[],
): PulsePreset[] {
  if (!readPulseLibrary(storage).writable)
    throw new Error(
      "Saved pulse library cannot be replaced because it could not be read.",
    );
  const ids = new Set<string>(),
    slots = new Set<number>();
  const next = presets.map((p) => {
    if (!validPreset(p) || ids.has(p.id) || slots.has(p.slot))
      throw new Error("Pulse name, duration, or envelope is invalid.");
    ids.add(p.id);
    slots.add(p.slot);
    return {
      id: p.id,
      slot: p.slot,
      name: p.name.trim(),
      durationMs: p.durationMs,
      keyframes: p.keyframes.map((point) => ({ ...point })),
    };
  });
  storage.setItem(
    PULSE_LIBRARY_KEY,
    JSON.stringify({ schemaVersion: 1, presets: next }),
  );
  return next;
}

export function nextPresetSlot(presets: PulsePreset[]): number {
  const occupied = new Set(presets.map((p) => p.slot));
  let slot = 0;
  while (occupied.has(slot)) slot++;
  return slot;
}

function currentPresets(storage: Pick<Storage, "getItem">): PulsePreset[] {
  const loaded = readPulseLibrary(storage);
  if (!loaded.writable)
    throw new Error(
      "Saved pulse library cannot be changed because it could not be read.",
    );
  return loaded.presets;
}

export function savePulsePreset(
  storage: Pick<Storage, "getItem" | "setItem">,
  preset: PulsePreset,
): PulsePreset[] {
  const current = currentPresets(storage);
  const existing = current.find((p) => p.id === preset.id);
  const slot =
    existing?.slot ??
    (current.some((p) => p.slot === preset.slot)
      ? nextPresetSlot(current)
      : preset.slot);
  return writePulseLibrary(storage, [
    ...current.filter((p) => p.id !== preset.id),
    { ...preset, slot },
  ]);
}

export function removePulsePreset(
  storage: Pick<Storage, "getItem" | "setItem">,
  id: string,
): PulsePreset[] {
  return writePulseLibrary(
    storage,
    currentPresets(storage).filter((p) => p.id !== id),
  );
}
