<script lang="ts">
  let {
    totalMs,
    maxMs,
    beats,
  }: {
    totalMs: number;
    maxMs: number;
    beats: number;
  } = $props();
  let expanded = $state(false);
  const seconds = (ms: number) => (ms / 1000).toFixed(2);
</script>

<button
  class="seq-meter"
  class:expanded
  aria-label="Expand sequence length"
  aria-pressed={expanded}
  onclick={() => (expanded = !expanded)}
>
  <span class="seq-meter-words">
    <span class="seq-meter-now">{seconds(totalMs)}</span>
    <span class="seq-meter-of">/ {seconds(maxMs)} s</span>
  </span>
  <span class="seq-meter-line" aria-hidden="true"
    ><span style:transform={`scaleX(${totalMs / maxMs})`}></span></span
  >
  <span class="seq-meter-more" aria-hidden={!expanded}
    >{seconds(maxMs - totalMs)} s free · {beats}
    {beats === 1 ? "beat" : "beats"}</span
  >
</button>

<style>
  .seq-meter {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
  .seq-meter:hover:enabled {
    transform: none;
  }
  .seq-meter:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .seq-meter-words {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .seq-meter-now {
    font: 500 22px/1 var(--font-sans);
    letter-spacing: -0.02em;
  }
  .seq-meter-of {
    font-size: 13px;
    color: var(--color-muted);
    letter-spacing: 0.03em;
  }
  .seq-meter-line {
    display: block;
    width: 100%;
    min-width: 96px;
    height: 2px;
    border-radius: 2px;
    background: var(--color-control-hover);
    overflow: hidden;
  }
  .seq-meter-line > span {
    display: block;
    height: 100%;
    background: var(--color-ink);
    transform-origin: left;
    transition: transform 0.5s var(--ease-butter);
  }
  .seq-meter-more {
    display: block;
    max-height: 0;
    overflow: hidden;
    font-size: 12px;
    letter-spacing: 0.03em;
    color: var(--color-muted);
    opacity: 0;
    transition:
      max-height 0.45s var(--ease-butter),
      opacity 0.3s ease;
  }
  .seq-meter.expanded .seq-meter-more {
    max-height: 20px;
    opacity: 1;
  }
  .seq-meter.expanded .seq-meter-line > span {
    background: var(--color-accent);
  }
</style>
