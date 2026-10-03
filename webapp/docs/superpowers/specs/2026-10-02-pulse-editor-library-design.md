# Pulse editing and reusable library presets

Status: draft for user review. No feature implementation is authorized by this document alone.

## Intent and constraints

Make the existing sequencer easier to operate with a keyboard, replace numeric envelope entry with direct node manipulation, and let users create reusable custom pulses in the effect library.

Preserve the approved visual identity: rounded outer panels, the header/rail's translucent black surface, no panel borders or shadows, current buttons, typography, and blue palette. Keep the timeline's distinct dark background. Styling changes are limited to the requested editor and library surfaces, including relevant rules in `src/app.css`.

The timeline placement grid remains 40 ms. Envelope node timing uses a separate 10 ms increment internally. Do not add labels, badges, help text, or tooltips advertising the envelope snapping increment. Exact node timing and amplitude may be displayed as values.

## Feedback mapping

| Feedback | Requirement |
| --- | --- |
| 1: `.beat` | Reliable left/right arrow-key movement after selecting a timeline beat. |
| 2: `.grid-cell` | Remove horizontal subdivision lines in the timeline and amplitude envelope; retain vertical time guides. |
| 3: page line 689 | Confirmed: remove only the subtitle `Pattern 01 · single track · 40 ms grid`. |
| 4: amplitude envelope | Replace the per-point numeric form with draggable, keyboard-accessible nodes. |
| 5: `.impulse-empty` | Replace empty tiles with plus buttons; create, save, reload, and reuse custom pulse presets. |

Generated Svelte scope classes are not feature selectors and must not be deleted globally. Retain the sequencer heading and Preview/Stop actions.

## Approach

Use one envelope editor for existing timeline pulses and new library drafts. Keep pulse templates independent from placed timeline blocks. A template becomes a deep-copied `PulseBlock` when placed.

Alternatives considered:

- Creating every preset through a temporary timeline block reuses existing controls but forces users to find free timeline space and alters their sequence while authoring. Not recommended.
- Adding a separate modal pulse editor duplicates the inspector interaction and interrupts the workspace. Not recommended.

The recommended flow uses the existing bottom inspector for either a selected beat or a library draft, with an explicit title and actions appropriate to that mode.

## 1. Keyboard movement

- Clicking or tapping a beat selects it and explicitly focuses its `.beat` button. Pointer drag initiation must not suppress subsequent keyboard access.
- A focused beat moves earlier with ArrowLeft and later with ArrowRight, one 40 ms step per key event. Physical time direction stays left-to-right, including in RTL surroundings.
- Tab navigation also reaches beats. Focus stays on the same beat after a successful move, including when chronological sorting changes its DOM position.
- Prevent page scrolling for handled arrows. Do not capture arrows globally while users edit fields, select options, or manipulate envelope nodes.
- Reject overlap and sequence-bound violations atomically using existing validation; keep the original beat and its focus. Repeated left movement at zero is a no-op. Errors for rejected movement use the existing error surface with accessible announcement.
- Scroll a successfully moved focused beat into the timeline viewport without scrolling the whole page unnecessarily.
- Keep the inspector's Earlier/Later controls, pulse resize keyboard behavior, and Delete/Backspace removal. Escape cancels an active drag.

## 2. Chart cleanup and subtitle

Remove only decorative horizontal subdivisions from `.beat-lane` and the amplitude envelope. Keep their vertical guides, waveforms, active nodes, focus/selection indicators, and necessary axis boundary such as the ruler separator. Do not remove structural separators elsewhere or the amplitude-fill boundary inside effect tiles.

Remove the sequencer subtitle `Pattern 01 · single track · 40 ms grid`. Preserve the heading and playback actions.

## 3. Envelope node editor

### Presentation

Replace `.point-list` time/amplitude input rows with an interactive envelope surface. Horizontal position is time relative to pulse start; vertical position is amplitude from 0 to 100%. Render connected segments and visible nodes with generous transparent hit targets. Inset the plot within its container so endpoint nodes and focus outlines remain visible.

