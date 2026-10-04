import { describe, expect, it } from "vitest";
import mainSource from "../../../firmware/src/main.cpp?raw";
import platformioSource from "../../../firmware/platformio.ini?raw";
import {
  configureMain,
  configurePlatformio,
  firmwareArchive,
  type FirmwareConfig,
} from "./firmware";
import { EXAMPLE_LRA, deriveLra } from "./lra-profile";
import { crc32 } from "./zip";

const config = (overrides: Partial<FirmwareConfig> = {}): FirmwareConfig => ({
  profile: deriveLra({ ...EXAMPLE_LRA, resonantHz: 235, ratedVrms: 2 , maxVoltage: 3 }).profile!,
  pins: { sda: 8, scl: 9 },
  nativeUsb: true,
  boardId: "esp32-s3-devkitc-1",
  ...overrides,
});

function readZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let index = 0; index < count; index++) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    const crc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const offset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    const start = offset + 30 + view.getUint16(offset + 26, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, new TextDecoder().decode(data));
    cursor += 46 + nameLength;
  }
  return files;
}

describe("configureMain", () => {
  it("replaces every configurable constant and leaves no template values behind", () => {
    const out = configureMain(config());
    expect(out).toContain("constexpr uint8_t SDA_PIN = 8;");
    expect(out).toContain("constexpr uint8_t SCL_PIN = 9;");
    expect(out).toContain("constexpr uint8_t DRIVE_TIME = 0x10;");
    expect(out).toContain('doc["profile"] = "LRA-235Hz-GPIO8-9";');
    expect(out).not.toContain("SDA_PIN = 4;");
    expect(out).not.toContain("RATED_VOLTAGE = 0x32;");
    expect(out).not.toContain("LRA-170Hz");
    expect(out.match(/constexpr uint8_t RATED_VOLTAGE/g)).toHaveLength(1);
  });

  it("keeps the rest of the firmware intact", () => {
    const source = mainSource.split("\n");
    const body = configureMain(config()).split("\n").slice(-source.length);
    const changed = body.filter((line, index) => line !== source[index]);
    expect(changed).toHaveLength(6);
  });

  it("fails loudly when the template no longer has a constant", () => {
    expect(() => configureMain(config(), mainSource.replace(/SDA_PIN = 4;/, ""))).toThrow(/template/);
  });
});

describe("configurePlatformio", () => {
  it("sets the board and keeps dependencies from the repository project", () => {
    const out = configurePlatformio(config());
    expect(out).toContain("[env:lra-lab]");
    expect(out).toContain("board = esp32-s3-devkitc-1");
    expect(out).toContain("adafruit/Adafruit DRV2605 Library @ 1.2.4");
    expect(out).toContain("ARDUINO_USB_CDC_ON_BOOT=1");
  });
  it("drops native USB flags for UART-bridge boards", () => {
    const out = configurePlatformio(config({ nativeUsb: false }));
    expect(out).not.toContain("build_flags");
    expect(out).not.toContain("ARDUINO_USB_MODE");
    expect(out).toContain("lib_ldf_mode = deep+");
    expect(platformioSource).toContain("build_flags");
  });
});

describe("firmwareArchive", () => {
  it("packages an Arduino sketch folder with a matching .ino name", () => {
    const archive = firmwareArchive("arduino", config());
    const files = readZip(archive.bytes);
    expect(archive.filename).toBe("LraLab-arduino.zip");
    expect([...files.keys()]).toEqual(["LraLab/LraLab.ino", "LraLab/main.cpp", "LraLab/README.txt"]);
    expect(files.get("LraLab/main.cpp")).toBe(configureMain(config()));
  });
  it("packages a PlatformIO project", () => {
    const files = readZip(firmwareArchive("platformio", config()).bytes);
    expect([...files.keys()]).toEqual([
      "lra-lab-firmware/platformio.ini",
      "lra-lab-firmware/src/main.cpp",
      "lra-lab-firmware/README.txt",
    ]);
  });
});

it("computes the standard CRC-32 check value", () => {
  expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
});
