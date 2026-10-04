# LRA Lab firmware

Firmware runs the device side of LRA Lab on your ESP32 board. The repository includes an ESP32-C3 example configuration; select your own board in your upload tool. It receives complete haptic signatures over USB serial, validates them, calibrates the LRA, and schedules playback through a DRV2605L driver. Playback runs on the board after upload of a signature; the browser does not stream individual samples during preview.

## Dependencies and example hardware profile

- PlatformIO project in [`platformio.ini`](platformio.ini): `esp32-c3-devkitm-1`, Espressif32 platform, Arduino framework.
- Adafruit DRV2605 Library 1.2.4 for the haptic driver; ArduinoJson 7 for protocol messages.
- Serial at 115200 baud over the board’s native USB connection or a USB-to-UART adapter; the example uses I²C SDA on GPIO4 and SCL on GPIO5.
- DRV2605L in LRA mode using effect library 6 and a 170 Hz target profile. Built-in effects use ROM playback; custom pulses use real-time playback (RTP) with amplitude updates every 10 ms.

Current firmware writes rated-voltage register `0x32`, clamp-voltage register `0x4F`, and drive-time register `0x18`. **Check these values against your actuator's electrical rating before driving it.** Connect power and ground according to your board and driver requirements.

## Configure your board and actuator

Choose your ESP32 in the toolchain, not in the web app. Use the board manufacturer's pinout to choose output-capable I²C pins. Avoid pins reserved for flash, PSRAM, boot straps, or your serial connection. Set `SDA_PIN` and `SCL_PIN` near the top of `src/main.cpp` to match wiring. Connect common ground, the LRA to the DRV2605L outputs, and power according to the board and driver documentation.

`RATED_VOLTAGE`, `CLAMP_VOLTAGE`, and `DRIVE_TIME` in that same file are raw DRV2605L register bytes, not volts or hertz. The included values are an example profile (1.2 V RMS rated, 1.68 V peak maximum, 170 Hz), not validated settings for an arbitrary LRA. The LRA Lab setup guide calculates these values from your actuator's datasheet and downloads this `main.cpp` with your pins, registers, and `READY` profile label filled in. If you edit by hand, also update the `profile` label. Configuration does not replace physical calibration.

### Register calculation

