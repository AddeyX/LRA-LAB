<script lang="ts">
  import { EFFECTS } from "$lib/signature";

  let {
    selectedId,
    onselect,
    ondragstart,
  }: {
    selectedId: number | "pulse";
    onselect: (id: number) => void;
    ondragstart: (event: DragEvent, id: number) => void;
  } = $props();

  const categories = [
    {
      name: "Strong",
      effects: EFFECTS.filter((effect) => effect.name === "Strong click"),
    },
    {
      name: "Sharp",
      effects: EFFECTS.filter((effect) => effect.name === "Sharp click"),
    },
    {
      name: "Soft",
      effects: EFFECTS.filter((effect) => effect.name === "Soft bump"),
    },
    {
      name: "Alert",
      effects: EFFECTS.filter(
        (effect) => effect.name.includes("alert") || effect.name === "Alert",
      ),
    },
  ];
  const slots = Array.from({ length: 16 }, (_, index) => ({
    index,
    category: index % 4,
    effect: categories[index % 4].effects[Math.floor(index / 4)],
  }));
</script>

{#snippet symbol(category: number)}
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if category === 0}
      <path d="m12 3 9 9-9 9-9-9Z" />
      <path d="m12 8 4 4-4 4-4-4Z" fill="currentColor" stroke="none" />
    {:else if category === 1}
      <path d="m14 2-9 12h6l-1 8 9-12h-6Z" />
    {:else if category === 2}
      <path d="M3 15c3 0 3-6 6-6s3 6 6 6 3-6 6-6" />
    {:else}
      <path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Z" />
      <path d="M10 20h4M12 2v2" />
    {/if}
  </svg>
{/snippet}

<div class="impulse-legend" aria-hidden="true">
  {#each categories as category (category.name)}
    <span>{category.name}</span>
  {/each}
</div>
<div class="impulse-grid" role="group" aria-label="Built-in impulses">
  {#each slots as slot (slot.index)}
    {@const effect = slot.effect}
    {#if effect}
      <button
        type="button"
        class="impulse-pad"
        class:selected={selectedId === effect.id}
        style:--amplitude={effect.strength}
        aria-label={`${effect.name}, ${effect.strength} amplitude, ${effect.durationMs} milliseconds`}
        aria-pressed={selectedId === effect.id}
        title={`${effect.name} · ${effect.strength} amplitude · ${effect.durationMs} ms`}
        onclick={() => onselect(effect.id)}
        draggable="true"
        ondragstart={(event) => ondragstart(event, effect.id)}
      >
        <span class="impulse-fill" aria-hidden="true"></span>
        <span class="impulse-content">
          {@render symbol(slot.category)}
          <strong>{effect.strength}</strong>
          <small>{effect.durationMs} ms</small>
        </span>
      </button>
    {:else}
      <span class="impulse-empty" aria-hidden="true"></span>
    {/if}
  {/each}
</div>
<p class="impulse-hint">Fill shows amplitude</p>

<style>
  .impulse-legend,
  .impulse-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .impulse-legend {
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 600;
    text-align: center;
  }
  .impulse-grid {
    grid-template-rows: repeat(4, 70px);
  }
  .impulse-pad {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    min-width: 0;
    padding: 5px 2px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface-raised);
    color: var(--text);
    transition:
      border-color 150ms ease,
      background 150ms ease;
  }
  .impulse-fill {
    position: absolute;
    inset: auto 0 0;
    height: var(--amplitude);
    z-index: -1;
    background: color-mix(in srgb, var(--violet) 24%, var(--surface-raised));
    border-top: 1px solid
      color-mix(in srgb, var(--violet-bright) 35%, transparent);
  }
  .impulse-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }
  .impulse-content svg {
    color: var(--violet-bright);
    flex: none;
  }
  .impulse-content strong {
    font-size: 11px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .impulse-content small {
    color: var(--muted);
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
  }
  .impulse-pad:hover {
    border-color: var(--violet);
    background: var(--surface-soft);
  }
  .impulse-pad.selected {
    border-color: var(--violet-bright);
    box-shadow: inset 0 0 0 1px var(--violet-bright);
  }
  .impulse-pad:focus-visible {
    outline: 2px solid var(--violet-bright);
    outline-offset: 2px;
  }
  .impulse-empty {
    border: 1px dashed var(--line);
    border-radius: 8px;
  }
  .impulse-hint {
    margin: 9px 0 0;
    color: var(--muted);
    font-size: 10px;
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) {
    .impulse-pad {
      transition: none;
    }
  }
</style>
