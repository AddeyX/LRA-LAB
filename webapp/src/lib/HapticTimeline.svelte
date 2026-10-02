<script lang="ts">
  import { MAX_MS, blockDuration, effectById, type Block } from "./signature";
  import { GRID_MS, editTimeline, resizePulse, snapTime } from "./timeline";

  let { blocks, selectedId, brush, onselect, onplace, onedit, onremove } =
    $props<{
      blocks: Block[];
      selectedId: string | null;
      brush: Block;
      onselect: (id: string) => void;
      onplace: (timeMs: number, kind?: number | "pulse") => void;
      onedit: (block: Block) => void;
      onremove: (id: string) => void;
    }>();

  let lane: HTMLDivElement;
  let viewport: HTMLDivElement;
  let cellWidth = $state(20);
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
  let width = $derived((MAX_MS / GRID_MS) * cellWidth);
  const x = (ms: number) => (ms / GRID_MS) * cellWidth;
  const name = (block: Block) =>
    block.type === "pulse"
      ? "Custom pulse"
      : (effectById(block.effectId)?.name ?? "Effect");
  const timeAt = (clientX: number) =>
    ((clientX - lane.getBoundingClientRect().left) / width) * MAX_MS;
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
    onselect(block.id);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    hoverMs = null;
    const value = event.dataTransfer?.getData("application/x-haptic-beat");
    if (!value) return;
    if (value === "pulse") onplace(snapTime(timeAt(event.clientX)), "pulse");
    else if (effectById(Number(value)))
      onplace(snapTime(timeAt(event.clientX)), Number(value));
  }
</script>

<div class="sequencer-toolbar">
  <span class="snap-label"
    ><span aria-hidden="true">▦</span> SNAP <strong>40 ms</strong></span
  >
  <span class="timeline-hint">Click to place · drag to move</span>
  <label class="zoom-control"
    >ZOOM
    <select aria-label="Timeline zoom" bind:value={cellWidth}>
      <option value={12}>60%</option><option value={20}>100%</option><option
        value={32}>160%</option
      >
    </select>
  </label>
