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
    nameInput.closest("[data-inspector]")?.scrollIntoView({ block: "nearest" });
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

<div class="preset-head">
  <span class="preset-kind">Library</span>
  <h3>{editing ? "Edit saved pulse" : "New pulse"}</h3>
</div>
<div class="preset-fields">
  <label for="pulse-preset-name"
    ><span class="field-label">Name</span>
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
    <span class="field-label">Duration</span>
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
      chipColor="var(--color-surface-raised)"
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
  .preset-head {
    @apply mb-5;
  }
  .preset-kind {
    @apply inline-flex items-center gap-1.5 text-muted text-size-13;
    letter-spacing: 0.03em;
  }
  .preset-kind::before {
    content: "";
    @apply size-2 bg-butter;
    border-radius: 3px;
  }
  .preset-head h3 {
    margin: calc(var(--spacing) * 1.5) 0 0;
    font: 500 28px/1.1 var(--font-sans);
    letter-spacing: -0.02em;
  }
  .preset-fields {
    @apply grid gap-4;
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .preset-fields label,
  .preset-fields > div {
    @apply flex flex-col items-start gap-1.5 min-w-0;
  }
  .field-label {
    @apply text-muted text-size-13;
    letter-spacing: 0.03em;
  }
  input {
    @apply w-full min-w-0 h-11 bg-field text-ink px-3.5 text-size-15 border-0;
    border-radius: calc(var(--spacing) * 3);
  }
  input::placeholder {
    @apply text-subtle;
  }
  .preset-actions {
    @apply flex flex-wrap justify-end gap-2 mt-5;
  }
  .preset-actions button {
    @apply px-4 py-2.5 text-size-14 bg-surface-raised text-ink border-0;
    border-radius: calc(var(--spacing) * 2.5);
  }
  .preset-actions button:hover:enabled {
    transform: none;
    @apply bg-surface-soft;
  }
  .preset-actions .save-preset {
    @apply bg-action text-action-ink;
  }
  .preset-actions .save-preset:hover:enabled {
    @apply bg-accent text-ink;
  }
  .preset-error {
    @apply text-danger text-size-13 mt-4;
  }
  @variant max-fields {
    .preset-fields {
      @apply grid-cols-1;
    }
  }
</style>
