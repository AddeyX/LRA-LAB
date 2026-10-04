<script lang="ts">
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    onclose,
    ondiscard,
    onsave,
  }: {
    open: boolean;
    onclose: () => void;
    ondiscard: () => void;
    onsave: () => void;
  } = $props();
</script>

<StudioDialog
  {open}
  {onclose}
  title="Start new signature?"
  description="Current changes are not saved to a browser project."
>
  <div class="studio-dialog-body">
    <p>Save these changes before clearing the canvas?</p>
    <div class="dialog-actions">
      <button onclick={onclose}>Cancel</button>
      <button class="dialog-danger" onclick={ondiscard}>Don't Save</button>
      <button class="dialog-primary" onclick={onsave}>Save changes</button>
    </div>
  </div>
</StudioDialog>
