# Haptic Studio Design

## Goal

Build a local browser studio for composing, previewing, and exporting short LRA
haptic signatures. User connects a flashed ESP32-C3 + DRV2605L board over Web
Serial at 115200 baud, edits a five-second timeline, previews feel on hardware,
then copies generated Arduino C++ into `main.cpp`.

## MVP scope

- SvelteKit app using simple components from portal-bits; run locally on
  `localhost`, with no hosted service or account.
- Desktop Chrome or Edge via Web Serial.
- One horizontal timeline track, total duration at most 5,000 ms.
- Two sequential block types: built-in DRV2605L LRA effects and custom pulse
  envelopes. Blocks do not overlap.
- Built-in effect blocks use named effects and available discrete strength
  variants. Their duration comes from effect metadata and is not editable.
- Pulse blocks have editable duration and amplitude keyframes. Amplitude uses
  0–100% UI values; firmware interpolates values at 10 ms intervals and maps
  them to signed RTP values.
- Preview, stop, calibration action/status, and device connection state.
- Export C++ compatible with project’s Adafruit_DRV2605 dependency and current
  ESP32-C3 firmware setup.
- Save current draft locally in browser storage.

Out of scope: multi-track editing, overlapping playback, cloud storage, firmware
flashing from Studio, arbitrary audio import, ERM support, and continuous live
streaming from browser during playback.

## User experience

Studio has a connection/device bar, effect palette, one timeline, selected-block
controls, preview/stop controls, and generated-code panel. Timeline ruler spans
0–5 seconds. User adds blocks, reorders them, edits pulse keyframes, and previews
the buffered result. The editor rejects additions or length changes that exceed
5 seconds. Effect blocks show fixed duration and discrete strength choices;
pulse blocks expose continuous amplitude and duration controls.

Custom pulse editor starts with two points and supports adding, moving, and
removing keyframes. First keyframe is at pulse start; last is at pulse end.
Keyframe time is integer milliseconds and amplitude is 0–100%. Firmware
interpolates linearly at 10 ms steps. This is an amplitude
envelope; DRV2605L generates and tracks the LRA drive rather than accepting an
arbitrary carrier waveform.

## Signature model

One shared model drives editing, serial preview, and C++ export:

- Signature: schema version and ordered blocks.
- Effect block: timeline start, effect ID, display metadata reference, and fixed
  duration from curated LRA effect catalog. Strength variants are distinct
  effect IDs.
- Pulse block: timeline start, duration, and ordered
  `{timeMs, amplitudePercent}` keyframes, with keyframe time relative to pulse
  start.
- Valid signature: 1–5,000 ms timeline duration, no overlap, silent gaps allowed,
  no more than 32 blocks, no more than 32 pulse keyframes total, pulse duration
  at least 10 ms, first and last keyframes at pulse boundaries, and keyframe
  times strictly increasing.

Effect names, durations, and strength variants are sourced from the TI effect
library tables and kept in one catalog used by UI and export. Effect playback
uses library 6. Firmware runs one block at a time, switching between library
playback and RTP playback at boundaries. Mode changes can produce a small gap;
Studio does not promise phase-continuous transitions.

## Browser, firmware, and data flow

Browser uses SvelteKit in local development mode and `navigator.serial`. User
selects a port through the browser permission prompt. There is no backend. The
browser persists the active draft locally.

Firmware remains responsible for hardware access and timing. Studio sends the
complete bounded signature first; firmware validates and stores it in RAM, then
plays it locally. Pulse RTP updates happen on a 10 ms firmware schedule. This
keeps playback timing independent of browser/USB scheduling. Firmware enforces
a five-second wall-clock playback stop even if Studio disconnects.

The protocol is newline-delimited JSON, version 1, with bounded message size:

- `HELLO` / `READY`: protocol and firmware versions, device readiness, LRA
  profile, calibration state, supported effect catalog version, and limits.
- `LOAD`: complete signature; returns `LOADED` or a validation error.
- `CALIBRATE`: runs DRV2605L LRA auto-calibration; returns result and status.
- `PREVIEW`: plays loaded signature; emits `PLAYING` and `DONE`.
- `STOP`: stops playback immediately and returns `STOPPED`.

Every response includes protocol version and request ID. Firmware rejects
unknown protocol versions, malformed messages, unsupported effect IDs, invalid
keyframes, oversized signatures, and durations above 5,000 ms. Serial loss
during playback cannot extend the hard five-second stop.

## C++ export

Exporter generates a self-contained signature data declaration and playback
function suitable for pasting into `main.cpp`. It uses the Adafruit library API
already in the firmware project. Effect blocks select the LRA effect and invoke
`go()`; pulse blocks switch to real-time playback and write interpolated RTP
values at 10 ms intervals. Export includes only data and helpers needed for
that signature, and notes expected existing driver instance and initialization.
Studio model and firmware preview must use same block order, timing, and
interpolation rules so preview and export agree.

## Failure handling

Show actionable states for permission denied, unsupported browser, no port,
disconnected board, wrong firmware/protocol version, failed calibration,
rejected signature, playback fault, and serial timeout. A rejected load cannot
replace the last valid signature. Stop remains available during playback.
Firmware reports overcurrent, overtemperature, and calibration failure; Studio
does not silently retry a fault.

## Acceptance checks

- Connect to compatible board at 115200, complete handshake, show ready state.
- Load and preview a built-in effect and a custom pulse; Stop ends playback.
- Preview mixed effect/pulse blocks in order within five-second limit.
- Confirm 10 ms pulse interpolation and hard timeout on board.
- Reject malformed, unsupported, and over-five-second signatures with readable
  errors.
- Reload local draft after browser refresh.
- Export a signature, paste into `main.cpp`, and compile with project’s
  PlatformIO environment.
- Confirm generated C++ reproduces same block sequence and pulse envelope.

## Decisions and tradeoffs

- Keyframes keep editing intuitive and compact; firmware interpolates them at a
  fixed 10 ms playback interval.
- Built-in effects retain their ROM-defined duration and feel. Their intensity
  choices are discrete effect variants. Custom pulse blocks use a continuous
  0–100% amplitude envelope.
- Mixed signatures are supported with explicit mode switches; transitions may
  have a short gap.
- JSON lines favor inspectability and straightforward SvelteKit serialization
  over binary efficiency. Five-second signatures are small enough for 115200
  baud and bounded ESP32 memory.
- Preview and copy-paste export share one signature model to reduce behavior
  drift.

## References

- Adafruit library API and examples:
  https://github.com/adafruit/Adafruit_DRV2605_Library
- Adafruit effect sequencing guide:
  https://learn.adafruit.com/adafruit-drv2605-haptic-controller-breakout/arduino-code
- TI DRV2605L datasheet, RTP input, effect library, LRA calibration, and
  playback programming:
  https://www.ti.com/lit/ds/symlink/drv2605l.pdf
- SvelteKit documentation: https://svelte.dev/docs/kit
- Web Serial API: https://developer.mozilla.org/docs/Web/API/Web_Serial_API
