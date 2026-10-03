<script lang="ts">
  import { tick } from "svelte";
  import { MAX_MS, blockDuration, effectById, type Block } from "./signature";
  import { GRID_MS, editTimeline, resizePulse, snapTime } from "./timeline";
  import ScrubField from "./components/ScrubField.svelte";
  import type { BrushKind } from "./pulse-library";

  let {
    blocks,
    selectedId,
    brush,
    onselect,
    onplace,
    onedit,
    onremove,
    hasPreset,
  } = $props<{
    blocks: Block[];
    selectedId: string | null;
    brush: Block;
    onselect: (id: string) => boolean | void;
    onplace: (timeMs: number, kind?: BrushKind) => void;
    onedit: (block: Block) => void;
    onremove: (id: string) => void;
    hasPreset: (id: string) => boolean;
  }>();

  let lane: HTMLDivElement;
  let viewport: HTMLDivElement;
  let zoom = $state(100);
  let hoverMs = $state<number | null>(null);
  let drag = $state<{
    original: Block;
    candidate: Block;
    offsetMs: number;
    mode: "move" | "resize";
    pointerId: number;
    originX: number;
    moved: boolean;
  } | null>(null);
  const steps = Array.from({ length: MAX_MS / GRID_MS }, (_, i) => i * GRID_MS);
  const marks = Array.from({ length: 26 }, (_, i) => i * 200);
  let ghost = $derived(
    drag?.candidate ??
      (hoverMs === null ? null : { ...brush, startMs: hoverMs }),
  );
  let ghostError = $derived(ghost ? editTimeline(blocks, ghost).error : null);
  // CSS owns the cell size; timing and zoom only supply dimensionless multipliers.
  const distance = (cells: number) =>
    `calc(var(--spacing-timeline-cell) * ${cells})`;
  const x = (ms: number) => distance((ms / GRID_MS) * (zoom / 100));
  const name = (block: Block) =>
    block.type === "pulse"
      ? "Custom pulse"
      : (effectById(block.effectId)?.name ?? "Effect");
  const timeAt = (clientX: number) => {
    const bounds = lane.getBoundingClientRect();
    return ((clientX - bounds.left) / bounds.width) * MAX_MS;
  };
  const envelope = (block: Block) =>
    block.type === "pulse"
      ? block.keyframes
          .map(
            (p) =>
              `${(p.timeMs / block.durationMs) * 100},${40 - p.amplitudePercent * 0.36}`,
          )
          .join(" ")
      : "0,40 8,40 12,6 20,34 26,15 34,37 40,26 48,40 100,40";

  function beginDrag(
    event: PointerEvent,
    block: Block,
    mode: "move" | "resize",
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    hoverMs = null;
    if (onselect(block.id) === false) return;
    const target = event.currentTarget as HTMLElement;
    target.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId);
    drag = {
      original: block,
      candidate: block,
      offsetMs: timeAt(event.clientX) - block.startMs,
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      moved: false,
    };
  }
  function moveDrag(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.originX) < 3) return;
    const bounds = viewport.getBoundingClientRect();
    const cellWidth = lane.getBoundingClientRect().width / steps.length;
    if (event.clientX > bounds.right - 28) viewport.scrollLeft += cellWidth;
    if (event.clientX < bounds.left + 28) viewport.scrollLeft -= cellWidth;
    const timeMs = timeAt(event.clientX);
    const candidate =
      drag.mode === "resize" && drag.original.type === "pulse"
        ? resizePulse(drag.original, timeMs - drag.original.startMs)
        : { ...drag.original, startMs: snapTime(timeMs - drag.offsetMs) };
    drag = { ...drag, candidate, moved: true };
  }
  function endDrag(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const finished = drag;
    drag = null;
    if (finished.moved) onedit(finished.candidate);
  }
  function keyboard(event: KeyboardEvent, block: Block, resizing = false) {
    if (event.key === "Escape") {
      drag = null;
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onremove(block.id);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const amount = (event.key === "ArrowLeft" ? -1 : 1) * GRID_MS;
    onedit(
      resizing && block.type === "pulse"
        ? resizePulse(block, block.durationMs + amount)
        : { ...block, startMs: Math.max(0, block.startMs + amount) },
    );
    const button = event.currentTarget as HTMLButtonElement;
    void tick().then(() => {
      if (!button.isConnected) return;
      button.focus({ preventScroll: true });
      const bounds = button.getBoundingClientRect(),
        visible = viewport.getBoundingClientRect();
      if (bounds.left < visible.left)
        viewport.scrollLeft -= visible.left - bounds.left;
      else if (bounds.right > visible.right)
        viewport.scrollLeft += bounds.right - visible.right;
    });
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    hoverMs = null;
    const value = event.dataTransfer?.getData("application/x-haptic-beat");
    if (!value) return;
    if (value === "pulse") onplace(snapTime(timeAt(event.clientX)), "pulse");
    else if (value.startsWith("preset:") && hasPreset(value.slice(7)))
      onplace(snapTime(timeAt(event.clientX)), value as BrushKind);
    else if (effectById(Number(value)))
      onplace(snapTime(timeAt(event.clientX)), Number(value));
  }
</script>

<div class="sequencer-toolbar flex-wrap">
  <span class="snap-label">Snap <strong>40 ms</strong></span>
  <span class="timeline-hint">Click to place · drag to move</span>
  <div class="zoom-control">
    <ScrubField
      label="Zoom"
      suffix="%"
      value={zoom}
      defaultValue={100}
      min={60}
      max={160}
      step={5}
      size="sm"
      accent="var(--color-accent-bright)"
      chipColor="var(--color-surface-raised)"
      showFill={false}
      onChange={(value) => (zoom = value)}
    />
  </div>
</div>
<!-- Timeline coordinates and drag math remain physical left-to-right in RTL layouts. -->
<div
  class="sequencer-body"
  role="region"
  aria-label="Haptic timeline"
  dir="ltr"
>
  <div class="sequencer-viewport" bind:this={viewport}>
    <div
      class="sequencer-canvas"
      style:width={distance((steps.length * zoom) / 100)}
    >
      <div class="step-ruler" aria-hidden="true">
        {#each marks as mark (mark)}<span
            class:major={mark % 1000 === 0}
            style:left={x(mark)}
            >{(mark / 1000).toFixed(2)}<small>s</small></span
          >{/each}
      </div>
      <!-- Drop target also has individual keyboard-accessible placement buttons. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="beat-lane"
        bind:this={lane}
        style:--cell={distance(zoom / 100)}
        onpointerleave={() => {
          if (!drag) hoverMs = null;
        }}
        ondragover={(event) => {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
          hoverMs = snapTime(timeAt(event.clientX));
        }}
        ondragleave={() => (hoverMs = null)}
        ondrop={drop}
      >
        {#each steps as step (step)}
          <button
            class="grid-cell"
            style:left={x(step)}
            style:width={distance(zoom / 100)}
            aria-label={`Place haptic at ${step} ms`}
            title={`${step} ms`}
            onpointerenter={() => {
              if (!drag) hoverMs = step;
            }}
            onfocus={() => (hoverMs = step)}
            onblur={() => (hoverMs = null)}
            onclick={() => onplace(step)}
          ></button>
        {/each}
        {#if blocks.length === 0}<div class="lane-empty">
            <strong>Place your first beat</strong><span
              >Pick from the library, then click a cell.</span
            >
          </div>{/if}
        {#each blocks as block (block.id)}
          <div
            class="beat-wrapper"
            class:selected={selectedId === block.id}
            class:custom={block.type === "pulse"}
            class:dragging={drag?.original.id === block.id && drag?.moved}
            style:left={x(block.startMs)}
            style:width={x(blockDuration(block))}
          >
            <button
              class="beat"
              aria-label={`${name(block)} at ${block.startMs} ms`}
              aria-pressed={selectedId === block.id}
              title={`${name(block)} · ${block.startMs}–${block.startMs + blockDuration(block)} ms. Drag or use arrow keys to move; Delete to remove.`}
              onclick={(event) => {
                if (onselect(block.id) !== false)
                  event.currentTarget.focus({ preventScroll: true });
              }}
              onpointerenter={() => {
                if (!drag) hoverMs = null;
              }}
              onpointerdown={(e) => beginDrag(e, block, "move")}
              onpointermove={moveDrag}
              onpointerup={endDrag}
              onpointercancel={() => (drag = null)}
              onkeydown={(e) => keyboard(e, block)}
            >
              <span class="beat-name">{name(block)}</span>
              <svg
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
                aria-hidden="true"><polyline points={envelope(block)} /></svg
              >
              <span class="beat-duration">{blockDuration(block)} ms</span>
            </button>
            {#if block.type === "pulse"}
              <button
                class="resize-handle"
                aria-label={`Resize pulse at ${block.startMs} ms`}
                title="Drag to resize · arrow keys adjust 40 ms"
                onpointerdown={(e) => beginDrag(e, block, "resize")}
                onpointermove={moveDrag}
                onpointerup={endDrag}
                onpointercancel={() => (drag = null)}
                onkeydown={(e) => keyboard(e, block, true)}>⋮</button
              >
            {/if}
          </div>
        {/each}
        {#if ghost && (!drag || drag.moved)}
          <div
            class="beat-ghost"
            class:invalid={!!ghostError}
            style:left={x(ghost.startMs)}
            style:width={x(blockDuration(ghost))}
            aria-hidden="true"
          >
            <span>{ghost.startMs} ms</span><small
              >{ghostError
                ? "Cannot place here"
                : drag?.mode === "resize"
                  ? `${blockDuration(ghost)} ms`
                  : name(ghost)}</small
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "../app.css";

  .sequencer-toolbar {
    @apply flex items-center gap-3;
    padding: 0 0 calc(var(--spacing) * 3);
    @apply text-size-13;
  }
  .snap-label {
    @apply flex items-center gap-2 text-muted whitespace-nowrap;
    letter-spacing: 0.03em;
  }
  .snap-label strong {
    @apply font-normal text-ink bg-surface-raised;
    padding: calc(var(--spacing) * 1) calc(var(--spacing) * 2.5);
    @apply rounded-pill;
  }
  .timeline-hint {
    @apply text-muted;
    letter-spacing: 0.03em;
  }
  .zoom-control {
    @apply ms-auto flex gap-2 items-center text-muted;
  }
  .sequencer-body {
    @apply grid grid-cols-1 min-w-0 overflow-hidden bg-surface-raised;
    border-radius: calc(var(--spacing) * 4.5);
  }
  .sequencer-viewport {
    @apply overflow-x-auto min-w-0 max-w-full;
    scrollbar-color: var(--color-control-hover) transparent;
    scrollbar-width: thin;
  }
  .sequencer-canvas {
    @apply relative;
  }
  .step-ruler {
    @apply h-ruler relative bg-surface-raised;
  }
  .step-ruler > span {
    @apply absolute top-4 h-6.5 ps-1.5;
    border-left: calc(var(--spacing) * 0.25) solid var(--color-line);
    @apply text-size-11 text-subtle tabular-nums;
  }
  .step-ruler > span.major {
    @apply text-ink border-ink;
  }
  .step-ruler small {
    @apply text-size-9 ps-0.5;
  }
  .beat-lane {
    @apply h-lane relative overflow-hidden;
    background:
      repeating-linear-gradient(
        to right,
        var(--color-control-line) 0 calc(var(--spacing) * 0.25),
        transparent calc(var(--spacing) * 0.25) calc(var(--cell) * 5)
      ),
      repeating-linear-gradient(
        to right,
        color-mix(in srgb, var(--color-line) 70%, transparent) 0
          calc(var(--spacing) * 0.25),
        transparent calc(var(--spacing) * 0.25) var(--cell)
      ),
      var(--color-panel-raised);
  }
  .grid-cell {
    @apply absolute;
    inset-block: 0;
    background: transparent;
    border: 0;
    @apply rounded-none;
    @apply p-0 cursor-crosshair;
    transition: none;
  }
  .grid-cell:hover,
  .grid-cell:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 22%, transparent);
    transform: none;
  }
  .lane-empty {
    @apply absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none text-muted text-size-13;
  }
  .lane-empty strong {
    @apply text-ink text-size-16 font-medium;
  }
  .beat-wrapper {
    @apply absolute top-10.5 h-beat;
    z-index: 2;
    @apply bg-accent text-ink;
    border-radius: calc(var(--spacing) * 3);
    transition: box-shadow 0.25s var(--ease-butter);
  }
  .beat-wrapper.custom {
    @apply bg-butter;
  }
  .beat-wrapper.selected {
    outline: calc(var(--spacing) * 0.5) solid var(--color-ink);
    outline-offset: calc(var(--spacing) * 0.5);
    z-index: 3;
  }
  .beat-wrapper.dragging {
    opacity: 0.28;
  }
  .beat {
    @apply flex flex-col w-full h-full;
    padding: calc(var(--spacing) * 2.5) calc(var(--spacing) * 2);
    @apply gap-1.25;
    border: none;
    background: transparent;
    color: inherit;
    @apply overflow-hidden text-start cursor-grab;
    touch-action: none;
    transition: none;
    border-radius: inherit;
  }
  .beat:hover:enabled,
  .beat:active:enabled {
    transform: none;
    background: color-mix(in srgb, var(--color-ink) 7%, transparent);
  }
  .beat:active {
    @apply cursor-grabbing;
  }
  .beat-name {
    @apply text-size-11 font-medium whitespace-nowrap max-w-full overflow-hidden text-ellipsis;
  }
  .beat svg {
    @apply w-full h-10.75 shrink-0;
    margin-block: auto;
  }
  .beat polyline {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .beat-duration {
    @apply text-size-10 whitespace-nowrap tabular-nums;
    opacity: 0.7;
  }
  .resize-handle {
    @apply absolute;
    right: 0;
    @apply top-0 h-full w-3 p-0;
    background: color-mix(in srgb, var(--color-ink) 8%, transparent);
    border: 0;
    color: inherit;
    @apply cursor-ew-resize;
    touch-action: none;
    border-radius: 0 calc(var(--spacing) * 3) calc(var(--spacing) * 3) 0;
    transition: none;
  }
  .resize-handle:hover:enabled {
    background: color-mix(in srgb, var(--color-ink) 16%, transparent);
    transform: none;
  }
  .beat-ghost {
    @apply absolute top-10 h-ghost;
    border: calc(var(--spacing) * 0.5) dashed
      color-mix(in srgb, var(--color-ink) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
    @apply text-ink;
    z-index: 4;
    @apply pointer-events-none;
    padding: calc(var(--spacing) * 2) calc(var(--spacing) * 1.5);
    border-radius: calc(var(--spacing) * 3);
    @apply flex flex-col gap-2 overflow-hidden whitespace-nowrap text-size-11;
  }
  .beat-ghost small {
    @apply text-size-10 text-muted;
  }
  .beat-ghost.invalid {
    @apply border-danger bg-danger-surface text-danger-ink;
  }
  @variant max-studio {
    .timeline-hint {
      @apply hidden;
    }
    .sequencer-toolbar {
      @apply gap-2;
    }
  }
</style>
