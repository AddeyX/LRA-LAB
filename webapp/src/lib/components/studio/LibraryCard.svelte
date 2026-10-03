<script lang="ts">
  import type { Snippet } from "svelte";
  import Card from "./Card.svelte";

  let {
    customActive,
    onpickcustom,
    ondragcustom,
    children,
  }: {
    customActive: boolean;
    onpickcustom: () => void;
    ondragcustom: (event: DragEvent) => void;
    children: Snippet;
  } = $props();
</script>

<Card area="library" title="Library" stack>
  <div class="library-body">{@render children()}</div>
  <button
    class="custom-pulse"
    class:active={customActive}
    aria-pressed={customActive}
    onclick={onpickcustom}
    draggable="true"
    ondragstart={ondragcustom}
    ><span class="custom-pulse-tile" aria-hidden="true"
      ><svg viewBox="0 0 48 24"
        ><path d="M2 20C10 20 12 4 20 4s10 16 16 16 8-8 10-8" /></svg
      ></span
    ><span class="custom-pulse-text"
      ><strong>Custom pulse</strong><small>Draw the curve</small></span
    ><span aria-hidden="true">↗</span></button
  >
</Card>

<style>
  .library-body {
    flex: 1;
    padding-bottom: 16px;
  }
  .custom-pulse {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 10px 16px 10px 10px;
    border: 0;
    border-radius: 18px;
    background: var(--color-surface-raised);
    color: var(--color-ink);
    text-align: start;
  }
  .custom-pulse:hover:enabled {
    transform: none;
    box-shadow: inset 0 0 0 2px var(--color-ink);
  }
  .custom-pulse.active {
    box-shadow: inset 0 0 0 2px var(--color-ink);
  }
  .custom-pulse-tile {
    display: grid;
    place-items: center;
    width: 52px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-butter);
  }
  .custom-pulse-tile svg {
    width: 34px;
    height: 17px;
    fill: none;
    stroke: var(--color-ink);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .custom-pulse-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .custom-pulse-text strong {
    font: 500 15px/1.2 var(--font-sans);
  }
  .custom-pulse-text small {
    color: var(--color-muted);
    font-size: 12px;
    letter-spacing: 0.03em;
  }
</style>
