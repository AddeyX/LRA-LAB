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

Open the local URL printed by Vite (bound to `127.0.0.1`). To feel a signature, first build and upload the matching [`firmware`](../firmware/README.md), connect the board, and select **Calibrate**. Choose an effect or custom pulse in **Effect library**, then click a timeline cell to place it. You can also drag an effect from the library onto the grid. Drag a beat to change its start time; drag the right edge of a custom pulse to resize it. New placements, moves, and pulse duration changes snap to **40 ms**. Built-in effects retain their fixed hardware slot lengths, including the 750 ms alert. Existing imported timing stays intact until moved. Adjust feel in the selected beat controls below the timeline, then select **Preview**. **Stop** ends active playback. Close any serial monitor before connecting.

The timeline has 125 cells across five seconds. Scroll horizontally to reach later cells and use **Zoom** to change cell width. With a beat focused, **Left/Right** moves it by 40 ms and **Delete/Backspace** removes it; arrow keys on a pulse resize handle change duration. Overlapping beats and edits past five seconds are rejected without changing the pattern. Pulse resizing scales the amplitude envelope while preserving point order.

Editor use without a board is possible; hardware preview and calibration require the board. The active valid draft is saved in local storage and restored on reload. **File → New** starts a fresh signature and asks whether to save unsaved edits first. **Save** creates or updates a named browser project. **Save As** downloads a portable signature JSON file; **Open** loads a browser project or imports JSON from your computer. Browser projects stay in this browser profile, while JSON files can be moved elsewhere. Opening another project with unsaved edits asks before replacing them.

**File → Generate Code** opens a focused C++ view with Copy and Download `.cpp`. The existing **Take it to firmware** section also shows generated code. Generated code expects an initialized and calibrated `Adafruit_DRV2605` instance.

**Setup** opens a step-by-step guide for hardware, wiring, firmware upload, browser preparation, connection, and calibration. Connect and Calibrate work directly in the guide. **File → Settings** shows the live firmware profile and calibration status when connected, alongside bundled firmware register defaults. The defaults are not live register readbacks, and this release does not change firmware settings.

## Code map

| Path | Role |
| --- | --- |
| [`src/routes/+page.svelte`](src/routes/+page.svelte) | Editor interface and workflow |
| [`src/lib/HapticTimeline.svelte`](src/lib/HapticTimeline.svelte) | Grid, drag/drop, pulse resizing, zoom, and keyboard controls |
| [`src/lib/timeline.ts`](src/lib/timeline.ts) | Grid snapping, atomic edit validation, envelope resizing |
| [`src/lib/signature.ts`](src/lib/signature.ts) | Signature schema, effect catalog, validation, amplitude math |
| [`src/lib/serial.ts`](src/lib/serial.ts) | Web Serial connection and request/response handling |
| [`src/lib/export.ts`](src/lib/export.ts) | Arduino C++ generation |
| [`src/lib/projects.ts`](src/lib/projects.ts) | Browser project storage and JSON import validation |
| [`src/lib/SetupView.svelte`](src/lib/SetupView.svelte) | Interactive device setup guide |
| [`src/app.css`](src/app.css) | App styles |

The app sends the full signature over 115200 baud USB serial as newline-delimited JSON. Firmware validates and buffers it, then plays locally on `PREVIEW`. Protocol version, effect catalog version, signature limits, and firmware behavior are described in the [firmware README](../firmware/README.md).

## Checks

```sh
pnpm test
pnpm check
pnpm build
```

These checks cover app code and build output. Connected hardware is needed to verify the serial handshake, calibration, actual haptic feel, and playback timing.
