<script lang="ts">
  import { untrack } from "svelte";
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    name,
    onclose,
    onsave,
  }: {
    open: boolean;
    name: string;
    onclose: () => void;
    onsave: (name: string) => void;
  } = $props();
  let draft = $state("");
  $effect.pre(() => {
    if (open) draft = untrack(() => name);
  });
</script>

<StudioDialog
  {open}
  {onclose}
  title="Save project"
  description="Keep this signature in your browser."
>
  <div class="studio-dialog-body">
    <label class="dialog-label" for="project-name">PROJECT NAME</label><input
      id="project-name"
      class="dialog-input"
      bind:value={draft}
      maxlength="80"
      onkeydown={(event) => {
        if (event.key === "Enter") onsave(draft);
      }}
    />
    <p>Stored in this browser profile. Use Save As for a portable JSON file.</p>
    <div class="dialog-actions">
      <button onclick={onclose}>Cancel</button><button
        class="dialog-primary"
        onclick={() => onsave(draft)}
        disabled={!draft.trim()}>Save project</button
      >
    </div>
  </div>
</StudioDialog>
