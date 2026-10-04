<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    tone = "info",
    title,
    role,
    children,
  }: {
    tone?: "info" | "warn" | "danger" | "success";
    title?: string;
    role?: "alert" | "status";
    children: Snippet;
  } = $props();
</script>

<div class="note {tone}" {role}>
  {#if title}<strong>{title}</strong>{/if}
  <div class="note-body">{@render children()}</div>
</div>

<style>
  .note {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    color: var(--color-secondary);
    font-size: 14px;
    line-height: 1.55;
  }
  strong {
    color: var(--color-ink);
    font-weight: 500;
  }
  .note-body :global(p) {
    margin: 0;
  }
  .note-body :global(a) {
    color: inherit;
  }
  .warn {
    background: color-mix(in srgb, var(--color-warning) 14%, var(--color-surface-raised));
  }
  .danger {
    background: var(--color-danger-surface);
    color: var(--color-danger-ink);
  }
  .danger strong {
    color: var(--color-danger-ink);
  }
  .success {
    background: var(--color-success-surface);
    color: var(--color-success-ink);
  }
  .success strong {
    color: var(--color-success-ink);
  }
</style>
