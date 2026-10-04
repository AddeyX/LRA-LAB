<script lang="ts">
  import { browser, dev } from "$app/environment";
  import { Agentation } from "sv-agentation";
  import "../app.css";
  let { children } = $props();
</script>

<div class="lab-frame">
  <div class="lab-page">{@render children()}</div>
  <footer class="lab-footer">
    <span>LRA Lab</span>
    <div class="footer-links">
      <span>Local by design</span>
      <a href="https://github.com/AddeyX/LRA-LAB" target="_blank" rel="noopener noreferrer" aria-label="LRA Lab on GitHub" title="LRA Lab on GitHub">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15A10.8 10.8 0 0 1 12 6.16c.96 0 1.92.13 2.82.38 2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" /></svg>
      </a>
    </div>
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
  .footer-links {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .footer-links a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: inherit;
    border-radius: 6px;
  }
  .footer-links a:hover {
    color: var(--color-ink);
  }
  .footer-links svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
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