Show the selected node's time and amplitude as a compact readout. Retain Add point and provide Remove point for an interior selected node. Keep the existing pulse-duration ScrubField. No snapping announcement appears in product copy.

### Pointer interaction

- Drag an interior node in both axes. Convert coordinates using the rendered plot bounds, so behavior works at any width and zoom level.
- Round amplitude to an integer percentage and clamp to 0–100%.
- Snap an interior node's time to the nearest 10 ms position. Clamp it to an available snapped position strictly between its neighbors; nodes cannot cross or share timestamps.
- Endpoint times stay at zero and pulse duration. Endpoints move vertically only and cannot be deleted.
- If imported or resized neighbors leave no available snapped time, disable horizontal movement for that node while allowing amplitude changes. Preserve valid existing off-grid timestamps until the user can make a legal timing edit; do not silently quantize an imported pulse.
- Capture the active pointer and suppress touch scrolling only for node manipulation. Show a live waveform preview while dragging. Commit once on pointer release; Escape, pointer cancellation, or lost capture restores the pre-drag value.
- Commit timeline edits through existing signature validation and draft persistence. Local draft edits stay separate until saved to the library.

### Keyboard interaction

Nodes are focusable controls with accessible names and current time/amplitude descriptions. ArrowLeft/ArrowRight adjust interior node time by 10 ms; ArrowUp/ArrowDown adjust amplitude by 1 percentage point. Endpoint horizontal arrows are no-ops. Delete/Backspace removes only interior nodes; Escape cancels a pointer edit. Handled keys do not move timeline beats or scroll the page. Announce committed values without announcing every pointer move.

### Adding points and duration changes

Add point inserts a node into the largest gap containing a legal 10 ms position, near its midpoint, with amplitude interpolated from its surrounding segment. Select and focus the new node. Disable the action when no legal position or keyframe budget remains.

Continue existing duration-resize behavior: scale point times, retain distinct integer timestamps, and pin endpoints. Resizing must not collapse points or invalidate the signature. Newly dragged/added node times use the editor increment; scaling and imports may preserve valid off-grid times.

Respect current limits: 32 blocks, five-second sequence duration, and 32 pulse keyframes across the entire sequence. A standalone template may have at most 32 keyframes; placement can still fail when the sequence's remaining keyframe budget is smaller.

## 4. Custom pulse library

### Create and save

1. Each current empty grid slot becomes a plus button named `Create custom pulse` for assistive technology.
2. Pressing plus opens a new pulse draft in the bottom inspector, retaining the timeline selection for return. The draft uses the current custom pulse default: 320 ms, with nodes at 0 ms/0%, 80 ms/75%, and 320 ms/0%.
3. The inspector presents a name field, duration control, shared node editor, Save to library, and Cancel. Move focus to the name field and bring the inspector into view.
4. Save validates a trimmed name of 1–60 characters and valid pulse data, writes local storage, then fills the chosen slot and selects that preset as the placement brush. No timeline block is inserted automatically.
5. Cancel discards the unsaved library draft and returns to the previous selected-beat inspector. When switching away from a changed library draft, offer Keep editing or Discard so work is not lost silently.

Saving a new draft creates a distinct preset even if its waveform or name matches another. A preset tile uses a waveform thumbnail, its name, and duration, with a small `Custom` marker so a saved pulse is not mistaken for a hardware ROM effect or one of the fixed column categories.

The current five empty positions are filled first. Once all are occupied, append rows of custom slots in the same four-column grid and keep a plus affordance available. Built-in tiles retain their IDs, positions, and behavior.

### Reuse and removal

Selecting a saved tile chooses its pulse template as the placement brush; clicking the timeline or dragging the tile places a deep copy with a new block ID. Placed blocks remain independently editable custom pulses. Their exported data is self-contained and continues to use signature schema version 1.

Provide a compact, keyboard-accessible action menu for each saved preset with Edit and Remove. Editing opens an isolated draft; Save updates that preset in place. Removing a preset frees its slot and resets an active preset brush to the default custom pulse. Editing or removing a preset never modifies already-placed blocks.

