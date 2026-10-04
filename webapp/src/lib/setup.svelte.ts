import { DEFAULT_BOARD_ID, type FirmwareRoute } from "./firmware";
import {
  deriveLra,
  derivePins,
  emptyLra,
  emptyPins,
  type LraInputs,
  type PinInputs,
} from "./lra-profile";
import type { Signature } from "./signature";

export type SetupMode = "guided" | "docs";

export const BUZZ_SIGNATURE: Signature = {
  schemaVersion: 1,
  blocks: [
    { id: "setup-click-1", type: "effect", startMs: 0, effectId: 1 },
    { id: "setup-click-2", type: "effect", startMs: 200, effectId: 1 },
    {
      id: "setup-swell",
      type: "pulse",
      startMs: 440,
      durationMs: 600,
      keyframes: [
        { timeMs: 0, amplitudePercent: 0 },
        { timeMs: 300, amplitudePercent: 100 },
        { timeMs: 600, amplitudePercent: 0 },
      ],
    },
  ],
};

const KEY = "lra-lab-setup-v1";

export const PARTS = [
  { id: "esp32", label: "ESP32 board", detail: "Any ESP32 with a USB serial connection" },
  { id: "driver", label: "DRV2605L driver", detail: "Breakout board with I²C pins" },
  { id: "lra", label: "LRA and its datasheet", detail: "You need rated voltage and resonant frequency" },
  { id: "cable", label: "USB data cable", detail: "Charge-only cables do not carry serial" },
  { id: "wires", label: "Jumper wires or solder", detail: "Four wires to the driver, two to the LRA" },
  { id: "browser", label: "Desktop Chrome or Edge", detail: "Web Serial is required to connect" },
] as const;

type Saved = {
  parts: string[];
  lra: LraInputs;
  pins: PinInputs;
  route: FirmwareRoute;
  nativeUsb: boolean;
  boardId: string;
  downloadedConfig: string | null;
  feltConfig: string | null;
  completedConfig: string | null;
  preferredMode: SetupMode | null;
  rigOpen: boolean;
};

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export class SetupState {
  parts = $state<string[]>([]);
  lra = $state<LraInputs>(emptyLra());
  pins = $state<PinInputs>(emptyPins());
  route = $state<FirmwareRoute>("arduino");
  nativeUsb = $state(true);
  boardId = $state(DEFAULT_BOARD_ID);
  private downloadedConfig = $state<string | null>(null);
  private feltConfig = $state<string | null>(null);
  private completedConfig = $state<string | null>(null);

  get configKey(): string | null {
    if (!deriveLra(this.lra).profile || !derivePins(this.pins).pins ||
      (this.route === "platformio" && !/^[\w.-]+$/.test(this.boardId.trim()))) return null;
    return JSON.stringify([1, this.lra.ratedVrms, this.lra.maxVoltage,
      this.lra.maxConvention, this.lra.resonantHz, this.pins.sda, this.pins.scl,
      this.route, this.boardId.trim(), this.nativeUsb]);
  }
  get downloaded() {
    return this.configKey !== null && this.downloadedConfig === this.configKey;
  }
  set downloaded(value: boolean) {
    this.downloadedConfig = value ? this.configKey : null;
  }
  get felt() {
    return this.configKey !== null && this.feltConfig === this.configKey;
  }
  set felt(value: boolean) {
    this.feltConfig = value ? this.configKey : null;
  }
  get completed() {
    return this.configKey !== null && this.completedConfig === this.configKey;
  }
  set completed(value: boolean) {
    this.completedConfig = value ? this.configKey : null;
  }
  preferredMode = $state<SetupMode | null>(null);
  rigOpen = $state(true);

  load(storage: Storage) {
    let saved: Partial<Saved>;
    try {
      saved = JSON.parse(storage.getItem(KEY) ?? "{}");
    } catch {
      return;
    }
    if (!saved || typeof saved !== "object") return;
    if (Array.isArray(saved.parts))
      this.parts = saved.parts.filter((id) => PARTS.some((part) => part.id === id));
    if (saved.lra)
      this.lra = {
        ratedVrms: finite(saved.lra.ratedVrms),
        maxVoltage: finite(saved.lra.maxVoltage),
        maxConvention: saved.lra.maxConvention === "rms" ? "rms" : "peak",
        resonantHz: finite(saved.lra.resonantHz),
      };
    if (saved.pins)
      this.pins = { sda: finite(saved.pins.sda), scl: finite(saved.pins.scl) };
    if (saved.route === "arduino" || saved.route === "platformio")
      this.route = saved.route;
    if (typeof saved.nativeUsb === "boolean") this.nativeUsb = saved.nativeUsb;
    if (typeof saved.boardId === "string" && saved.boardId.trim())
      this.boardId = saved.boardId;
    this.downloadedConfig = typeof saved.downloadedConfig === "string" ? saved.downloadedConfig : null;
    this.feltConfig = typeof saved.feltConfig === "string" ? saved.feltConfig : null;
    this.completedConfig = typeof saved.completedConfig === "string" ? saved.completedConfig : null;
    if (saved.preferredMode === "guided" || saved.preferredMode === "docs")
      this.preferredMode = saved.preferredMode;
    if (typeof saved.rigOpen === "boolean") this.rigOpen = saved.rigOpen;
  }

  save(storage: Storage) {
    const saved: Saved = {
      parts: this.parts,
      lra: this.lra,
      pins: this.pins,
      route: this.route,
      nativeUsb: this.nativeUsb,
      boardId: this.boardId,
      downloadedConfig: this.downloadedConfig,
      feltConfig: this.feltConfig,
      completedConfig: this.completedConfig,
      preferredMode: this.preferredMode,
      rigOpen: this.rigOpen,
    };
    try {
      storage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage full or blocked; setup still works for this session */
    }
  }
}
