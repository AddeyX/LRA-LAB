<script lang="ts">
  import { Button } from "portal-bits";

  let {
    connected,
    calibrated,
    busy,
    notice,
    error,
    onConnect,
    onCalibrate,
    onExit,
  }: {
    connected: boolean;
    calibrated: boolean;
    busy: boolean;
    notice: string;
    error: string;
    onConnect: () => Promise<void>;
    onCalibrate: () => Promise<void>;
    onExit: () => void;
  } = $props();

  let step = $state(0);
  let reached = $state(0);
  const steps = [
    "Hardware",
    "Wiring",
    "Firmware",
    "Browser",
    "Connect",
    "Calibrate",
    "Ready",
  ];
  let canAdvance = $derived(
    step < 4 || (step === 4 && connected) || (step === 5 && calibrated),
  );
  function advance() {
    if (!canAdvance) return;
    step += 1;
    reached = Math.max(reached, step);
  }
</script>

<div class="setup-view">
  <div class="hero setup-heading">
    <div>
      <p class="kicker">02 / SETUP</p>
      <h1>Make it <em>tangible.</em></h1>
      <p class="hero-copy">Bring your LRA online, one step at a time.</p>
    </div>
    <button class="setup-exit" onclick={onExit}
      >Back to studio <span aria-hidden="true">↗</span></button
    >
  </div>
  <div class="setup-layout">
    <nav class="setup-steps" aria-label="Setup steps">
      {#each steps as title, index (title)}
        <button
          class:current={step === index}
          class:completed={step > index}
          disabled={index > reached}
          onclick={() => (step = index)}
          aria-current={step === index ? "step" : undefined}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>{title}
        </button>
      {/each}
    </nav>
    <section class="setup-panel" aria-live="polite">
      <div class="setup-progress">
        <span>STEP {String(step + 1).padStart(2, "0")} / 07</span>
        <div>
          <i style:transform={`scaleX(${(step + 1) / steps.length})`}></i>
        </div>
      </div>
      {#if step === 0}
        <h2>Know your actuator.</h2>
        <p>
          Gather an ESP32-C3, DRV2605L driver, LRA, USB data cable, and suitable
          power source. Check LRA rated voltage and maximum drive limits against
          firmware defaults before connecting power.
        </p>
        <div class="setup-note">
          <strong>Firmware defaults</strong><span
            >Rated voltage: 0x32 · Overdrive clamp: 0x4F · Drive time: 0x18.
            These are register values, not a universal actuator rating.</span
          >
        </div>
      {:else if step === 1}
        <h2>Wire the driver.</h2>
        <p>
          Connect ESP32-C3 GPIO4 to DRV2605L SDA, GPIO5 to SCL, and board ground
          to driver ground. Connect LRA to driver output terminals. Follow your
          board and driver power requirements.
        </p>
        <div class="setup-pinmap">
          <div><span>ESP32-C3</span><b>GPIO4</b><span>→</span><b>SDA</b></div>
          <div><span>ESP32-C3</span><b>GPIO5</b><span>→</span><b>SCL</b></div>
          <div><span>COMMON</span><b>GND</b><span>→</span><b>GND</b></div>
        </div>
      {:else if step === 2}
        <h2>Flash matching firmware.</h2>
        <p>
          Open this project’s <code>firmware/</code> folder in PlatformIO. Build and
          upload to your ESP32-C3. Current profile uses DRV2605L library 6 and a 170
          Hz target LRA.
        </p>
        <div class="setup-command">
          <code>pio run</code><code>pio run --target upload</code>
        </div>
        <p class="setup-small">
          Select correct upload port if PlatformIO cannot detect it. Studio does
          not flash firmware.
        </p>
      {:else if step === 3}
        <h2>Prepare your browser.</h2>
        <p>
          Use desktop Chrome or Edge on localhost. Close PlatformIO serial
          monitor and other apps holding the board’s USB port. Keep USB data
          cable connected.
        </p>
        <div class="setup-note">
          <strong>Port permission</strong><span
            >Your browser asks you to choose a serial port when you connect.
            Select your ESP32-C3.</span
          >
        </div>
      {:else if step === 4}
        <h2>Connect the board.</h2>
        <p>
          Choose your ESP32-C3 in the browser’s port picker. Studio checks
          firmware and driver compatibility.
        </p>
        <div class="setup-action">
          <Button
            variant="primary"
            onclick={onConnect}
            disabled={busy || connected}
            >{connected
              ? "Board connected ✓"
              : busy
                ? "Connecting…"
                : "Connect board ↗"}</Button
          ><span>{notice}</span>
        </div>
      {:else if step === 5}
        <h2>Calibrate your LRA.</h2>
        <p>
          Calibration measures actuator response for this hardware profile. Keep
          actuator mounted as it will be used, then run calibration.
        </p>
        <div class="setup-action">
          <Button
            variant="primary"
            onclick={onCalibrate}
            disabled={busy || !connected || calibrated}
            >{calibrated
              ? "Calibrated ✓"
              : busy
                ? "Calibrating…"
                : "Calibrate LRA ↗"}</Button
          ><span>{notice}</span>
        </div>
      {:else}
        <h2>
          {connected && calibrated
            ? "Ready to feel it."
            : "Reconnect to continue."}
        </h2>
        <p>
          {connected && calibrated
            ? "Board connected and calibrated. Return to studio, add an effect or pulse, then preview your signature."
            : "Connection or calibration changed. Return to Connect and Calibrate before preview."}
        </p>
        {#if connected && calibrated}<div class="setup-ready">
            <span class="status-dot online"></span> ESP32-C3 · DRV2605L · LRA ready
          </div>{/if}
      {/if}
      {#if error && (step === 4 || step === 5)}<div
          class="setup-error"
          role="alert"
        >
          {error}
        </div>{/if}
      <div class="setup-nav">
        <button onclick={() => (step -= 1)} disabled={step === 0}
          >← Previous</button
        >{#if step < steps.length - 1}<button
            class="setup-next"
            onclick={advance}
            disabled={!canAdvance}>Next step →</button
          >{:else}<button class="setup-next" onclick={onExit}
            >Open studio →</button
          >{/if}
      </div>
    </section>
  </div>
</div>

<style>
  .setup-view {
    padding-inline: max(
      var(--spacing-page-gutter),
      calc((100% - var(--spacing-content)) / 2)
    );
  }
  .setup-heading {
    min-height: 0;
    padding: 24px 0 36px;
  }
  .setup-heading h1 {
    font: 400 clamp(48px, 7vw, 96px) / 0.95 var(--font-sans);
    letter-spacing: -0.035em;
  }
  .setup-heading h1 em {
    color: var(--color-ink);
    background: linear-gradient(
      to top,
      var(--color-butter) 0 0.22em,
      transparent 0.22em
    );
  }
  .setup-heading .kicker {
    color: var(--color-muted);
    font: 400 13px/24px var(--font-sans);
    letter-spacing: 0.03em;
  }
  .setup-heading .hero-copy {
    margin-top: 16px;
    color: var(--color-muted);
  }
  .setup-exit {
    border: 0;
    border-radius: 10px;
    background: var(--color-surface);
  }
  .setup-exit:hover {
    transform: none;
    background: var(--color-surface-soft);
  }
  .setup-layout {
    gap: 12px;
  }
  .setup-steps {
    gap: 2px;
    padding: 12px;
    border-radius: var(--radius-card);
    background: var(--color-surface);
    align-self: start;
  }
  .setup-steps button {
    border: 0;
    border-radius: 14px;
    color: var(--color-muted);
  }
  .setup-steps button:hover:enabled {
    transform: none;
    color: var(--color-ink);
  }
  .setup-steps button span {
    font: 400 12px var(--font-sans);
    color: var(--color-subtle);
  }
  .setup-steps button.current {
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  .setup-steps button.current span {
    color: var(--color-ink);
  }
  .setup-steps button.completed {
    color: var(--color-ink);
  }
  .setup-steps button.completed span {
    color: var(--color-success);
  }
  .setup-panel {
    border: 0;
    border-radius: var(--radius-card);
    box-shadow: none;
  }
  .setup-progress {
    font: 400 13px var(--font-sans);
    letter-spacing: 0.03em;
    color: var(--color-muted);
  }
  .setup-progress > div {
    border-radius: 2px;
    background: var(--color-control-hover);
  }
  .setup-progress i {
    background: var(--color-ink);
  }
  .setup-panel h2 {
    font: 500 clamp(30px, 3vw, 44px) / 1.1 var(--font-sans);
    letter-spacing: -0.025em;
  }
  .setup-panel code {
    color: var(--color-ink);
    font-weight: 600;
  }
  .setup-note,
  .setup-command {
    border: 0;
    border-radius: 16px;
    background: var(--color-surface-raised);
  }
  .setup-nav button {
    border: 0;
    border-radius: 10px;
    background: var(--color-surface-raised);
  }
  .setup-nav button:hover:enabled {
    transform: none;
  }
  .setup-nav .setup-next {
    background: var(--color-action);
    color: var(--color-action-ink);
    font-weight: 400;
  }
  .setup-nav .setup-next:hover:enabled {
    background: var(--color-accent);
    color: var(--color-ink);
  }
  @media (max-width: 47.5rem) {
    .setup-steps {
      padding: 8px;
      margin-inline: 0;
    }
  }
</style>
