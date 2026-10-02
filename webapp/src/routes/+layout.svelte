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

  {@render children()}
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
</style>
