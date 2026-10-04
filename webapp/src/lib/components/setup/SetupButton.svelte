<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    variant = "quiet",
    size = "md",
    children,
    ...rest
  }: {
    variant?: "primary" | "quiet" | "ghost";
    size?: "md" | "lg";
    children: Snippet;
  } & HTMLButtonAttributes = $props();
</script>

<button class="sb {variant} {size}" type="button" {...rest}
  >{@render children()}</button
>

<style>
  .sb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 9px 16px;
    border: 0;
    border-radius: var(--radius-control);
    font: 400 14px/20px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .sb.lg {
    min-height: 48px;
    padding: 12px 22px;
    border-radius: var(--radius-inset);
    font-size: 15px;
  }
  .sb:hover:enabled {
    transform: none;
  }
  .sb:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .primary {
    background: var(--color-action);
    color: var(--color-action-ink);
  }
  .primary:hover:enabled {
    background: var(--color-action-hover);
  }
  .quiet {
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  .quiet:hover:enabled {
    background: var(--color-control);
  }
  .ghost {
    background: transparent;
    color: var(--color-muted);
  }
  .ghost:hover:enabled {
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  .sb:disabled {
    opacity: 1;
    background: var(--color-control);
    color: var(--color-subtle);
  }
  .ghost:disabled {
    background: transparent;
  }
</style>
