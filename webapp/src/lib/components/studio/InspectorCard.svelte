<script lang="ts">
  import PulsePresetInspector from "$lib/components/PulsePresetInspector.svelte";
  import type { PulsePreset } from "$lib/pulse-library";
  import type { Block, PulseBlock } from "$lib/signature";
  import BeatEditor from "./BeatEditor.svelte";
  import Card from "./Card.svelte";

  let {
    block,
    maxPoints,
    draft,
    draftEditing,
    draftError,
    onupdate,
    onremove,
    onmove,
    onduration,
    onsavepulse,
    ondraftchange,
    ondraftsave,
    ondraftcancel,
  }: {
    block: Block | undefined;
    maxPoints: number;
    draft: PulsePreset | null;
    draftEditing: boolean;
    draftError: string;
    onupdate: (block: Block) => void;
    onremove: (id: string) => void;
    onmove: (id: string, direction: -1 | 1) => void;
    onduration: (block: PulseBlock, durationMs: number) => void;
    onsavepulse: (block: PulseBlock) => void;
    ondraftchange: (draft: PulsePreset) => void;
    ondraftsave: () => void;
    ondraftcancel: () => void;
  } = $props();
</script>

<Card area="inspector" aria-label="Beat" data-inspector compact stack>
  <div class="inspector-body">
    {#if draft}
      {#key draft.id}
        <PulsePresetInspector
          {draft}
          onchange={ondraftchange}
          onsave={ondraftsave}
          oncancel={ondraftcancel}
          error={draftError}
          editing={draftEditing}
        />
      {/key}
    {:else if block}
      <BeatEditor
        {block}
        {maxPoints}
        {onupdate}
        {onremove}
        {onmove}
        {onduration}
        {onsavepulse}
      />
    {:else}
      <div class="beat-empty">
        <svg viewBox="0 0 64 32" aria-hidden="true"
          ><rect x="2" y="9" width="14" height="14" rx="4" /><rect
            x="22"
            y="4"
            width="20"
            height="24"
            rx="5"
          /><rect x="48" y="11" width="14" height="10" rx="3" /></svg
        >
        <strong>Pick a beat</strong>
        <span>Click the grid to place one. Drag to move it.</span>
      </div>
    {/if}
  </div>
</Card>

<style>
  .inspector-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    padding: var(--card-inset, 0);
    overflow-y: auto;
  }
  .beat-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 1;
    min-height: 12rem;
    color: var(--color-muted);
    font-size: 14px;
    text-align: center;
  }
  .beat-empty svg {
    width: 84px;
    height: 42px;
    margin-bottom: 14px;
    fill: var(--color-surface-raised);
  }
  .beat-empty svg rect:nth-child(2) {
    fill: var(--color-accent);
  }
  .beat-empty strong {
    color: var(--color-ink);
    font: 500 20px/1.2 var(--font-sans);
  }
</style>
