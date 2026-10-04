import { DEFAULT_BOARD_ID, type FirmwareRoute } from "./firmware";
import {
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
  downloaded: boolean;
  felt: boolean;
  completed: boolean;
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
  downloaded = $state(false);
  felt = $state(false);
  completed = $state(false);
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
    this.downloaded = saved.downloaded === true;
    this.felt = saved.felt === true;
    this.completed = saved.completed === true;
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
      downloaded: this.downloaded,
      felt: this.felt,
      completed: this.completed,
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