Keep the existing Custom pulse action for one-off timeline pulses. Add Save to library to a selected pulse's inspector to save a copy into the next available custom slot, using the same name validation. Hardware built-ins cannot be overwritten or removed.

### Persistence contract

Use a dedicated key, `lra-studio-pulse-library-v1`, separate from saved projects and the recovery draft. Stored envelope:

```ts
type PulseLibrary = {
  schemaVersion: 1;
  presets: {
    id: string;
    slot: number;
    name: string;
    durationMs: number;
    keyframes: { timeMs: number; amplitudePercent: number }[];
  }[];
};
```

Custom `slot` is an ordinal into available custom positions, not a ROM effect ID. Use unique preset IDs and slots. Validate finite integer durations of 40–5000 ms in 40 ms increments, 2–32 strictly ordered integer-time points, pinned endpoints, integer amplitudes in 0–100%, and valid names. A valid off-grid point time is allowed for compatibility with scaled pulses.

Read storage only in the browser. Absent storage starts an empty custom library. Unsupported schema or malformed JSON does not crash the app or trigger an automatic overwrite. In a supported envelope, skip invalid records and retain valid records; duplicate IDs or slots retain the first valid record. Show a concise recovery notice if records were skipped.

Only update the in-memory saved library after a successful storage write. If storage is unavailable or full, preserve the editable draft and display an actionable save error; do not claim it was saved. Existing project and recovery storage remain untouched. Library presets are local to the current browser profile and origin; cross-device sync and a dedicated preset import/export format are outside this scope.

## Responsibilities

- `HapticTimeline.svelte`: beat focus, keyboard movement, viewport visibility, vertical-only timeline guides, typed custom-preset drag payloads.
- New envelope editor component: plot rendering, pointer capture, node focus, accessible keyboard controls, and edit callbacks.
- Pure envelope helpers: timing/amplitude bounds, snapped movement, legal insertion, and cancellation-friendly immutable edits.
- `BuiltInImpulses.svelte` or a focused library component: built-in tiles, custom tiles, plus slots, and preset actions.
- New pulse-library module: types, validation, storage read/write, slot assignment, and template cloning.
- `+page.svelte`: inspector modes, draft lifecycle, placement brush, validated signature commits, and storage notices.
- `app.css` and component styles: vertical-only envelope guides and necessary editor/library layout; preserve approved outer panel material.

No firmware changes or new runtime dependency are required. Presets render into existing pulse blocks before validation, export, or board communication.

## Acceptance and verification

- Pointer-selected and Tab-focused beats move with left/right arrows, retain focus, and reject overlap/end overflow without losing data.
- Arrow keys inside an envelope node or input never move a beat.
- Timeline and envelope have vertical guides and no horizontal subdivisions; waveform and ruler information remain legible.
- Interior node dragging adjusts both axes correctly at desktop/mobile widths; endpoints stay pinned; times remain strictly increasing; amplitude stays within bounds.
- Escape and pointer cancellation restore the original waveform; valid release persists exactly one edit.
- Node keyboard movement, insertion, deletion, tight neighbor intervals, imported off-grid data, and duration scaling maintain valid pulse data.
- Plus creates an editable draft without altering the sequence; Save fills the chosen tile; Cancel returns safely.
- Reload restores saved presets. Editing/removing a preset leaves placed copies unchanged. Placing multiple copies yields distinct IDs and independent point arrays.
- Corrupt/unsupported storage, invalid records, duplicate IDs/slots, denied storage, and quota failure follow the persistence contract.
- Existing project load/save, JSON/C++ export, timeline limits, and board preview behavior remain compatible.
- Run meaningful unit tests for envelope math and library persistence, plus existing tests, Svelte checks/autofixer, and production build. Browser-check desktop/mobile pointer and keyboard flows and saved-library reload.

## Review decisions

The draft proposes direct library authoring in the existing inspector, growth beyond the five initial empty slots, explicit Save, and independent copies on placement. These are design defaults for review, not behavior inferred from existing code.

Item 3 is resolved: the user confirmed subtitle removal. The full spec remains a draft awaiting review before implementation.
