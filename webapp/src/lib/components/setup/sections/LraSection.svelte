<script lang="ts">
  import {
    DATASHEET_URL,
    EXAMPLE_LRA,
    hex,
    type LraResult,
  } from "$lib/lra-profile";
  import type { SetupState } from "$lib/setup.svelte";
  import Note from "../Note.svelte";
  import NumberField from "../NumberField.svelte";
  import Segmented from "../Segmented.svelte";
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
    result: LraResult;
    done: boolean;
  } = $props();

  let profile = $derived(result.profile);
  let tiles = $derived([
    {
      name: "RATED_VOLTAGE",
      code: profile && hex(profile.ratedVoltage),
      detail: profile && `${profile.ratedVrms.toFixed(2)} V RMS steady state`,
    },
    {
      name: "CLAMP_VOLTAGE",
      code: profile && hex(profile.clampVoltage),
      detail: profile && `${profile.clampVpeak.toFixed(2)} V peak overdrive`,
    },
    {
      name: "DRIVE_TIME",
      code: profile && hex(profile.driveTime),
      detail:
        profile &&
        `${profile.driveTimeMs.toFixed(1)} ms · half period ${profile.halfPeriodMs.toFixed(2)} ms`,
    },
  ]);
</script>

<SetupSection
  id="setup-lra"
  {index}
  title="Describe your LRA"
  lead="Copy three values from your actuator's datasheet. LRA Lab turns them into DRV2605L register settings and builds them into your firmware."
  {done}
>
  <div class="fields">
    <NumberField
      label="Rated voltage"
      unit="V RMS"
      bind:value={setup.lra.ratedVrms}
      error={result.errors.ratedVrms}
      hint="Rated or nominal drive voltage, in volts RMS."
      placeholder="1.8"
      min={0}
    />
    <NumberField
      label="Maximum voltage"
      unit={setup.lra.maxConvention === "peak" ? "V peak" : "V RMS"}
      bind:value={setup.lra.maxVoltage}
      error={result.errors.maxVoltage}
      hint="Absolute or overdrive maximum. Check if it's peak or RMS."
      placeholder="2.5"
      min={0}
    >
      {#snippet after()}
        <Segmented
          label="Maximum voltage convention"
          size="sm"
          options={[
            { value: "peak", label: "Peak" },
            { value: "rms", label: "RMS" },
          ]}
          value={setup.lra.maxConvention}
          onchange={(value) => (setup.lra.maxConvention = value)}
        />
      {/snippet}
    </NumberField>
    <NumberField
      label="Resonant frequency"
      unit="Hz"
      bind:value={setup.lra.resonantHz}
      error={result.errors.resonantHz}
      hint="Nominal resonance, for example 170 or 235."
      placeholder="170"
      min={0}
    />
  </div>
  <div class="actions">
    <SetupButton
      variant="ghost"
      onclick={() => (setup.lra = { ...EXAMPLE_LRA })}
      >Use example values (170 Hz LRA)</SetupButton
    >
  </div>

  <div class="out" class:ready={profile} aria-live="polite">
    <div class="out-head">
      <strong>Firmware settings</strong>
      <span>{profile ? "Calculated" : "Waiting for all three values"}</span>
    </div>
    <div class="tiles">
      {#each tiles as tile (tile.name)}
        <div class="tile">
          <span class="tile-name">{tile.name}</span>
          <span class="tile-code">{tile.code ?? "—"}</span>
          <span class="tile-detail">{tile.detail ?? " "}</span>
        </div>
      {/each}
    </div>
  </div>

  {#each result.warnings as warning (warning)}
    <Note tone="warn" title="Check your maximum"><p>{warning}</p></Note>
  {/each}

  <p class="fine">
    Voltages round down, so the drive never exceeds your ratings. Formulas
    follow the <a href={DATASHEET_URL} target="_blank" rel="noopener noreferrer"
      >DRV2605L datasheet ↗</a
    > (equations 5 and 9, and the drive-time register). The output can't exceed
    the driver's supply voltage. These settings don't replace calibration, which
    you run after uploading.
  </p>
</SetupSection>

<style>
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 4px 12px;
  }
  .actions {
    margin-top: -8px;
  }
  .out {
    padding: 16px;
    border-radius: var(--radius-panel);
    background: var(--color-surface-soft);
    transition: background-color 0.3s ease;
  }
  .out.ready {
    background: var(--color-accent-soft);
  }
  .out-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .out-head strong {
    font-weight: 500;
  }
  .out-head span {
    color: var(--color-muted);
    font-size: 13px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
  }
  .tile-name {
    color: var(--color-subtle);
    font-size: 11px;
    letter-spacing: 0.08em;
  }
  .tile-code {
    font: 500 26px/1.1 var(--font-sans);
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .ready .tile-code {
    color: var(--color-accent-bright);
  }
  .tile-detail {
    min-height: 18px;
    color: var(--color-muted);
    font-size: 12px;
  }
  .fine {
    max-width: 68ch;
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .fine a {
    color: var(--color-ink);
  }
</style>
