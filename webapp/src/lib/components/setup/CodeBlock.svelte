<script lang="ts">
  let { label, code }: { label: string; code: string } = $props();
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 1600);
    } catch {
      copied = false;
    }
  }
</script>

<figure class="cb">
  <figcaption>
    <span>{label}</span>
    <button type="button" onclick={copy} aria-label={`Copy ${label}`}
      >{copied ? "Copied" : "Copy"}</button
    >
  </figcaption>
  <pre><code>{code}</code></pre>
</figure>

<style>
  .cb {
    min-width: 0;
    margin: 0;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    overflow: hidden;
  }
  figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 6px 0 14px;
    color: var(--color-subtle);
    font-size: 12px;
    letter-spacing: 0.03em;
  }
  button {
    padding: 4px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-muted);
    font: 400 12px/18px var(--font-sans);
  }
  button:hover:enabled {
    transform: none;
    background: var(--color-control);
    color: var(--color-ink);
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 1px;
  }
  pre {
    margin: 0;
    padding: 8px 14px 14px;
    overflow-x: auto;
    color: var(--color-code-ink);
    font:
      400 13px/1.7 ui-monospace,
      "SF Mono",
      Menlo,
      monospace;
  }
</style>
