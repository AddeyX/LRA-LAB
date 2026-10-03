<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    area,
    title,
    stack = false,
    actions,
    children,
    ...rest
  }: {
    area: string;
    title?: string;
    stack?: boolean;
    actions?: Snippet;
    children: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
  const titleId = $props.id();
</script>

<section
  class="card"
  class:stack
  style:grid-area={area}
  aria-labelledby={title ? titleId : undefined}
  {...rest}
>
  {#if title}
    <div class="card-head">
      <h2 id={titleId}>{title}</h2>
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
  .card-head h2 {
    margin: 0;
    font: 500 18px/1.2 var(--font-sans);
    letter-spacing: 0.005em;
  }
  @media (max-width: 45rem) {
    .card {
      padding: 18px;
      border-radius: 22px;
    }
  }
</style>
