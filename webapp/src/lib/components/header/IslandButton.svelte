<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import RollText from "./RollText.svelte";

  let { text, ...rest }: { text: string } & HTMLButtonAttributes = $props();
</script>

<button class="island-cta" {...rest}><RollText {text} /></button>

<style>
  .island-cta {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    padding: 9px 16px;
    border: 0;
    border-radius: 10px;
    overflow: hidden;
    background: var(--color-action);
    color: var(--color-action-ink);
    font: 400 16px/21px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
    transition: color 0.35s var(--ease-butter);
  }
  .island-cta::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--color-accent);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.45s var(--ease-butter);
  }
  .island-cta:hover:enabled,
  .island-cta:focus-visible {
    transform: none;
    color: var(--color-ink);
  }
  .island-cta:hover:enabled::before,
  .island-cta:focus-visible::before {
    transform: scaleY(1);
  }
  .island-cta:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
</style>
