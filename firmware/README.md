# LRA Lab firmware

Firmware runs the device side of LRA Lab on an ESP32-C3. It receives complete haptic signatures over USB serial, validates them, calibrates the LRA, and schedules playback through a DRV2605L driver. Playback runs on the board after upload of a signature; the browser does not stream individual samples during preview.

## Stack and hardware profile

- PlatformIO project in [`platformio.ini`](platformio.ini): `esp32-c3-devkitm-1`, Espressif32 platform, Arduino framework.
- Adafruit DRV2605 Library 1.2.4 for the haptic driver; ArduinoJson 7 for protocol messages.
- USB CDC serial at 115200 baud; I²C SDA on GPIO4 and SCL on GPIO5.
- DRV2605L in LRA mode using effect library 6 and a 170 Hz target profile. Built-in effects use ROM playback; custom pulses use real-time playback (RTP) with amplitude updates every 10 ms.

Current firmware writes rated-voltage register `0x32`, clamp-voltage register `0x4F`, and drive-time register `0x18`. **Check these values against your actuator's electrical rating before driving it.** Connect power and ground according to your board and driver requirements.

## Build and upload

Install [PlatformIO](https://platformio.org/) in VSCode and run from this directory:

```sh
cd firmware
pio run
pio run --target upload
```

Select or configure the correct upload port for your board if PlatformIO cannot detect it. Use your installed `pio` path if it is not on `PATH`. Close serial monitors before connecting the web app, since the browser needs the port.

## Protocol

USB CDC carries newline-delimited JSON at 115200 baud. Requests and responses use `protocolVersion: 1` and a matching `requestId`. A signature uses `schemaVersion: 1`. Typical exchange:

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

[`src/main.cpp`](src/main.cpp) contains protocol handling, signature validation, calibration, and the playback loop. Build with `pio run`. Real actuator feel, calibration, USB handshake, and 10 ms timing require testing on connected hardware; compilation alone does not verify them.

See [root README](../README.md) for project overview and [web app README](../webapp/README.md) for the editor workflow.
