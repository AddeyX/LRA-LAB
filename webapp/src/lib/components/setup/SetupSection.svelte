<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    index,
    title,
    lead,
    done,
    children,
  }: {
    id: string;
    index: number;
    title: string;
    lead: string;
    done: boolean;
    children: Snippet;
  } = $props();
</script>

<section {id} class="ss" aria-labelledby={`${id}-title`} data-setup-section>
  <header>
    <span class="ss-index">{String(index + 1).padStart(2, "0")}</span>
    <h2 id={`${id}-title`}>{title}</h2>
    {#if done}<span class="ss-done">Done</span>{/if}
  </header>
  <p class="ss-lead">{lead}</p>
  <div class="ss-body">{@render children()}</div>
</section>

<style>
  .ss {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 760px;
    scroll-margin-top: 8px;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .ss-index {
    color: var(--color-subtle);
    font: 400 13px/1 var(--font-sans);
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
  }
  h2 {
    margin: 0;
    font: 500 28px/1.15 var(--font-sans);
    letter-spacing: -0.02em;
  }
  .ss-done {
    align-self: center;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: var(--color-success-surface);
    color: var(--color-success-ink);
    font-size: 12px;
  }
  .ss-lead {
    max-width: 62ch;
    margin: 0;
    color: var(--color-secondary);
    font-size: 15px;
    line-height: 1.6;
    text-wrap: pretty;
  }
  .ss-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 8px;
  }
  @media (max-width: 45rem) {
    h2 {
      font-size: 22px;
    }
  }
</style>
