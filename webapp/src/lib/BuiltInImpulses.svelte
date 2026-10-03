<script lang="ts">
  import { tick } from "svelte";
  import { EFFECTS } from "$lib/signature";
  import type { BrushKind, PulsePreset } from "$lib/pulse-library";

  let {
    selectedId,
    onselect,
    ondragstart,
    presets = [],
    oncreate,
    onedit,
    onremove,
  }: {
    selectedId: BrushKind;
    onselect: (id: BrushKind) => void;
    ondragstart: (event: DragEvent, id: BrushKind) => void;
    presets?: PulsePreset[];
    oncreate: (slot: number) => void;
    onedit: (preset: PulsePreset) => void;
    onremove: (id: string, oncomplete: () => void) => void;
  } = $props();
  let menuId = $state<string | null>(null);
  let grid: HTMLDivElement;
  function removePreset(preset: PulsePreset) {
    menuId = null;
    onremove(preset.id, async () => {
      await tick();
      const target =
        grid.querySelector<HTMLButtonElement>(`[data-slot="${preset.slot}"]`) ??
        grid.querySelector<HTMLButtonElement>(".impulse-empty");
      target?.focus({ preventScroll: true });
    });
  }
  function closeMenu(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    const menu = (event.currentTarget as HTMLElement).closest(".preset-menu");
    menuId = null;
    menu?.querySelector<HTMLButtonElement>(".preset-trigger")?.focus();
  }

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
  let slots = $derived.by(() => {
    const highest = Math.max(-1, ...presets.map((p) => p.slot));
    const extraRows = Math.max(0, Math.ceil((highest + 2 - 5) / 4));
    let customSlot = 0;
    return Array.from({ length: 16 + extraRows * 4 }, (_, index) => {
      const effect =
        index < 16
          ? categories[index % 4].effects[Math.floor(index / 4)]
          : undefined;
      const slot = effect ? -1 : customSlot++;
      return {
        index,
        category: index % 4,
        effect,
        slot,
        preset: presets.find((p) => p.slot === slot),
      };
    });
  });
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
<div
  bind:this={grid}
  class="impulse-grid"
  role="group"
  aria-label="Built-in impulses"
>
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
    {:else if slot.preset}
      {@const preset = slot.preset}
      <div class="preset-tile">
        <button
          type="button"
          class="impulse-pad saved-pulse"
          class:selected={selectedId === `preset:${preset.id}`}
          aria-label={`${preset.name}, custom pulse, ${preset.durationMs} milliseconds`}
          aria-pressed={selectedId === `preset:${preset.id}`}
          title={`${preset.name} · ${preset.durationMs} ms`}
          onclick={() => onselect(`preset:${preset.id}`)}
          draggable="true"
          ondragstart={(event) => ondragstart(event, `preset:${preset.id}`)}
        >
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            aria-hidden="true"
            ><polyline
              points={preset.keyframes
                .map(
                  (p) =>
                    `${(p.timeMs / preset.durationMs) * 100},${40 - p.amplitudePercent * 0.4}`,
                )
                .join(" ")}
            /></svg
          >
          <strong>{preset.name}</strong><small
            >Custom · {preset.durationMs} ms</small
          >
        </button>
        <div class="preset-menu" class:open={menuId === preset.id}>
          <button
            class="preset-trigger"
            data-slot={slot.slot}
            aria-label={`Actions for ${preset.name}`}
            aria-expanded={menuId === preset.id}
            aria-controls={`preset-actions-${preset.id}`}
            onclick={() => (menuId = menuId === preset.id ? null : preset.id)}
            onkeydown={closeMenu}
            ><svg viewBox="0 0 24 24" aria-hidden="true"
              ><circle cx="5" cy="12" r="1.5" /><circle
                cx="12"
                cy="12"
                r="1.5"
              /><circle cx="19" cy="12" r="1.5" /></svg
            ></button
          >
          {#if menuId === preset.id}<div
              id={`preset-actions-${preset.id}`}
              role="group"
              aria-label={`Actions for ${preset.name}`}
            >
              <button
                onclick={() => {
                  menuId = null;
                  onedit(preset);
                }}
                onkeydown={closeMenu}>Edit</button
              >
              <button
                onclick={() => {
                  removePreset(preset);
                }}
                onkeydown={closeMenu}>Remove</button
              >
            </div>{/if}
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="impulse-empty"
        data-slot={slot.slot}
        aria-label="Create custom pulse"
        onclick={() => oncreate(slot.slot)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg
        >
      </button>
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
    grid-auto-rows: var(--spacing-rail);
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
    @apply rounded-field flex items-center justify-center bg-transparent text-muted;
  }
  .impulse-empty svg {
    @apply size-5;
  }
  .impulse-empty:hover {
    @apply text-accent-bright border-accent bg-surface-soft;
  }
  .preset-tile {
    @apply relative min-w-0;
  }
  .saved-pulse {
    @apply size-full flex flex-col justify-center items-center gap-1 px-1;
  }
  .saved-pulse > svg {
    @apply w-full h-4 text-accent-bright;
  }
  .saved-pulse polyline {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    vector-effect: non-scaling-stroke;
  }
  .saved-pulse strong {
    @apply max-w-full truncate text-size-10;
  }
  .saved-pulse small {
    @apply text-muted text-size-8 whitespace-nowrap;
  }
  .preset-menu {
    @apply absolute -top-1 -end-1;
    z-index: 5;
  }
  .preset-menu.open {
    z-index: 6;
  }
  .preset-trigger {
    @apply size-6 flex items-center justify-center p-0 rounded-full bg-control text-ink cursor-pointer;
    border: 0;
  }
  .preset-trigger svg {
    @apply size-4 fill-current pointer-events-none;
  }
  .preset-trigger:focus-visible {
    outline: var(--outline-width-focus) solid var(--color-accent-bright);
  }
  .preset-menu > div {
    @apply absolute end-0 mt-1 bg-control rounded-field p-1 min-w-20;
  }
  .preset-menu > div button {
    @apply block w-full border-0 bg-transparent text-ink text-start text-size-11 px-2 py-2 rounded-xs;
  }
  .preset-menu > div button:hover {
    @apply bg-control-hover;
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
