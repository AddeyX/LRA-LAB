# Haptic Studio Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Build local five-second LRA signature editor, serial preview, C++ export, and ESP32-C3 playback firmware.

**Architecture:** Shared TypeScript model validates ordered blocks. SvelteKit editor sends newline JSON through Web Serial. Firmware revalidates bounded payload, schedules ROM effects and RTP locally, and applies hard stop.

**Tech Stack:** SvelteKit, TypeScript, portal-bits, Web Serial, PlatformIO Arduino, Adafruit_DRV2605, ArduinoJson.

**Spec:** `webapp/superpowers/specs/2026-10-01-haptic-studio-design.md`

## Global Constraints

- Timeline max 5,000 ms; 32 blocks; 32 pulse keyframes; minimum pulse 10 ms.
- ESP32-C3 GPIO4 SDA, GPIO5 SCL, 115200 baud, DRV2605 library 6.
- JSON lines protocol version 1; pulse update cadence 10 ms.

## Review Focus

- Invalid persisted draft must not break editor.
- Malformed or oversized serial data must not replace last loaded signature.
- Disconnect during playback must still end within five seconds.
- Mode switch must silence prior effect or RTP block.
- Failed calibration must leave preview unavailable and show fault.

---

### Task 1: Shared signature model and export

**Files:** `webapp/src/lib/signature.ts`, `webapp/src/lib/export.ts`, `webapp/src/lib/signature.test.ts`

**Interfaces:** `Signature`, `Block`, `validateSignature`, `durationOf`, `exportCpp`.

- [x] Write tests for limits, ordering, malformed values, and C++ sequence.
- [x] Implement catalog, validation, interpolation contract, export.
- [x] Run tests and typecheck.

### Task 2: Studio UI and browser connection

**Files:** `webapp/src/routes/+page.svelte`, `webapp/src/routes/+layout.svelte`, `webapp/src/lib/serial.ts`, `webapp/src/app.css`, SvelteKit config.

**Interfaces:** `StudioSerial` connects, sends requests, receives versioned responses; editor edits `Signature`.

- [x] Build editor, timeline, keyframe controls, local storage, feedback, generated code panel.
- [x] Add Web Serial handshake, load, preview, stop, calibration.
- [x] Run Svelte autofixer, typecheck, and production build.

### Task 3: Firmware protocol and playback

**Files:** `hardware/src/main.cpp`, `hardware/platformio.ini`, `hardware/README.md`.

**Interfaces:** JSON lines `HELLO`, `LOAD`, `PREVIEW`, `STOP`, `CALIBRATE`; response `READY`, `LOADED`, `PLAYING`, `DONE`, `STOPPED`, `CALIBRATED`, `ERROR`.

- [x] Parse and validate complete bounded signatures before committing to RAM.
- [x] Schedule ROM and RTP blocks, fault handling, calibration, stop and hard timeout.
- [x] Compile firmware and document flash/connection steps.

### Task 4: Integration verification

**Files:** `webapp/README.md` and any fixes needed in Tasks 1–3.

- [x] Run model tests, Svelte checks/build, PlatformIO build.
- [x] Compare exported signature timing with firmware scheduler and document hardware-only checks.
