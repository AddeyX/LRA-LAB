<script lang="ts">
  import { EXAMPLE_PINS, MAX_PIN, type PinResult } from "$lib/lra-profile";
  import type { SetupState } from "$lib/setup.svelte";
  import Note from "../Note.svelte";
  import NumberField from "../NumberField.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    setup,
    result,
    done,
  }: {
    index: number;
    setup: SetupState;
    result: PinResult;
    done: boolean;
  } = $props();

  const gpio = (value: number | null | undefined, valid: boolean) =>
    valid && typeof value === "number" ? `GPIO${value}` : "GPIO —";
  let wires = $derived([
    { from: gpio(setup.pins.sda, !result.errors.sda), to: "SDA", tone: "data" },
    { from: gpio(setup.pins.scl, !result.errors.scl), to: "SCL", tone: "clock" },
    { from: "3V3 or 5V", to: "VIN", tone: "power" },
    { from: "GND", to: "GND", tone: "ground" },
  ]);
</script>

<SetupSection
  id="setup-wiring"
  {index}
  title="Wire the driver"
  lead="Choose two free GPIO pins for I²C and connect the driver. Check your board's pinout, and avoid pins used for flash, PSRAM, boot strapping or USB."
  {done}
>
  <div class="fields">
    <NumberField
      label="SDA pin"
      unit="GPIO"
      bind:value={setup.pins.sda}
      error={result.errors.sda}
      step={1}
      min={0}
      max={MAX_PIN}
      placeholder="4"
    />
    <NumberField
      label="SCL pin"
      unit="GPIO"
      bind:value={setup.pins.scl}
      error={result.errors.scl}
      step={1}
      min={0}
      max={MAX_PIN}
      placeholder="5"
    />
    <div class="example">
      <SetupButton
        variant="ghost"
        onclick={() => (setup.pins = { ...EXAMPLE_PINS })}
        >Use GPIO4 and GPIO5</SetupButton
      >
    </div>
  </div>

  <div class="map" role="table" aria-label="Wiring map">
    <div class="map-head" role="row">
      <span role="columnheader">ESP32</span>
      <span aria-hidden="true"></span>
      <span role="columnheader">DRV2605L</span>
    </div>
    {#each wires as wire (wire.to)}
      <div class="wire {wire.tone}" role="row">
        <b role="cell">{wire.from}</b>
        <i aria-hidden="true"></i>
        <b role="cell">{wire.to}</b>
      </div>
    {/each}
    <div class="map-head lra" role="row">
      <span role="columnheader">DRV2605L</span>
      <span aria-hidden="true"></span>
      <span role="columnheader">LRA</span>
    </div>
    <div class="wire motor" role="row">
      <b role="cell">OUT+ / OUT−</b>
      <i aria-hidden="true"></i>
      <b role="cell">Both leads</b>
    </div>
  </div>

  <Note title="Before you power up">
    <p>
      Power the driver within its board's rated range and share ground with
      the ESP32. LRAs have no polarity, so either lead can go to OUT+.
    </p>
  </Note>
</SetupSection>

<style>
  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 180px)) 1fr;
    align-items: start;
    gap: 4px 12px;
  }
  .example {
    padding-top: 24px;
  }
  .map {
    display: grid;
    gap: 6px;
    max-width: 520px;
    padding: 16px;
    border-radius: var(--radius-panel);
    background: var(--color-surface-soft);
  }
  .map-head,
  .wire {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: center;
    gap: 10px;
  }
  .map-head {
    color: var(--color-subtle);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .map-head span:last-child {
    text-align: end;
  }
  .map-head.lra {
    margin-top: 10px;
  }
  .wire b {
    padding: 8px 12px;
    border-radius: var(--radius-field);
    background: var(--color-surface-raised);
    font: 500 14px/1.2 var(--font-sans);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .wire b:last-child {
    text-align: end;
  }
  .wire i {
    height: 3px;
    border-radius: 2px;
    background: var(--wire);
  }
  .data {
    --wire: var(--color-accent);
  }
  .clock {
    --wire: var(--color-butter);
  }
  .power {
    --wire: var(--color-danger);
  }
  .ground {
    --wire: var(--color-ink);
  }
  .motor {
    --wire: var(--color-success);
  }
  @media (max-width: 45rem) {
    .fields {
      grid-template-columns: 1fr 1fr;
    }
    .example {
      grid-column: 1 / -1;
      padding-top: 0;
    }
  }
</style>
