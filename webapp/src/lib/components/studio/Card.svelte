<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    area,
    title,
    stack = false,
    compact = false,
    actions,
    titleDetail,
    children,
    ...rest
  }: {
    area: string;
    title?: string;
    stack?: boolean;
    compact?: boolean;
    actions?: Snippet;
    titleDetail?: Snippet;
    children: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
  const titleId = $props.id();
</script>

<section
  class="card"
  class:stack
  class:compact
  style:grid-area={area}
  aria-labelledby={title ? titleId : undefined}
  {...rest}
>
  {#if title}
    <div class="card-head">
      <div class="card-heading">
        <h2 id={titleId}>{title}</h2>
        {#if titleDetail}{@render titleDetail()}{/if}
      </div>
      {#if actions}{@render actions()}{/if}
    </div>
  {/if}
  {@render children()}
</section>

<style>
  .card {
    min-width: 0;
    padding: 24px;
    border-radius: var(--radius-card);
    background: var(--color-surface);
    color: var(--color-ink);
  }
  .card.stack {
    display: flex;
    flex-direction: column;
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 40px;
    margin-bottom: 16px;
  }
  .card-heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    min-width: 0;
  }
  .card-head h2 {
    margin: 0;
    font: 500 18px/1.2 var(--font-sans);
    letter-spacing: 0.005em;
  }
  /* Padding + 18px inner surface radius must equal --radius-card (28px). */
  .card.compact {
    --card-inset: 8px;
    padding: 10px;
    border-radius: var(--radius-card);
  }
  .card.compact .card-head {
    gap: 12px;
    min-height: 36px;
    margin-bottom: 10px;
    padding: var(--card-inset) var(--card-inset) 0;
  }
  .card.compact .card-head h2 {
    font-size: 16px;
  }
  @media (max-width: 45rem) {
    .card {
      padding: 18px;
      border-radius: 22px;
    }
  }
</style>
