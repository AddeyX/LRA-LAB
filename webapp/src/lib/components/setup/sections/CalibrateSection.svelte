<script lang="ts">
  import Note from "../Note.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    connected,
    calibrated,
    calibrating,
    busy,
    error,
    oncalibrate,
    ongoto,
  }: {
    index: number;
    connected: boolean;
    calibrated: boolean;
    calibrating: boolean;
    busy: boolean;
    error: string;
    oncalibrate: () => void;
    ongoto: (id: "connect") => void;
  } = $props();
</script>

<SetupSection
  id="setup-calibrate"
  {index}
  title="Calibrate your LRA"
  lead="Calibration measures how your actuator responds, so the driver can track its resonance. Mount the LRA the way you'll use it: a loose actuator on a desk responds differently."
  done={calibrated}
>
  <div class="action">
    {#if calibrated}
      <span class="chip"><i></i>Calibration passed</span>
      <SetupButton variant="ghost" onclick={oncalibrate} disabled={busy}
        >Run again</SetupButton
      >
    {:else}
      <SetupButton
        variant="primary"
        size="lg"
        onclick={oncalibrate}
        disabled={busy || !connected}
        >{calibrating ? "Calibrating…" : "Calibrate LRA"}</SetupButton
      >
      {#if calibrating}<span class="hint">Takes about a second. Keep it still.</span>{/if}
    {/if}
  </div>
  {#if !connected}
    <Note title="Connect first">
      <p>Calibration runs on the board, so it needs a live connection.</p>
    </Note>
    <div>
      <SetupButton onclick={() => ongoto("connect")}>Go to connect</SetupButton>
    </div>
  {/if}
  {#if error}
    <Note tone="danger" title="Calibration didn't pass" role="alert">
      <p>{error}</p>
    </Note>
  {/if}
</SetupSection>

<style>
  .action {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    min-height: 48px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    background: var(--color-success-surface);
    color: var(--color-success-ink);
    font-size: 14px;
  }
  .chip i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-success);
  }
  .hint {
    color: var(--color-muted);
    font-size: 13px;
  }
</style>
