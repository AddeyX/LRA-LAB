<script lang="ts">
  import EnvelopeEditor from "$lib/components/EnvelopeEditor.svelte";
  import ScrubField from "$lib/components/ScrubField.svelte";
  import {
    EFFECTS,
    MAX_MS,
    blockDuration,
    effectById,
    type Block,
    type PulseBlock,
  } from "$lib/signature";
  import { GRID_MS } from "$lib/timeline";

  let {
    block,
    maxPoints,
    onupdate,
    onremove,
    onmove,
    onduration,
    onsavepulse,
  }: {
    block: Block;
    maxPoints: number;
    onupdate: (block: Block) => void;
    onremove: (id: string) => void;
    onmove: (id: string, direction: -1 | 1) => void;
    onduration: (block: PulseBlock, durationMs: number) => void;
    onsavepulse: (block: PulseBlock) => void;
  } = $props();

  let title = $derived(
    block.type === "effect"
      ? `${effectById(block.effectId)?.name} · ${effectById(block.effectId)?.strength}`
      : "Custom pulse",
  );
</script>

{#snippet nudge()}
  <div class="nudge" role="group" aria-label="Nudge 40 ms">
    <button
      onclick={() => onmove(block.id, -1)}
      disabled={block.startMs <= 0}
      aria-label="Move earlier"
      title="Earlier · 40 ms">←</button
    ><span>{block.startMs} ms</span><button
      onclick={() => onmove(block.id, 1)}
      disabled={block.startMs + blockDuration(block) + GRID_MS > MAX_MS}
      aria-label="Move later"
      title="Later · 40 ms">→</button
    >
  </div>
{/snippet}

<div class="beat-head">
  <h3>{title}</h3>
  {#if block.type === "pulse"}
    {#key block.id}
      <ScrubField
        label="Duration"
        suffix="ms"
        value={block.durationMs}
        defaultValue={320}
        min={GRID_MS}
        max={Math.floor((MAX_MS - block.startMs) / GRID_MS) * GRID_MS}
        step={GRID_MS}
        fineMultiplier={1}
        size="lg"
        accent="var(--color-accent-bright)"
        chipColor="var(--color-surface-raised)"
        showFill={false}
        onChange={(value) => onduration(block as PulseBlock, value)}
      />
    {/key}
    {@render nudge()}
    <button
      class="quiet-button"
      onclick={() => onsavepulse(block as PulseBlock)}>Save to library</button
    >
  {/if}
  <button class="quiet-button danger" onclick={() => onremove(block.id)}
    >Remove</button
  >
</div>
{#if block.type === "effect"}
  <div class="beat-row">
    <label class="variant-field"
      ><span>Variant</span><select
        value={block.effectId}
        onchange={(event) =>
          onupdate({ ...block, effectId: Number(event.currentTarget.value) })}
        >{#each EFFECTS as effect (effect.id)}<option value={effect.id}
            >{effect.name} · {effect.strength}</option
          >{/each}</select
      ></label
    >
    {#key block.id}
      <ScrubField
        label="Duration"
        suffix="ms"
        value={blockDuration(block)}
        defaultValue={blockDuration(block)}
        min={0}
        max={MAX_MS}
        size="lg"
        accent="var(--color-accent-bright)"
        chipColor="var(--color-surface-raised)"
        showFill={false}
        disabled
      />
    {/key}
    {@render nudge()}
  </div>
{:else}
  {#key block.id}
    <EnvelopeEditor
      points={block.keyframes}
      durationMs={block.durationMs}
      {maxPoints}
      onchange={(keyframes) =>
        onupdate({ ...(block as PulseBlock), keyframes })}
    />
  {/key}
{/if}

<style>
  .beat-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .beat-head h3 {
    margin: 0 auto 0 0;
    padding-inline-end: 8px;
    font: 500 28px/1.1 var(--font-sans);
    letter-spacing: -0.02em;
  }
  .beat-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px 16px;
  }
  .variant-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1 1 200px;
    max-width: 320px;
    color: var(--color-muted);
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .variant-field select {
    height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 12px;
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font: 400 15px/1 var(--font-sans);
  }
  .nudge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: var(--color-surface-raised);
  }
  .beat-row .nudge {
    margin-inline-start: auto;
  }
  .nudge span {
    min-width: 64px;
    color: var(--color-muted);
    font-size: 13px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .nudge button {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--color-ink);
    font-size: 16px;
  }
  .nudge button:hover:enabled {
    transform: none;
    background: var(--color-surface);
  }
  .quiet-button {
    padding: 9px 14px;
    border: 0;
    border-radius: 10px;
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font: 400 14px/20px var(--font-sans);
    letter-spacing: 0.02em;
  }
  .quiet-button:hover:enabled {
    transform: none;
    background: var(--color-action);
    color: var(--color-action-ink);
  }
  .quiet-button.danger {
    color: var(--color-danger);
  }
  .quiet-button.danger:hover:enabled {
    background: var(--color-danger-surface);
    color: var(--color-danger);
  }
  @media (max-width: 45rem) {
    .beat-head h3 {
      font-size: 22px;
    }
    .beat-row .nudge {
      margin-inline-start: 0;
    }
  }
</style>
