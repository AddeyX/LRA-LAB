# Pulse Editor and Library Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Track completion below.

**Goal:** Ship the approved pulse editor/library spec and reliable beat keyboard movement.

**Architecture:** Pure envelope and storage helpers support one shared Svelte envelope editor. A library authoring component owns isolated drafts and storage; the page coordinates its inspector and placement brush. Presets become independent schema-v1 pulse blocks.

**Tech Stack:** Svelte 5, TypeScript, Tailwind 4, Vitest, existing Portal Bits. No new runtime dependency.

**Spec:** `webapp/docs/superpowers/specs/2026-10-02-pulse-editor-library-design.md`, approved by user.

## Global Constraints

- Timeline grid remains 40 ms; envelope timing uses 10 ms internally without snapping copy.
- Preserve rounded translucent panels, zero panel shadows/borders, vertical chart guides, current buttons.
- Preserve schema version 1, 32 blocks, 5000 ms sequence limit, 32 pulse keyframes total.
- Storage key: `lra-studio-pulse-library-v1`; writes must succeed before saved state changes.
- Do not silently quantize imported off-grid points or replace unreadable storage.

## Review Focus

- Tiny/off-grid neighbor intervals must preserve node order and permit amplitude edits.
- Pointer cancellation and Escape must restore waveform without persisting preview.
- Dirty library drafts must survive attempted navigation until explicit discard.
- Unsupported storage must remain untouched; quota errors retain editable drafts.
- Preset editing/removal must never change previously placed deep copies.

### Task 1: Envelope and library model

**Files:** Create `src/lib/envelope.ts`, `envelope.test.ts`, `pulse-library.ts`, `pulse-library.test.ts`.
**Interfaces:** `moveNode(points,index,timeMs,amplitudePercent)`, `insertNode(points,maxPoints)`, `removeNode(points,index)`; `PulsePreset`, `PulseTemplate`, `BrushKind`; `readPulseLibrary(storage)`, `writePulseLibrary(storage,presets)`, `clonePulse(template,id,startMs)`, `nextPresetSlot(presets)`.

- [x] Add tests with literal expected point arrays for snapped clamping, endpoints, unavailable snapped times, insertion interpolation, removal and immutability.
- [x] Add storage tests for round trips, invalid records, duplicate IDs/slots, unsupported JSON/schema, access denial, failed writes and independent placement arrays.
- [x] Run `pnpm test -- envelope.test.ts pulse-library.test.ts`; expect missing-module failure before implementations exist.
- [x] Implement bounded immutable edits and strict storage validation. Readers return recovery notice and a writable flag. Writers reject unreadable formats rather than replacing them.
- [x] Run `pnpm test`; expect all tests passing.

```ts
expect(moveNode([{timeMs:0,amplitudePercent:0},{timeMs:80,amplitudePercent:75},{timeMs:320,amplitudePercent:0}],1,97,103)[1]).toEqual({timeMs:100,amplitudePercent:100});
```

### Task 2: Shared UI and keyboard access

**Files:** Create `src/lib/components/EnvelopeEditor.svelte`, `PulsePresetInspector.svelte`; modify `BuiltInImpulses.svelte`, `HapticTimeline.svelte`.
**Interfaces:** Envelope consumes points/duration/maxPoints and emits committed `Point[]`. Inspector consumes preset draft and emits save/cancel. Library tiles consume presets and emit create/edit/remove/select/drag. Timeline consumes typed `BrushKind` and validates drop payload via supplied preset resolver.

- [x] Build inset SVG plot with button nodes, local pointer preview, pointer capture/cancel, keyboard adjustments, selected-node readout and accessible announcements.
- [x] Add point insertion/removal through Task 1 helpers; focus new node and disable actions at bounds.
- [x] Replace empty tiles with plus; fill stable custom slots, grow rows, retain ROM positions, add keyboard-accessible preset action menus.
- [x] Explicitly focus selected beats and scroll only timeline viewport after arrows. Remove horizontal subdivision gradient.
- [x] Run Svelte autofixer on edited/new components and `pnpm check`; expect zero errors/warnings.

### Task 3: Workspace integration and full validation

**Files:** Modify `src/routes/+page.svelte`, `src/app.css`; create `src/lib/components/PulseLibrary.svelte` for library draft/storage coordination.
**Interfaces:** Library exposes guarded actions to open drafts, change brush, and return to beat editing; page places `clonePulse` copies and supplies global point budget.

- [x] Replace numeric envelope rows with shared node editor; remove confirmed subtitle; preserve existing effect inspector and pulse duration/nudge controls.
- [x] Connect plus/edit/save/remove and Save to library with independent draft, name focus, scroll into view, explicit discard confirmation and read/write notices.
- [x] Guard timeline selection/placement and File/Setup navigation while a dirty library draft exists.
- [x] Add vertical-only envelope styling and focused library layout without changing approved panel material.
- [x] Run `pnpm test`, `pnpm check`, `pnpm build`, autofixer and Impeccable detector; expect passing tests/build and zero Svelte diagnostics.
- [x] Browser-check pointer-selected arrows, rejected overlap, node drag/keyboard/cancel, plus/save/reload/edit/remove/copy independence, dirty draft discard, storage rejection, and desktop/mobile layout.
- [x] Review full diff against spec; fix correctness findings, repeat affected checks, leave branch ready for review.

## Validation results

- 39 tests pass across six files; Svelte check reports zero errors/warnings; production build succeeds.
- Svelte autofixer reports no issues. Impeccable detector reports no findings on changed surfaces.
- Desktop and 375 px mobile layouts checked; no page overflow. Approved panel material retained.
- Browser verifies beat focus/arrow movement/rejected overlap, node keyboard/add/remove, preset save/reload/edit/remove, independent placed copies, growing rows, dirty-draft guard, quota failure, unreadable-schema protection and retry.
- Native pointer capture exercised through clicks. Pointer-coordinate preview/commit/cancel exercised with DOM events and a temporary capture shim because collaborative preview has no drag action. Hardware playback was not tested.
- Review findings fixed: retry rechecks storage, preset mutations merge current records by ID and resolve slot collisions, removal restores focus even when an appended row disappears, and legacy Custom pulse drag respects dirty drafts.
- Browser test records removed; original draft, active-project and pulse-library storage restored.
- Implementation completed on `feat/pulse-editor-library`; user authorized committing all changes.
