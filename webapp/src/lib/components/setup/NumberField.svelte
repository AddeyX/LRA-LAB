<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    unit,
    value = $bindable(),
    error,
    hint,
    step = "any",
    min,
    max,
    placeholder,
    after,
  }: {
    label: string;
    unit?: string;
    value: number | null | undefined;
    error?: string;
    hint?: string;
    step?: number | "any";
    min?: number;
    max?: number;
    placeholder?: string;
    after?: Snippet;
  } = $props();
  const id = $props.id();
  let touched = $state(false);
  let showError = $derived(
    Boolean(error) && (touched || (value !== null && value !== undefined)),
  );
</script>

<div class="nf" class:invalid={showError}>
  <label for={id}>{label}</label>
  <div class="nf-row">
    <div class="nf-box">
      <input
        {id}
        type="number"
        inputmode="decimal"
        {step}
        {min}
        {max}
        {placeholder}
        bind:value
        onblur={() => (touched = true)}
        aria-invalid={showError}
        aria-describedby={`${id}-help`}
      />
      {#if unit}<span class="nf-unit" aria-hidden="true">{unit}</span>{/if}
    </div>
    {#if after}{@render after()}{/if}
  </div>
  <p id={`${id}-help`} class:nf-error={showError}>
    {showError ? error : (hint ?? "")}
  </p>
</div>

<style>
  .nf {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  label {
    color: var(--color-muted);
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .nf-row {
    display: flex;
    gap: 6px;
  }
  .nf-box {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  input {
    width: 100%;
    height: 44px;
    padding: 0 52px 0 12px;
    border: 0;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font: 400 16px/1 var(--font-sans);
    font-variant-numeric: tabular-nums;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }
  input::placeholder {
    color: var(--color-inactive);
  }
  input:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 0;
  }
  .invalid input {
    box-shadow: inset 0 0 0 1px var(--color-danger);
  }
  .nf-unit {
    position: absolute;
    top: 50%;
    right: 12px;
    color: var(--color-subtle);
    font-size: 13px;
    transform: translateY(-50%);
    pointer-events: none;
  }
  p {
    min-height: 18px;
    margin: 0;
    color: var(--color-subtle);
    font-size: 12px;
    line-height: 1.5;
  }
  p.nf-error {
    color: var(--color-danger);
  }
</style>