</div>
<div class="sequencer-body" role="region" aria-label="Haptic timeline">
  <div class="sequencer-viewport" bind:this={viewport}>
    <div class="sequencer-canvas" style:width={`${width}px`}>
      <div class="step-ruler" aria-hidden="true">
        {#each marks as mark (mark)}<span
            class:major={mark % 1000 === 0}
            style:left={`${x(mark)}px`}
            >{(mark / 1000).toFixed(2)}<small>s</small></span
          >{/each}
      </div>
      <!-- Drop target also has individual keyboard-accessible placement buttons. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="beat-lane"
        bind:this={lane}
        style:--cell={`${cellWidth}px`}
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
            style:left={`${x(step)}px`}
            style:width={`${cellWidth}px`}
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
            <strong>Your first beat starts here.</strong><span
              >Choose a haptic. Click any 40 ms cell to place it.</span
            >
          </div>{/if}
        {#each blocks as block (block.id)}
          <div
            class="beat-wrapper"
            class:selected={selectedId === block.id}
            class:custom={block.type === "pulse"}
            class:dragging={drag?.original.id === block.id && drag?.moved}
            style:left={`${x(block.startMs)}px`}
            style:width={`${x(blockDuration(block))}px`}
          >
            <button
              class="beat"
              aria-label={`${name(block)} at ${block.startMs} ms`}
              aria-pressed={selectedId === block.id}
              title={`${name(block)} · ${block.startMs}–${block.startMs + blockDuration(block)} ms. Drag or use arrow keys to move; Delete to remove.`}
              onclick={() => onselect(block.id)}
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
            style:left={`${x(ghost.startMs)}px`}
            style:width={`${x(blockDuration(ghost))}px`}
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

<style>
  .sequencer-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    border-block: 1px solid var(--line);
    background: var(--surface);
    font-size: 10px;
  }
  .snap-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .snap-label > span {
    color: var(--violet-bright);
    font-size: 18px;
  }
  .snap-label strong {
    color: var(--violet-bright);
    letter-spacing: 0;
    background: var(--surface-soft);
    padding: 4px 7px;
    border-radius: 3px;
  }
  .timeline-hint {
    color: var(--muted);
  }
  .zoom-control {
    margin-left: auto;
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--muted);
    font-size: 9px;
    letter-spacing: 0.1em;
  }
  select {
    padding: 4px;
    background: var(--surface-raised);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 3px;
  }
  .sequencer-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    margin-inline: 20px;
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
  }
  .sequencer-viewport {
    overflow-x: auto;
    min-width: 0;
    max-width: 100%;
    scrollbar-color: var(--line) var(--canvas);
    scrollbar-width: thin;
  }
  .sequencer-canvas {
    position: relative;
  }
  .step-ruler {
    height: 42px;
    background: var(--surface);
    position: relative;
    border-bottom: 1px solid var(--line);
  }
  .step-ruler > span {
    position: absolute;
    top: 16px;
    height: 26px;
    padding-left: 5px;
    border-left: 1px solid var(--line);
    font-size: 10px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .step-ruler > span.major {
    color: var(--text);
    border-color: var(--subtle);
    font-weight: 700;
  }
  .step-ruler small {
    font-size: 8px;
    padding-left: 2px;
  }
  .beat-lane {
    height: 196px;
    position: relative;
    overflow: hidden;
    background:
      repeating-linear-gradient(
        to right,
        color-mix(in srgb, var(--violet-bright) 18%, transparent) 0 1px,
        transparent 1px calc(var(--cell) * 5)
      ),
      repeating-linear-gradient(
        to right,
        color-mix(in srgb, var(--line) 65%, transparent) 0 1px,
        transparent 1px var(--cell)
      ),
      repeating-linear-gradient(
        to bottom,
        transparent 0 48px,
        color-mix(in srgb, var(--line) 40%, transparent) 48px 49px
      ),
      var(--surface-raised);
  }
  .grid-cell {
    position: absolute;
    inset-block: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    cursor: crosshair;
    transition: none;
  }
  .grid-cell:hover,
  .grid-cell:focus-visible {
    background: color-mix(in srgb, var(--violet) 12%, transparent);
    transform: none;
  }
  .lane-empty {
    position: absolute;
    top: 72px;
    left: 32px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    color: var(--muted);
    font-size: 12px;
  }
  .lane-empty strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
  }
  .beat-wrapper {
    position: absolute;
    top: 42px;
    height: 112px;
    z-index: 2;
    border-radius: 9px;
    background: var(--violet);
    border: 1px solid var(--violet-bright);
    color: var(--text);
    box-shadow: 0 3px 0 var(--canvas);
  }
  .beat-wrapper.custom {
    background: var(--violet-deep);
    border-color: var(--violet);
    color: var(--text);
  }
  .beat-wrapper.selected {
    outline: 2px solid var(--text);
    outline-offset: 2px;
    z-index: 3;
  }
  .beat-wrapper.dragging {
    opacity: 0.28;
  }
  .beat {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 8px 5px;
    gap: 5px;
    border: none;
    background: transparent;
    color: inherit;
    overflow: hidden;
    text-align: left;
    cursor: grab;
    touch-action: none;
    transition: none;
    border-radius: 3px;
  }
  .beat:hover:enabled,
  .beat:active:enabled {
    transform: none;
    background: color-mix(in srgb, var(--text) 8%, transparent);
  }
  .beat:active {
    cursor: grabbing;
  }
  .beat-name {
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .beat svg {
    width: 100%;
    height: 43px;
    flex-shrink: 0;
    margin-block: auto;
    opacity: 0.75;
  }
  .beat polyline {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .beat-duration {
    font-size: 9px;
    white-space: nowrap;
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
  }
  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 12px;
    padding: 0;
    background: color-mix(in srgb, var(--canvas) 18%, transparent);
    border: 0;
    color: inherit;
    cursor: ew-resize;
    touch-action: none;
    border-radius: 0 3px 3px 0;
    transition: none;
  }
  .resize-handle:hover:enabled {
    background: color-mix(in srgb, var(--canvas) 30%, transparent);
    transform: none;
  }
  .beat-ghost {
    position: absolute;
    top: 40px;
    height: 116px;
    border: 2px dashed var(--violet-bright);
    background: color-mix(in srgb, var(--violet) 18%, transparent);
    color: var(--text);
    z-index: 4;
    pointer-events: none;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
    border-radius: 4px;
    white-space: nowrap;
    font-size: 11px;
  }
  .beat-ghost small {
    font-size: 9px;
  }
  .beat-ghost.invalid {
    border-color: #f5a6b9;
    background: #38232c;
    color: #ffd0d7;
  }
  @media (max-width: 760px) {
    .sequencer-body {
      margin-inline: 12px;
    }
    .timeline-hint {
      display: none;
    }
    .sequencer-toolbar {
      gap: 8px;
      padding-inline: 12px;
    }
  }
</style>
