<script lang="ts">
  import { browser, dev } from "$app/environment";
  import { Agentation } from "sv-agentation";
  import DarkVeil from "$lib/components/DarkVeil.svelte";
  import "../app.css";
  let { children } = $props();
</script>

<div class="site-frame">
  <div class="app-background" aria-hidden="true">
    <div class="veil">
      <DarkVeil blueTint speed={0.25} resolutionScale={0.75} />
    </div>
  </div>

  <div class="app-shell">
    <aside class="rail">
      <div class="brand-mark">H<span>·</span></div>
      <div class="rail-word">STUDIO / 01</div>
      <div class="rail-bottom">LRA<br />LAB</div>
    </aside>
    <div class="layout-body">
      <div class="layout-page">{@render children()}</div>
      <div class="layout-footer">
        <footer>
          <span>LRA LAB</span><span>AddeyX</span><span>LOCAL BY DESIGN</span>
        </footer>
      </div>
    </div>
  </div>
</div>

{#if dev && browser}
  <Agentation workspaceRoot={import.meta.env.VITE_WORKSPACE_ROOT ?? "."} />
{/if}

<style>
  .site-frame {
    position: relative;
    isolation: isolate;
    min-height: 100svh;
  }
  .layout-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 100svh;
  }
  .layout-page {
    flex: 1;
    min-width: 0;
  }
  .layout-footer {
    width: 100%;
    max-width: 1700px;
    margin-inline: auto;
    padding-inline: clamp(25px, 3.8vw, 70px);
  }
  @media (max-width: 760px) {
    .layout-footer {
      padding-inline: 18px;
    }
  }
</style>
