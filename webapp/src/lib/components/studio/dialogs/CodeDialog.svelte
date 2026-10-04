<script lang="ts">
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    code,
    validation,
    onclose,
    ondownload,
    onerror,
  }: {
    open: boolean;
    code: string;
    validation: string | null;
    onclose: () => void;
    ondownload: () => void;
    onerror: (message: string) => void;
  } = $props();
  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      onerror("Clipboard blocked. Select code and copy it manually.");
    }
  }
</script>

<StudioDialog
  {open}
  {onclose}
  title="Generate Code"
  description="Arduino C++ for your current signature."
>
  <div class="studio-dialog-body code-dialog">
    {#if validation}<div class="code-placeholder">
        {validation}
      </div>{:else}<pre><code>{code}</code></pre>{/if}
    <div class="dialog-actions">
      <button onclick={onclose}>Close</button><button
        onclick={copy}
        disabled={!!validation}>{copied ? "Copied ✓" : "Copy"}</button
      ><button
        class="dialog-primary"
        onclick={ondownload}
        disabled={!!validation}>Download .cpp ↓</button
      >
    </div>
  </div>
</StudioDialog>
