# LRA Lab web app

The web app is LRA Lab's local signature editor. It gives users a timeline for composing haptic patterns, a direct preview path to connected hardware, and Arduino C++ export. The current editor has one sequential track with a five-second limit.

## Stack and current setup

- SvelteKit and Svelte 5 with TypeScript, built by Vite; `adapter-auto` handles the SvelteKit build.
- `portal-bits` UI components and local CSS, with DM Sans and Space Grotesk variable fonts.
- Browser Web Serial for direct USB connection to matching ESP32-C3 firmware. No app server API or user accounts.
- Browser local storage for the active draft. Data stays in that browser profile; there is no cloud sync or project library.
- Vitest for signature and serial tests, plus `svelte-check` for type and Svelte diagnostics.

The editor currently supports built-in DRV2605L library 6 effects, custom pulses with editable amplitude keyframes, block timing and order controls, calibration status, preview and stop, and C++ export. Effects and pulses share one signature model. Browser validation, firmware validation, and generated C++ follow the same timing and amplitude rules. Blocks cannot overlap; gaps are allowed.

## Run locally

Requires Node.js, pnpm, and desktop Chrome or Edge with Web Serial support.

```sh
cd webapp
pnpm install
pnpm dev
```

Open the local URL printed by Vite (bound to `127.0.0.1`). To feel a signature, first build and upload the matching [`firmware`](../firmware/README.md), connect the board, and select **Calibrate**. Add an effect or pulse, adjust it in **Shape & arrange**, then select **Preview**. **Stop** ends active playback. Close any serial monitor before connecting.

Editor use without a board is possible; hardware preview and calibration require the board. The active valid draft is saved in local storage and restored on reload. Copy C++ from **Take it to firmware** to integrate a signature into another Arduino project. Generated code expects an initialized and calibrated `Adafruit_DRV2605` instance.

## Code map

| Path | Role |
| --- | --- |
| [`src/routes/+page.svelte`](src/routes/+page.svelte) | Editor interface and workflow |
| [`src/lib/signature.ts`](src/lib/signature.ts) | Signature schema, effect catalog, validation, amplitude math |
| [`src/lib/serial.ts`](src/lib/serial.ts) | Web Serial connection and request/response handling |
| [`src/lib/export.ts`](src/lib/export.ts) | Arduino C++ generation |
| [`src/app.css`](src/app.css) | App styles |

The app sends the full signature over 115200 baud USB serial as newline-delimited JSON. Firmware validates and buffers it, then plays locally on `PREVIEW`. Protocol version, effect catalog version, signature limits, and firmware behavior are described in the [firmware README](../firmware/README.md).

## Checks

```sh
pnpm test
pnpm check
pnpm build
```

These checks cover app code and build output. Connected hardware is needed to verify the serial handshake, calibration, actual haptic feel, and playback timing.
