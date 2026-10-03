<script lang="ts">
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    onclose,
    ondiscard,
  }: {
    open: boolean;
    onclose: () => void;
    ondiscard: () => void;
  } = $props();
</script>

<StudioDialog
  {open}
  {onclose}
  title="Open another project?"
  description="Current unsaved edits will be replaced."
>
  <div class="studio-dialog-body">
    <p>Save current project first if you want to keep these changes.</p>
    <div class="dialog-actions">
      <button onclick={onclose}>Keep editing</button><button
        class="dialog-primary"
        onclick={ondiscard}>Discard edits and open</button
      >
    </div>
  </div>
</StudioDialog>
