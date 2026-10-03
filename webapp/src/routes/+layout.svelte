<script lang="ts">
  import { browser, dev } from "$app/environment";
  import { Agentation } from "sv-agentation";
  import DarkVeil from "$lib/components/DarkVeil.svelte";
  import "../app.css";
  let { children } = $props();
</script>

<div class="site-frame relative isolate min-h-svh">
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
    <div class="layout-body flex min-w-0 min-h-svh flex-col">
      <div class="layout-page min-w-0 flex-1">{@render children()}</div>
      <div
        class="layout-footer mx-auto w-full max-w-content px-page-gutter max-studio:px-page-gutter-mobile"
      >
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
