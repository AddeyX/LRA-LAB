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
  {@render children()}
</Dialog>
