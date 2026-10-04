# Timeline mini-map and playback interactions

Covers V1 scope items 1 and 2 ([v1-scope.md](./v1-scope.md)).

## Mini-map

The mini-map sits below the main timeline and always shows the full 5 s canvas.

| Element | Meaning |
| --- | --- |
| Cyan bar | Built-in effect |
| Yellow bar | Custom pulse |
| Outlined bar | Selected beat |
| Tinted region | Signature length (0 to end of last beat) |
| Outlined window | Part of the timeline currently on screen |
| Vertical line | Playback arm (red after a failure) |

The readout to the right shows the visible range, for example `2.54–4.46 s`. With no beats, the strip reads "Overview of all 5 s · beats appear here".

### Pointer

- Click outside the window: center the timeline on that point.
- Drag the window: scrub the timeline, keeping the grab offset.

### Keyboard

The mini-map is one focusable slider.

| Key | Action |
| --- | --- |
| ← / → | Pan a quarter of the visible range |
| Page Up / Page Down | Pan one visible range |
| Home / End | Jump to start / end |
| ↑ / ↓ | Center the next / previous beat |

### Synchronization

- Scrolling or zooming the main timeline moves the window.
- Mini-map navigation only scrolls the main timeline. It does not move beats, change timing, or change selection.

## Preview

The Sequence card's Preview button chooses its output:

- Board connected and calibrated: plays on hardware.
- Otherwise: plays a browser simulation. No board is needed.

Preview is disabled while the signature is invalid or another preview is running. Hover text explains which mode will run.

### Playback arm

- A shared clock drives the timeline arm, the mini-map arm, the visualizers, and the audio.
- Silent gaps play at their real length.
- The main timeline scrolls smoothly to keep the arm on screen, unless the user is scrubbing the mini-map.
- Board previews start the clock when the board reports `PLAYING` and complete only on `DONE`.

### End states

The arm freezes and is labelled; it never keeps moving after playback ends.

| Cause | Label |
| --- | --- |
| Reached end | Completed |
| Stop button or board `STOPPED` | Stopped · _time_ s |
| Board error, disconnect, or failed start | Failed · _time_ s (red) |

The frozen arm clears on the next signature edit or preview.

## Playback island

The top-center sequence meter grows into a visualizer panel when a preview starts. It overlays the page, so the workspace layout does not resize. It collapses about 1.8 s after playback ends.

| Part | Content |
| --- | --- |
| Header | Status (Simulated preview, Board preview, Loading board, Completed, Stopped, Playback failed), position / total time, mute (simulation only), Stop |
| Motion | A block that swings left and right; displacement follows amplitude, eased so it never jumps. Swing is slowed to 14 Hz for legibility. With reduced motion enabled, the block scales instead of swinging. |
| Audio | Live waveform of the simulated sound, triggered on a rising zero crossing so it holds still |
| Envelope | Full-signature amplitude envelope with its own arm |
| Note | States that output is an approximation, not a measurement |

## Simulation model

- Pulses use their keyframes exactly, linearly interpolated.
- Built-in effects use illustrative shapes scaled by catalog strength (100/60/30 %). They are not measured DRV2605L waveforms.
- Audio is a 170 Hz tone with 2nd and 3rd harmonics so laptop speakers can reproduce it. Gain follows the envelope sampled at 1 ms.
- Board previews mute audio so the actuator is heard; the waveform display still runs.

## Code map

| File | Role |
| --- | --- |
| `src/lib/simulation.ts` | Envelope model and sampling |
| `src/lib/playback.svelte.ts` | Clock, status, audio voice |
| `src/lib/HapticTimeline.svelte` | Mini-map, arm, auto-follow |
| `src/lib/components/header/PlaybackIsland.svelte` | Expanding visualizer panel |
| `src/routes/+page.svelte` | Chooses simulation or board, handles device messages |
