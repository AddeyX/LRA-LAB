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
    class="size-5.5"
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

<style lang="postcss">
  @reference "../app.css";

  .impulse-legend,
  .impulse-grid {
    @apply grid grid-cols-4 gap-1.5;
  }
  .impulse-legend {
    @apply mb-2 text-muted text-size-10 font-semibold text-center;
  }
  .impulse-grid {
    grid-template-rows: repeat(4, var(--spacing-rail));
  }
  .impulse-pad {
    @apply relative isolate overflow-hidden min-w-0;
    padding: calc(var(--spacing) * 1.25) calc(var(--spacing) * 0.5);
    border: calc(var(--spacing) * 0.25) solid var(--color-line);
    @apply rounded-field bg-surface-raised text-ink;
    transition:
      border-color 150ms ease,
      background 150ms ease;
  }
  .impulse-fill {
    @apply absolute;
    inset: auto 0 0;
    height: var(--amplitude);
    z-index: -1;
    background: color-mix(
      in srgb,
      var(--color-accent) 24%,
      var(--color-surface-raised)
    );
    border-top: calc(var(--spacing) * 0.25) solid
      color-mix(in srgb, var(--color-accent-bright) 35%, transparent);
  }
  .impulse-content {
    @apply h-full flex flex-col items-center justify-center gap-0.75;
  }
  .impulse-content svg {
    @apply text-accent-bright flex-none;
  }
  .impulse-content strong {
    @apply text-size-11;
    line-height: 1;
    @apply tabular-nums;
  }
  .impulse-content small {
    @apply text-muted text-size-9;
    line-height: 1;
    @apply whitespace-nowrap;
  }
  .impulse-pad:hover {
    @apply border-accent bg-surface-soft;
  }
  .impulse-pad.selected {
    @apply border-accent-bright;
    box-shadow: var(--shadow-selected);
  }
  .impulse-pad:focus-visible {
    outline: calc(var(--spacing) * 0.5) solid var(--color-accent-bright);
    @apply outline-offset-[var(--outline-width-focus)];
  }
  .impulse-empty {
    border: calc(var(--spacing) * 0.25) dashed var(--color-line);
    @apply rounded-field;
  }
  .impulse-hint {
    margin: calc(var(--spacing) * 2.25) 0 0;
    @apply text-muted text-size-10 text-center;
  }
  @media (prefers-reduced-motion: reduce) {
    .impulse-pad {
      transition: none;
    }
  }
</style>
