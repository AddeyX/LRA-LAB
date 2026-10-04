<script lang="ts">
  import type { Snippet } from "svelte";
  import { resolve } from "$app/paths";
  import LabLogo from "./LabLogo.svelte";

  let {
    project,
    dirty,
    onhome,
    file,
    center,
    actions,
  }: {
    project: string;
    dirty: boolean;
    onhome: () => void;
    file: Snippet<[HTMLElement | null]>;
    center: Snippet;
    actions: Snippet<[HTMLElement | null]>;
  } = $props();
  let left = $state<HTMLElement | null>(null);
  let right = $state<HTMLElement | null>(null);
</script>

<header class="lab-header">
  <div class="island island-left" bind:this={left}>
    <a
      class="island-home"
      href={resolve("/")}
      aria-label="LRA Lab studio"
      onclick={(event) => {
        event.preventDefault();
        onhome();
      }}><LabLogo /></a
    >
    <nav class="island-nav" aria-label="Project">
      {@render file(left)}
      <span class="island-project" title={project}
        >{project}{#if dirty}<i aria-label="Unsaved changes"></i>{/if}</span
      >
    </nav>
  </div>
  <div class="island-center">{@render center()}</div>
  <div class="island island-right" bind:this={right}>
    {@render actions(right)}
  </div>
</header>

<style>
  .lab-header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: start;
    gap: 16px;
    padding: 24px
      max(var(--spacing-page-gutter), calc((100% - var(--spacing-content)) / 2))
      20px;
    background: linear-gradient(
      to bottom,
      var(--color-canvas) 82%,
      color-mix(in srgb, var(--color-canvas) 0%, transparent)
    );
  }
  .island {
    display: flex;
    align-items: center;
    min-height: var(--spacing-island);
    border-radius: var(--radius-island);
    background: var(--color-surface);
    color: var(--color-ink);
  }
  .island-left {
    justify-self: start;
    gap: 40px;
    min-width: 0;
    max-width: 100%;
    padding: 0 22px;
  }
  .island-right {
    justify-self: end;
    gap: 16px;
    min-height: 60px;
    margin-top: 2px;
    padding: 10px 12px 10px 22px;
  }
  .island-home {
    display: inline-flex;
    flex: none;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
  }
  .island-home:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 4px;
  }
  .island-nav {
    display: flex;
    align-items: center;
    gap: 25px;
    min-width: 0;
  }
  .island-project {
    min-width: 0;
    max-width: 260px;
    overflow: hidden;
    color: var(--color-muted);
    font: 400 16px/20px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .island-project i {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-inline-start: 8px;
    vertical-align: middle;
    border-radius: 50%;
    background: var(--color-accent);
  }
  .island-center {
    display: flex;
    justify-content: center;
    padding-top: 6px;
  }
  @media (max-width: 62.5rem) {
    .island-left {
      gap: 24px;
    }
    .island-project {
      max-width: 160px;
    }
  }
  @media (max-width: 45rem) {
    .lab-header {
      grid-template-columns: minmax(0, 1fr) auto;
      padding-top: 12px;
      gap: 10px;
    }
    .island-center {
      grid-column: 1 / -1;
      grid-row: 2;
      padding-top: 0;
    }
    .island-project {
      display: none;
    }
    .island-left {
      padding: 0 18px;
    }
  }
</style>
