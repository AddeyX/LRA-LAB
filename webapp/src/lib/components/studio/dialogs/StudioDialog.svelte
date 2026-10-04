<script lang="ts">
  import { Dialog } from "portal-bits";
  import type { Snippet } from "svelte";

  let {
    open,
    title,
    description = "",
    onclose,
    children,
  }: {
    open: boolean;
    title: string;
    description?: string;
    onclose: () => void;
    children: Snippet;
  } = $props();
</script>

<Dialog
  bind:open={
    () => open,
    (next) => {
      if (!next) onclose();
    }
  }
  {title}
  {description}
  theme="dark"
>
  <div data-studio-dialog-body>
    {@render children()}
  </div>
</Dialog>

<style>
  /* The body marker scopes these Portal chrome styles to studio dialogs. */
  :global {
    .p-dialog:has([data-studio-dialog-body]) {
      width: min(var(--spacing-dialog), calc(100vw - var(--spacing) * 8));
      max-height: calc(100dvh - var(--spacing) * 8);
      padding: 0;
      overflow: auto;
      border: 1px solid var(--color-line);
      border-radius: var(--radius-island);
      background: var(--color-surface);
      color: var(--color-ink);
      box-shadow: var(--shadow-dialog);
      font-family: var(--font-sans);
      scrollbar-color: var(--color-strong-line) transparent;

      .p-dialog-heading {
        align-items: flex-start;
        gap: calc(var(--spacing) * 4);
        padding: calc(var(--spacing) * 6) calc(var(--spacing) * 7) 0;
      }

      .p-title {
        min-width: 0;
        padding-block: calc(var(--spacing) * 1.25);
        font: 600 var(--text-size-26)/1.2 var(--font-display);
        letter-spacing: -0.03em;
        overflow-wrap: anywhere;
        text-wrap: balance;
      }

      .p-description {
        margin: 0;
        padding: calc(var(--spacing) * 2) calc(var(--spacing) * 7)
          calc(var(--spacing) * 6);
        color: var(--color-secondary);
        font: 400 var(--text-size-14)/1.6 var(--font-sans);
      }

      .p-icon-button {
        width: calc(var(--spacing) * 10);
        height: calc(var(--spacing) * 10);
        min-height: calc(var(--spacing) * 10);
        padding: 0;
        flex: none;
        border: 0;
        border-radius: var(--radius-control);
        background: var(--color-surface-raised);
        color: var(--color-ink);
        box-shadow: none;
      }

      .p-icon-button:hover {
        background: var(--color-action);
        color: var(--color-action-ink);
        transform: none;
      }

      .p-icon-button svg {
        width: calc(var(--spacing) * 4.5);
        height: calc(var(--spacing) * 4.5);
        flex: none;
      }

      .p-dialog-body {
        margin-top: calc(var(--spacing) * 6);
        padding: calc(var(--spacing) * 6) calc(var(--spacing) * 7)
          calc(var(--spacing) * 7);
        border-top: 1px solid var(--color-line);
        background: var(--color-canvas);
      }

      .p-description + .p-dialog-body {
        margin-top: 0;
      }

      .dialog-actions button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: calc(var(--spacing) * 2);
        min-height: calc(var(--spacing) * 9);
        padding: calc(var(--spacing) * 2.25) calc(var(--spacing) * 3.5);
        border: 0;
        border-radius: var(--radius-control);
        background: var(--color-surface-raised);
        color: var(--color-ink);
        font: 400 var(--text-size-14)/20px var(--font-sans);
        letter-spacing: 0.02em;
      }

      .dialog-actions button:hover:enabled {
        transform: none;
        background: var(--color-action);
        color: var(--color-action-ink);
      }

      .dialog-actions .dialog-primary {
        padding: calc(var(--spacing) * 2.25) calc(var(--spacing) * 4);
        background: var(--color-action);
        color: var(--color-action-ink);
        font: 400 var(--text-size-15)/1 var(--font-sans);
      }

      .dialog-actions .dialog-primary:hover:enabled {
        background: var(--color-accent);
        color: var(--color-ink);
      }

      .dialog-actions .dialog-danger {
        color: var(--color-danger);
      }

      .dialog-actions .dialog-danger:hover:enabled {
        background: var(--color-danger-surface);
        color: var(--color-danger);
      }

      .dialog-actions button:disabled {
        opacity: 1;
        background: var(--color-control);
        color: var(--color-subtle);
      }

      :focus-visible {
        outline: var(--outline-width-focus) solid var(--color-accent-bright);
        outline-offset: var(--outline-offset-focus);
      }

      ::selection {
        background: var(--color-accent-soft);
        color: var(--color-ink);
      }

      input {
        caret-color: var(--color-accent-bright);
      }
    }

    @media (max-width: 30rem) {
      .p-dialog:has([data-studio-dialog-body]) {
        .p-dialog-heading {
          padding: calc(var(--spacing) * 5) calc(var(--spacing) * 5) 0;
        }

        .p-description {
          padding-inline: calc(var(--spacing) * 5);
        }

        .p-dialog-body {
          padding: calc(var(--spacing) * 5);
        }

        .p-title {
          font-size: var(--text-size-24);
        }
      }
    }
  }
</style>
