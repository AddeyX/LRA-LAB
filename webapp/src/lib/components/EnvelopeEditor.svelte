<script lang="ts">
  import { tick } from "svelte";
  import { insertNode, moveNode, removeNode } from "$lib/envelope";
  import type { Point } from "$lib/signature";

  let {
    points,
    durationMs,
    maxPoints = 32,
    onchange,
  }: {
    points: Point[];
    durationMs: number;
    maxPoints?: number;
    onchange: (points: Point[]) => void;
  } = $props();
  let plot: HTMLDivElement;
  let selected = $state(1);
  let announcement = $state("");
  let drag = $state<{
    pointerId: number;
    index: number;
    originX: number;
    originY: number;
    original: Point[];
    points: Point[];
  } | null>(null);
  let shown = $derived(drag?.points ?? points);
  let selectedIndex = $derived(Math.min(selected, shown.length - 1));
  let active = $derived(shown[selectedIndex]);
  let canRemove = $derived(
    selectedIndex > 0 && selectedIndex < points.length - 1,
  );
  let insertion = $derived(insertNode(points, maxPoints));
  let waveform = $derived(
    shown
      .map(
        (p) => `${(p.timeMs / durationMs) * 100},${100 - p.amplitudePercent}`,
      )
      .join(" "),
  );

  async function focusNode(index: number) {
    await tick();
    plot
      .querySelector<HTMLButtonElement>(`[data-node="${index}"]`)
      ?.focus({ preventScroll: true });
  }
  function commit(next: Point[], index = selectedIndex) {
    onchange(next);
    selected = Math.min(index, next.length - 1);
    const point = next[selected];
    announcement = `Node ${selected + 1}: ${point.timeMs} milliseconds, ${point.amplitudePercent} percent.`;
  }
  function begin(event: PointerEvent, index: number) {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    event.stopPropagation();
    selected = index;
    const node = event.currentTarget as HTMLButtonElement;
    node.focus({ preventScroll: true });
    node.setPointerCapture(event.pointerId);
    const original = points.map((p) => ({ ...p }));
    drag = {
      pointerId: event.pointerId,
      index,
      originX: event.clientX,
      originY: event.clientY,
      original,
      points: original,
    };
  }
  function move(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = plot.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = drag.original[drag.index];
    drag.points = moveNode(
      drag.original,
      drag.index,
      point.timeMs +
        ((event.clientX - drag.originX) / bounds.width) * durationMs,
      point.amplitudePercent -
        ((event.clientY - drag.originY) / bounds.height) * 100,
    );
  }
  function end(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const finished = drag;
    drag = null;
    if (JSON.stringify(finished.points) !== JSON.stringify(finished.original))
      commit(finished.points, finished.index);
  }
  function keyboard(event: KeyboardEvent, index: number) {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Delete",
        "Backspace",
        "Escape",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      drag = null;
      return;
    }
    if (drag) return;
    selected = index;
    if (event.key === "Delete" || event.key === "Backspace") {
      if (index === 0 || index === points.length - 1) return;
      commit(removeNode(points, index), index - 1);
      void focusNode(index - 1);
      return;
    }
    const point = points[index];
    const time =
      point.timeMs +
      (event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0);
    const amplitude =
      point.amplitudePercent +
      (event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0);
    const next = moveNode(points, index, time, amplitude);
    if (JSON.stringify(next) !== JSON.stringify(points)) commit(next, index);
  }
  function add() {
    if (!insertion) return;
    commit(insertion.points, insertion.index);
    void focusNode(insertion.index);
  }
  function remove() {
    if (!canRemove) return;
    const nextIndex = selectedIndex - 1;
    commit(removeNode(points, selectedIndex), nextIndex);
    void focusNode(nextIndex);
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") drag = null;
  }}
/>

