<script lang="ts">
  import { onMount } from "svelte";
  import EnvelopeEditor from "./EnvelopeEditor.svelte";
  import ScrubField from "./ScrubField.svelte";
  import { resizePulse } from "$lib/timeline";
  import {
    clonePulse,
    validPreset,
    type PulsePreset,
  } from "$lib/pulse-library";

  let {
    draft,
    onchange,
    onsave,
    oncancel,
    error = "",
    editing = false,
  }: {
    draft: PulsePreset;
    onchange: (draft: PulsePreset) => void;
    onsave: () => void;
    oncancel: () => void;
    error?: string;
    editing?: boolean;
  } = $props();
  let nameInput: HTMLInputElement;
  onMount(() => {
    nameInput.focus({ preventScroll: true });
    nameInput.closest(".inspector")?.scrollIntoView({ block: "nearest" });
  });
  function duration(value: number) {
    const resized = resizePulse(clonePulse(draft, draft.id, 0), value);
    onchange({
      ...draft,
      durationMs: resized.durationMs,
      keyframes: resized.keyframes,
    });
  }
</script>

<div class="inspector-top">
  <div>
    <span class="group-label">PULSE LIBRARY</span>
    <h3>{editing ? "Edit saved pulse" : "Create custom pulse"}</h3>
  </div>
</div>
<div class="preset-fields">
  <label for="pulse-preset-name"
    ><span class="group-label">NAME</span>
    <input
      id="pulse-preset-name"
      bind:this={nameInput}
      value={draft.name}
      maxlength="60"
      placeholder="Name your pulse"
      oninput={(event) =>
        onchange({ ...draft, name: event.currentTarget.value })}
    />
  </label>
  <div>
    <span class="group-label">DURATION</span>
    <ScrubField
      label="Duration"
      suffix="ms"
      value={draft.durationMs}
      defaultValue={320}
      min={40}
      max={5000}
      step={40}
      fineMultiplier={1}
      size="lg"
      showFill={false}
      chipColor="var(--color-canvas)"
      onChange={duration}
    />
  </div>
</div>
<EnvelopeEditor
  points={draft.keyframes}
  durationMs={draft.durationMs}
  onchange={(keyframes) => onchange({ ...draft, keyframes })}
/>
{#if error}<p class="preset-error" role="alert">{error}</p>{/if}
<div class="preset-actions">
  <button onclick={oncancel}>Cancel</button>
  <button class="save-preset" onclick={onsave} disabled={!validPreset(draft)}
    >{editing ? "Save pulse" : "Save to library"}</button
  >
</div>

<style lang="postcss">
  @reference "../../app.css";
  .preset-fields {
    @apply grid grid-cols-2 gap-4 mx-6;
  }
  .preset-fields label,
  .preset-fields > div {
    @apply flex flex-col items-start gap-2 min-w-0;
  }
  input {
    @apply w-full min-w-0 rounded-control bg-field text-ink px-3 py-3 text-size-13;
    border: calc(var(--spacing) * 0.25) solid var(--color-field-line);
  }
  .preset-actions {
    @apply flex flex-wrap justify-end gap-2 mx-6 mt-5;
  }
  .preset-actions button {
    @apply rounded-control px-4 py-2.5 text-size-12 bg-transparent text-ink;
    border: calc(var(--spacing) * 0.25) solid var(--color-control-line);
  }
  .preset-actions .save-preset {
    @apply bg-action text-action-ink;
    border-color: transparent;
  }
  .preset-error {
    @apply text-danger text-size-12 mx-6 mt-4;
  }
  @variant max-fields {
    .preset-fields {
      @apply grid-cols-1;
    }
  }
</style>