The setup guide uses the [DRV2605L datasheet](https://www.ti.com/lit/ds/symlink/drv2605l.pdf) (SLOS854D, section 8.5):

- `RATED_VOLTAGE = floor(V_rated_RMS × √(1 − (4 × t_SAMPLE + 300 µs) × f_LRA) / 20.58 mV)` (equation 5). Firmware leaves `SAMPLE_TIME` at its 300 µs reset value.
- `CLAMP_VOLTAGE = floor(V_max_peak / 21.22 mV)` (equation 9). A maximum given in volts RMS is converted with ×√2 first.
- `DRIVE_TIME = round((500 / f_LRA − 0.5 ms) / 0.1 ms)`, which is about half the LRA period (Control1 register).

Voltage codes round down so the configured drive never exceeds the entered ratings. Supported input: 140–600 Hz resonance and register codes 1–255 (up to 5.41 V peak clamp). The driver output cannot exceed its supply voltage.

## Arduino IDE route

1. Install Arduino IDE and the **esp32 by Espressif Systems** board package in Boards Manager, following [Espressif's installation guide](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html). Use Arduino ESP32 core 2.0.17 to match the current PlatformIO example; other core versions need build verification.
2. In Library Manager, install **Adafruit DRV2605 Library 1.2.4**, including its **Adafruit BusIO** dependency, and **ArduinoJson 7.4.x**. ArduinoJson 6 is incompatible with this source's `JsonDocument` API.
3. Download the configured Arduino sketch from the LRA Lab setup guide (`LraLab/LraLab.ino` plus `main.cpp`), or obtain this repository's `firmware/src/main.cpp`. To assemble it by hand, create/save a sketch as `LraLab/LraLab.ino`, leave the `.ino` empty, and copy `main.cpp` into the same `LraLab/` directory. Reopen the sketch so the C++ source appears as a tab. `main.cpp` supplies `setup()` and `loop()`; do not duplicate them in the `.ino`. No PlatformIO files are needed.
4. Set the pins and actuator register values in `main.cpp` as described above. Under **Tools → Board**, choose your ESP32 model; under **Tools → Port**, choose its upload connection. Apply USB CDC, USB mode, flash, and upload options only when required by that board. Native USB boards must expose the firmware's `Serial` connection; USB-to-UART boards use their UART bridge.
5. Check wiring and power, then click **Verify** and **Upload**. Close Serial Monitor afterward. Open LRA Lab, connect to the firmware's serial port, calibrate, and preview. Successful upload does not mean calibration has passed.

## PlatformIO route (VS Code)

Install [PlatformIO](https://platformio.org/) in VS Code. Either download the configured PlatformIO project from the LRA Lab setup guide (board ID, native-USB flags, and `main.cpp` filled in), or open the repository's `firmware/` directory as the project. Source stays in `src/main.cpp`. In `platformio.ini`, set `board` to your board's [PlatformIO board ID](https://docs.platformio.org/en/latest/boards/index.html) and rename the environment if desired. Keep `framework = arduino`, `monitor_speed = 115200`, dependencies, and `lib_ldf_mode = deep+`. The current dependency set is Adafruit DRV2605 1.2.4 and ArduinoJson 7.4.x; PlatformIO resolves Adafruit BusIO transitively. The included `ARDUINO_USB_CDC_ON_BOOT` and `ARDUINO_USB_MODE` flags belong to the example: remove or adjust them for your selected board and serial connection.

Configure pins and actuator values in `src/main.cpp`, set `upload_port` if automatic detection fails, then run from the `firmware/` directory:

```sh
cd firmware
pio run
pio run --target upload
```

Use your installed `pio` path if it is not on `PATH`. Close serial monitors after upload, then connect through LRA Lab, calibrate, and preview. Other ESP32 boards and the Arduino IDE route need build and physical hardware verification; this guide does not claim they have been tested.

## Protocol

The board’s serial connection carries newline-delimited JSON at 115200 baud. Requests and responses use `protocolVersion: 1` and a matching `requestId`. A signature uses `schemaVersion: 1`. Typical exchange:

```json
{"protocolVersion":1,"requestId":1,"type":"HELLO"}
{"protocolVersion":1,"requestId":2,"type":"CALIBRATE"}
{"protocolVersion":1,"requestId":3,"type":"LOAD","signature":{"schemaVersion":1,"blocks":[{"id":"click","type":"effect","startMs":0,"effectId":1}]}}
{"protocolVersion":1,"requestId":4,"type":"PREVIEW"}
```

Each JSON object is one serial line, not a single combined JSON document. `HELLO` returns `READY` with firmware and catalog versions, readiness, calibration status, hardware profile, and limits. `CALIBRATE` returns `CALIBRATED` or `ERROR`. `LOAD` validates an entire signature before replacing the one stored in RAM, then returns `LOADED`. `PREVIEW` requires a loaded signature and successful calibration; it returns `PLAYING` and later emits `DONE`. `STOP` returns `STOPPED`. Errors include `code` and `message`.

Signatures contain ordered, non-overlapping blocks. Effect blocks specify an `effectId` from the app's catalog. Pulse blocks specify `durationMs` and ordered `{timeMs, amplitudePercent}` keyframes, with first and last points at pulse boundaries. Silent gaps are allowed. Current limits: 5,000 ms total duration, 32 blocks, 32 pulse keyframes across all blocks, and 8,192 bytes per request line. Firmware stops playback by the signature end or the five-second wall-clock limit, including after a USB disconnect.

Firmware checks DRV2605L overcurrent and overtemperature status during playback and reports faults. Built-in effect slots have fixed durations; the shorter click and bump slots are conservative timing estimates, while actual ROM response depends on the actuator.

## Code and verification

See [playback duration and storage calculations](docs/duration-and-storage.md) for potential duration extensions, generated C++ flash estimates, and the storage cost of 60 seconds of independent 10 ms amplitude samples. These calculations do not change the current five-second limit.

[`src/main.cpp`](src/main.cpp) contains protocol handling, signature validation, calibration, and the playback loop. Build with `pio run`. Real actuator feel, calibration, USB handshake, and 10 ms timing require testing on connected hardware; compilation alone does not verify them.

See [root README](../README.md) for project overview and [web app README](../webapp/README.md) for the editor workflow.
