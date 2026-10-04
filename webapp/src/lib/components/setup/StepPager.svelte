<script lang="ts">
  let {
    index,
    total,
    title,
    nextLabel,
    skip,
    onprev,
    onnext,
  }: {
    index: number;
    total: number;
    title: string;
    nextLabel: string;
    skip: boolean;
    onprev: () => void;
    onnext: () => void;
  } = $props();
</script>

<div class="pager" role="group" aria-label="Step navigation">
  <button
    type="button"
    class="prev"
    onclick={onprev}
    disabled={index === 0}
    aria-label="Previous step">←</button
  >
  <div class="where" aria-live="polite">
    <span class="num">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    <span class="name">{title}</span>
    <span class="track" aria-hidden="true"
      ><i style:transform={`scaleX(${(index + 1) / total})`}></i></span
    >
  </div>
  <button type="button" class="next" class:skip onclick={onnext}
    >{nextLabel}</button
  >
</div>

<style>
  .pager {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border-radius: var(--radius-island);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-dialog);
  }
  .where {
    display: grid;
    grid-template-columns: auto auto;
    align-items: baseline;
    column-gap: 8px;
    row-gap: 6px;
    min-width: 0;
    width: 150px;
    padding: 0 10px;
  }
  .num {
    color: var(--color-subtle);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .name {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    grid-column: 1 / -1;
    height: 3px;
    border-radius: 2px;
    background: var(--color-control);
    overflow: hidden;
  }
  .track i {
    display: block;
    height: 100%;
    background: var(--color-ink);
    transform-origin: left;
    transition: transform 0.45s var(--ease-butter);
  }
  button {
    min-height: 40px;
    border: 0;
    border-radius: var(--radius-control);
    font: 400 14px/20px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  button:hover:enabled {
    transform: none;
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .prev {
    width: 40px;
    padding: 0;
    background: var(--color-surface);
    color: var(--color-ink);
    font-size: 16px;
  }
  .prev:hover:enabled {
    background: var(--color-control);
  }
  .prev:disabled {
    opacity: 1;
    color: var(--color-inactive);
  }
  .next {
    padding: 9px 16px;
    background: var(--color-action);
    color: var(--color-action-ink);
  }
  .next:hover:enabled {
    background: var(--color-action-hover);
  }
  .next.skip {
    background: var(--color-surface);
    color: var(--color-ink);
  }
  .next.skip:hover:enabled {
    background: var(--color-control);
  }
  @media (prefers-reduced-motion: reduce) {
    .track i {
      transition: none;
    }
  }
</style>
