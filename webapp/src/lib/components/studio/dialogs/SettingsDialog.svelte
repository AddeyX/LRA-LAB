<script lang="ts">
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    connected,
    calibrated,
    firmwareProfile,
    onclose,
  }: {
    open: boolean;
    connected: boolean;
    calibrated: boolean;
    firmwareProfile: string | null;
    onclose: () => void;
  } = $props();
</script>

<StudioDialog
  {open}
  {onclose}
  title="LRA settings"
  description="Current profile and firmware defaults. Editing arrives with firmware support."
>
  <div class="studio-dialog-body settings-dialog">
    <div class="settings-status">
      <span class:online={connected} class="status-dot"></span><strong
        >{connected ? "Board connected" : "Board offline"}</strong
      ><span
        >{connected
          ? calibrated
            ? "Calibrated"
            : "Needs calibration"
          : "Connect board for live status"}</span
      >
    </div>
    <dl>
      <div>
        <dt>Firmware profile</dt>
        <dd>{firmwareProfile ?? "Connect board to read"}</dd>
      </div>
      <div>
        <dt>Driver</dt>
        <dd>DRV2605L · library 6</dd>
      </div>
      <div>
        <dt>Rated voltage register</dt>
        <dd>0x32</dd>
      </div>
      <div>
        <dt>Overdrive clamp register</dt>
        <dd>0x4F</dd>
      </div>
      <div>
        <dt>Drive time register</dt>
        <dd>0x18</dd>
      </div>
    </dl>
    <p>
      Register values shown are compiled firmware defaults, not live readbacks.
      Check your actuator rating before preview.
    </p>
  </div>
</StudioDialog>
