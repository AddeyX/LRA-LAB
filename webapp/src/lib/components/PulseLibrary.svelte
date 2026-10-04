<script lang="ts">
  import { onMount } from "svelte";
  import StudioDialog from "./studio/dialogs/StudioDialog.svelte";
  import BuiltInImpulses from "$lib/BuiltInImpulses.svelte";
  import {
    defaultPulse,
    nextPresetSlot,
    readPulseLibrary,
    savePulsePreset,
    removePulsePreset,
    type BrushKind,
    type PulsePreset,
    type PulseTemplate,
  } from "$lib/pulse-library";

  let {
    draft = $bindable<PulsePreset | null>(null),
    presets = $bindable<PulsePreset[]>([]),
    selectedId,
    onselect,
    ondragstart,
    onnotice,
  }: {
    draft?: PulsePreset | null;
    presets?: PulsePreset[];
    selectedId: BrushKind;
    onselect: (kind: BrushKind) => void;
    ondragstart: (event: DragEvent, kind: BrushKind) => void;
    onnotice: (notice: string) => void;
  } = $props();
  let initial = "";
  let failure = $state("");
  let discardDialog = $state(false);
  let pending: (() => void) | null = null;
  function report(message: string) {
    onnotice(message);
  }

  onMount(() => {
    try {
      const loaded = readPulseLibrary(localStorage);
      presets = loaded.presets;
      if (loaded.notice) report(loaded.notice);
    } catch {
      report("Saved pulse library could not be read. Existing data was kept.");
    }
  });

  export function leave(action: () => void) {
    if (draft && JSON.stringify(draft) !== initial) {
      pending = action;
      discardDialog = true;
      return false;
    }
    draft = null;
    failure = "";
    action();
    return true;
  }
  function open(next: PulsePreset) {
    leave(() => {
      draft = next;
      initial = JSON.stringify(next);
      failure = "";
    });
  }
  export function create(
    slot = nextPresetSlot(presets),
    template: PulseTemplate = defaultPulse(),
  ) {
    open({
      id: crypto.randomUUID(),
      slot,
      name: "",
      durationMs: template.durationMs,
      keyframes: template.keyframes.map((p) => ({ ...p })),
    });
  }
  function edit(preset: PulsePreset) {
    open({ ...preset, keyframes: preset.keyframes.map((p) => ({ ...p })) });
  }
  export function save() {
    if (!draft) return;
    try {
      const saved = { ...draft, name: draft.name.trim() };
      const next = savePulsePreset(localStorage, saved);
      presets = next;
      draft = null;
      failure = "";
      onselect(`preset:${saved.id}`);
      report(`Saved “${saved.name}” to your pulse library.`);
    } catch {
      failure =
        "Could not save pulse in this browser. Your edits are still here; try again when storage is available.";
    }
  }
  export function cancel() {
    draft = null;
    failure = "";
  }
  export function errorMessage() {
    return failure;
  }
  function remove(id: string, oncomplete: () => void) {
    leave(() => {
      try {
        presets = removePulsePreset(localStorage, id);
        if (selectedId === `preset:${id}`) onselect("pulse");
        report("Pulse removed from library. Placed beats are unchanged.");
      } catch {
        report(
          "Could not remove saved pulse. Try again when storage is available.",
        );
      } finally {
        oncomplete();
      }
    });
  }
  function select(kind: BrushKind) {
    leave(() => onselect(kind));
  }
  function drag(event: DragEvent, kind: BrushKind) {
    if (draft && JSON.stringify(draft) !== initial) {
      event.preventDefault();
      leave(() => onselect(kind));
      return;
    }
    cancel();
    ondragstart(event, kind);
  }
</script>

<BuiltInImpulses
  {presets}
  {selectedId}
  onselect={select}
  ondragstart={drag}
  oncreate={create}
  onedit={edit}
  onremove={remove}
/>
<StudioDialog
  open={discardDialog}
  onclose={() => (discardDialog = false)}
  title="Discard pulse edits?"
  description="This pulse has changes that have not been saved to your library."
>
  <div class="studio-dialog-body">
    <div class="dialog-actions">
      <button
        onclick={() => {
          discardDialog = false;
          pending = null;
        }}>Keep editing</button
      >
      <button
        class="dialog-danger"
        onclick={() => {
          const action = pending;
          pending = null;
          discardDialog = false;
          cancel();
          action?.();
        }}>Discard</button
      >
    </div>
  </div>
</StudioDialog>