<div class="envelope-editor">
  <div class="envelope-surface">
    <div
      class="envelope-plot"
      bind:this={plot}
      role="group"
      aria-label="Pulse envelope nodes"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={waveform} />
      </svg>
      {#each shown as point, index (index)}
        <button
          class="envelope-node"
          class:active={selectedIndex === index}
          data-node={index}
          style:left={`${(point.timeMs / durationMs) * 100}%`}
          style:top={`${100 - point.amplitudePercent}%`}
          aria-label={`Node ${index + 1}: ${point.timeMs} milliseconds, ${point.amplitudePercent} percent`}
          aria-pressed={selectedIndex === index}
          onfocus={() => (selected = index)}
          onclick={() => (selected = index)}
          onpointerdown={(event) => begin(event, index)}
          onpointermove={move}
          onpointerup={end}
          onpointercancel={() => (drag = null)}
          onlostpointercapture={() => (drag = null)}
          onkeydown={(event) => keyboard(event, index)}><span></span></button
        >
      {/each}
    </div>
  </div>
  <div class="envelope-footer">
    <strong class="envelope-readout"
      >Point {selectedIndex + 1}
      <span>{active.timeMs} ms · {active.amplitudePercent}%</span></strong
    >
    <div class="node-actions">
      <button onclick={add} disabled={!insertion}>Add point</button>
      <button onclick={remove} disabled={!canRemove}>Remove point</button>
    </div>
  </div>
  <span class="sr-only" aria-live="polite">{announcement}</span>
</div>

<style lang="postcss">
  @reference "../../app.css";
  .envelope-editor {
    @apply flex flex-col gap-3 min-h-0;
    flex: 1 1 auto;
  }
  .envelope-footer {
    @apply flex flex-wrap items-center justify-between gap-3;
  }
  .node-actions {
    @apply flex flex-wrap gap-1.5;
  }
  .node-actions button {
    @apply border-0 bg-surface-raised text-ink px-3.5 py-2 text-size-13;
    border-radius: calc(var(--spacing) * 2.5);
  }
  .node-actions button:hover:enabled {
    transform: none;
    @apply bg-action text-action-ink;
  }
  .envelope-surface {
    @apply flex flex-col min-h-0 bg-surface-raised p-5;
    flex: 1 1 auto;
    border-radius: calc(var(--spacing) * 4.5);
  }
  .envelope-plot {
    @apply relative min-h-24;
    flex: 1 1 10rem;
    background:
      repeating-linear-gradient(
        to right,
        var(--color-line) 0 calc(var(--spacing) * 0.25),
        transparent calc(var(--spacing) * 0.25) 20%
      ),
      linear-gradient(
        to top,
        var(--color-line) 0 calc(var(--spacing) * 0.25),
        transparent calc(var(--spacing) * 0.25)
      );
  }
  svg {
    @apply absolute inset-0 w-full h-full overflow-visible pointer-events-none;
  }
  polyline {
    fill: none;
    stroke: var(--color-ink);
    stroke-width: 2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .envelope-node {
    @apply absolute flex items-center justify-center size-9 p-0 rounded-full bg-transparent;
    border: 0;
    transform: translate(-50%, -50%);
    transition: none;
    cursor: grab;
    touch-action: none;
  }
  .envelope-node:active {
    cursor: grabbing;
  }
  .envelope-node:hover:enabled,
  .envelope-node:active:enabled {
    transform: translate(-50%, -50%);
    background: transparent;
  }
  .envelope-node span {
    @apply block size-3.5 rounded-full bg-accent;
    border: calc(var(--spacing) * 0.5) solid var(--color-surface-raised);
    box-shadow: 0 0 0 calc(var(--spacing) * 0.25) var(--color-ink);
  }
  .envelope-node.active span {
    @apply bg-butter size-4.5;
  }
  .envelope-node:focus-visible {
    outline: var(--outline-width-focus) solid var(--color-accent-bright);
    outline-offset: 0;
  }
  .envelope-readout {
    @apply font-medium text-ink text-size-13 tabular-nums;
  }
  .envelope-readout span {
    @apply text-muted ms-2 font-normal;
  }
</style>
