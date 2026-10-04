import mainSource from "../../../firmware/src/main.cpp?raw";
import platformioSource from "../../../firmware/platformio.ini?raw";
import { hex, profileLabel, type LraProfile, type Pins } from "./lra-profile";
import { zip } from "./zip";

export type FirmwareRoute = "arduino" | "platformio";
export type FirmwareConfig = {
  profile: LraProfile;
  pins: Pins;
  nativeUsb: boolean;
  boardId: string;
};

export const SKETCH_NAME = "LraLab";
export const PIO_FOLDER = "lra-lab-firmware";
export const DEFAULT_BOARD_ID = "esp32-c3-devkitm-1";

function replaceOnce(source: string, pattern: RegExp, value: string) {
  const matches = source.match(new RegExp(pattern.source, `${pattern.flags}g`));
  if (matches?.length !== 1)
    throw new Error(
      `Firmware template changed: expected one match for ${pattern.source}.`,
    );
  return source.replace(pattern, value);
}

export const configLines = ({ profile, pins }: FirmwareConfig) => [
  `constexpr uint8_t SDA_PIN = ${pins.sda};`,
  `constexpr uint8_t SCL_PIN = ${pins.scl};`,
  `constexpr uint8_t RATED_VOLTAGE = ${hex(profile.ratedVoltage)};`,
  `constexpr uint8_t CLAMP_VOLTAGE = ${hex(profile.clampVoltage)};`,
  `constexpr uint8_t DRIVE_TIME = ${hex(profile.driveTime)};`,
];

export function configureMain(
  config: FirmwareConfig,
  source: string = mainSource,
): string {
  const { profile, pins } = config;
  const [sda, scl, rated, clamp, drive] = configLines(config);
  let out = source;
  out = replaceOnce(out, /constexpr uint8_t SDA_PIN = [^;]+;/, sda);
  out = replaceOnce(out, /constexpr uint8_t SCL_PIN = [^;]+;/, scl);
  out = replaceOnce(out, /constexpr uint8_t RATED_VOLTAGE = [^;]+;/, rated);
  out = replaceOnce(out, /constexpr uint8_t CLAMP_VOLTAGE = [^;]+;/, clamp);
  out = replaceOnce(out, /constexpr uint8_t DRIVE_TIME = [^;]+;/, drive);
  out = replaceOnce(
    out,
    /doc\["profile"\] = "[^"]*";/,
    `doc["profile"] = "${profileLabel(profile, pins)}";`,
  );
  const header = [
    "// LRA Lab firmware, configured by the LRA Lab setup guide.",
    `// Actuator: ${profile.resonantHz} Hz resonance.`,
    `// RATED_VOLTAGE ${hex(profile.ratedVoltage)} = ${profile.ratedVrms.toFixed(2)} V RMS closed loop (DRV2605L eq. 5).`,
    `// CLAMP_VOLTAGE ${hex(profile.clampVoltage)} = ${profile.clampVpeak.toFixed(2)} V peak (DRV2605L eq. 9).`,
    `// DRIVE_TIME ${hex(profile.driveTime)} = ${profile.driveTimeMs.toFixed(1)} ms, about half the ${(profile.halfPeriodMs * 2).toFixed(2)} ms period.`,
    `// I2C: SDA GPIO${pins.sda}, SCL GPIO${pins.scl}.`,
    "// Configuration is not calibration. Calibrate in LRA Lab after upload.",
    "",
  ].join("\n");
  return header + out;
}

export function configurePlatformio(
  config: FirmwareConfig,
  source: string = platformioSource,
): string {
  let out = replaceOnce(source, /^\[env:[^\]]+\]$/m, "[env:lra-lab]");
  out = replaceOnce(out, /^board = .*$/m, `board = ${config.boardId.trim()}`);
  if (!config.nativeUsb)
    out = replaceOnce(out, /^build_flags\s*=.*(?:\n[ \t]+.*)*\n?/m, "");
  return out;
}

const SKETCH_INO = `// LRA Lab sketch. setup() and loop() live in main.cpp beside this file.
// Arduino IDE compiles every .cpp file in the sketch folder, so keep this empty.
`;

function readme(route: FirmwareRoute, config: FirmwareConfig) {
  const common = [
    "Libraries: Adafruit DRV2605 Library 1.2.4 (with Adafruit BusIO) and ArduinoJson 7.4.x.",
    `Configured for ${profileLabel(config.profile, config.pins)}.`,
    "After upload, close any serial monitor, connect in LRA Lab, then calibrate.",
  ];
  const steps =
    route === "arduino"
      ? [
          "Arduino IDE",
          "1. Install the esp32 by Espressif Systems board package.",
          "2. Install the libraries listed below in Library Manager.",
          `3. Open ${SKETCH_NAME}/${SKETCH_NAME}.ino. main.cpp opens as a second tab.`,
          "4. Select your board and port in Tools.",
          config.nativeUsb
            ? "5. Set Tools > USB CDC On Boot to Enabled, then upload."
            : "5. Upload.",
        ]
      : [
          "PlatformIO",
          `1. Open ${PIO_FOLDER}/ in VS Code with PlatformIO installed.`,
          "2. Check board in platformio.ini matches your board ID.",
          "3. Run: pio run --target upload",
        ];
  return [...steps, "", ...common, ""].join("\n");
}

export function firmwareArchive(route: FirmwareRoute, config: FirmwareConfig) {
  const main = configureMain(config);
  if (route === "arduino")
    return {
      filename: `${SKETCH_NAME}-arduino.zip`,
      bytes: zip([
        { path: `${SKETCH_NAME}/${SKETCH_NAME}.ino`, content: SKETCH_INO },
        { path: `${SKETCH_NAME}/main.cpp`, content: main },
        { path: `${SKETCH_NAME}/README.txt`, content: readme(route, config) },
      ]),
    };
  return {
    filename: `${PIO_FOLDER}.zip`,
    bytes: zip([
      { path: `${PIO_FOLDER}/platformio.ini`, content: configurePlatformio(config) },
      { path: `${PIO_FOLDER}/src/main.cpp`, content: main },
      { path: `${PIO_FOLDER}/README.txt`, content: readme(route, config) },
    ]),
  };
}
