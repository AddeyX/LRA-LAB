# Haptic Studio

Local editor for ESP32-C3 + DRV2605L + LRA. Compose one five-second track, preview on hardware, and copy Arduino C++ export.

## Start

```sh
cd webapp
pnpm install
pnpm dev
```

Open displayed `http://127.0.0.1` URL in desktop Chrome or Edge. Web Serial needs localhost and a supported browser. Draft saves in browser local storage. No account or server API.

## Firmware

```sh
cd hardware
~/.platformio/penv/bin/pio run
~/.platformio/penv/bin/pio run --target upload
```

Use your own `pio` path if PlatformIO installed elsewhere. Wire DRV2605L SDA to ESP32-C3 GPIO4, SCL to GPIO5, and power/ground per board requirements. Firmware assumes 170 Hz LRA, rated voltage register `0x32`, clamp `0x4F`; verify values against your actuator before driving it. In Studio: Connect board, Calibrate, add blocks, Preview. Close any serial monitor before connecting Studio.

## Protocol

115200 baud; newline-delimited JSON, protocol version 1. Example:

```json
{"protocolVersion":1,"requestId":1,"type":"HELLO"}
{"protocolVersion":1,"requestId":2,"type":"LOAD","signature":{"schemaVersion":1,"blocks":[{"id":"click","type":"effect","startMs":0,"effectId":1}]}}
{"protocolVersion":1,"requestId":3,"type":"PREVIEW"}
```

Responses include same request ID. `READY` includes readiness, calibration, profile, catalog version, and limits. `LOAD` stores valid signatures only. `PREVIEW` emits `PLAYING`, then `DONE`; `STOP` emits `STOPPED`. `CALIBRATE` emits `CALIBRATED` or `ERROR`. Firmware caps JSON line at 8192 bytes, duration at 5000 ms, blocks at 32, total pulse keyframes at 32, and enforces local wall-clock stop. Preview requires successful calibration.

Effect names and IDs come from [TI DRV2605L datasheet](https://www.ti.com/lit/ds/symlink/drv2605l.pdf), library 6. TI explicitly specifies 750 ms and 1000 ms alert IDs. Other click/bump slot lengths are conservative UI allocations estimated from TI LRA response plots; exact ROM completion depends on actuator. Firmware stops each slot at its boundary.

## Checks

```sh
cd webapp
pnpm test
pnpm check
pnpm build
cd ../hardware
~/.platformio/penv/bin/pio run
```

Board feel, calibration, serial handshake, and actual 10 ms RTP timing require connected hardware; compilation alone cannot confirm those.
