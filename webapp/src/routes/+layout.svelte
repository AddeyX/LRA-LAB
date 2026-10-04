<script lang="ts">
  import { browser, dev } from "$app/environment";
  import { Agentation } from "sv-agentation";
  import "../app.css";
  let { children } = $props();
</script>

<div class="lab-frame">
  <div class="lab-page">{@render children()}</div>
  <footer class="lab-footer">
    <span>LRA Lab</span><span>Local by design</span>
  </footer>
</div>

{#if dev && browser}
  <Agentation workspaceRoot={import.meta.env.VITE_WORKSPACE_ROOT ?? "."} />
{/if}

<style>
  :global(html) {
    color-scheme: light;
    overscroll-behavior: none;
  }
  .lab-frame {
    display: flex;
    flex-direction: column;
    min-height: 100svh;
    background: var(--color-canvas);
  }
  .lab-page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .lab-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 32px
      max(var(--spacing-page-gutter), calc((100% - var(--spacing-content)) / 2));
    color: var(--color-subtle);
    font: 400 13px/24px var(--font-sans);
    letter-spacing: 0.03em;
  }
  @media (min-width: 62.5rem) {
    .lab-frame:has(:global(.lab-grid)) {
      height: 100svh;
      min-height: 36rem;
    }
    .lab-frame:has(:global(.lab-grid)) .lab-page {
      min-height: 0;
    }
    .lab-frame:has(:global(.lab-grid)) .lab-footer {
      padding-block: 16px;
    }
  }
</style>
