<script lang="ts">
  import StudioDialog from "./StudioDialog.svelte";

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();
</script>

<StudioDialog
  {open}
  {onclose}
  title="Changelog"
  description="Changes available in this build. V1 remains in development."
>
  <div class="studio-dialog-body">
    <h3>2026-10-03</h3>
    <ul>
      <li>Added timeline mini-map navigation and synchronized playback progress.</li>
      <li>Added audio preview and simulated waveform displays without hardware.</li>
      <li>Added hardware-neutral setup guidance, Arduino IDE instructions, repository access, and this changelog.</li>
      <li>Prepared static builds and the GitHub Pages deployment workflow.</li>
    </ul>
    <h3>2026-10-02</h3>
    <ul>
      <li>Added pulse envelope node editing and reusable browser pulse presets.</li>
    </ul>
    <p>Simulated output is approximate. Hardware playback still requires connection and calibration.</p>
  </div>
</StudioDialog>
