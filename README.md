# LRA Lab

LRA Lab is a local workspace for designing haptic signatures and feeling them on an LRA (linear resonant actuator). Its long-term direction is a hands-on editor with the immediacy of a music production tool: compose a pattern, adjust its timing and intensity, and preview it on hardware. The current release is a focused single-track studio backed by ESP32-C3 firmware and a small serial protocol.

## How it fits together

```text
Web app (compose and validate)
    → Web Serial, USB CDC, JSON messages
ESP32-C3 firmware (validate and schedule playback)
    → I²C
DRV2605L haptic driver → LRA
```

The browser sends a complete signature to the board. Firmware stores it in RAM and handles playback timing locally, so a browser scheduling delay does not shape the haptic output. The app can also generate Arduino C++ for using a signature in another firmware project.

| Directory | Purpose | Stack |
| --- | --- | --- |
| [`webapp/`](webapp/README.md) | Signature editor, device connection, live preview, C++ export | SvelteKit, Svelte 5, TypeScript, Vite, Web Serial |
| [`firmware/`](firmware/README.md) | Device protocol, validation, calibration, playback | ESP32-C3, Arduino, PlatformIO, DRV2605L, ArduinoJson |

## Current capabilities

- Compose one sequential track up to five seconds with built-in DRV2605L effects and custom amplitude envelopes.
- Connect through desktop Chrome or Edge, calibrate the LRA, preview a signature, and stop playback.
- Keep the current draft in browser local storage, save named browser projects, import/export signature JSON, and copy or download generated Arduino C++.
- Reject invalid signatures on both sides of the serial connection. Firmware enforces a five-second playback limit.

This setup runs locally. It has no account, cloud storage, or server API. Current hardware profile targets one ESP32-C3, one DRV2605L, and a 170 Hz LRA; see [`firmware/README.md`](firmware/README.md) before connecting an actuator.

## Start

1. Build and upload firmware using the steps in [`firmware/README.md`](firmware/README.md).
2. Start the web app:

   ```sh
   cd webapp
   pnpm install
   pnpm dev
   ```

3. Open the displayed local address in desktop Chrome or Edge. Close any serial monitor, select **Connect board**, then **Calibrate**. Add effects or a custom pulse and select **Preview**.

The app requires a Web Serial capable browser on localhost. See [`webapp/README.md`](webapp/README.md) for editor details, commands, and checks. See [`firmware/README.md`](firmware/README.md) for wiring, board configuration, and protocol details.
