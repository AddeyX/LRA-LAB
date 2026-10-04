<script lang="ts" generics="T extends string">
  let {
    label,
    options,
    value,
    onchange,
    size = "md",
  }: {
    label: string;
    options: readonly { value: T; label: string }[];
    value: T;
    onchange: (value: T) => void;
    size?: "sm" | "md";
  } = $props();
</script>

<div class="seg {size}" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.value}
      class:on={value === option.value}
      onclick={() => onchange(option.value)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .seg {
    display: inline-flex;
    flex: none;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-control);
    background: var(--color-control);
  }
  button {
    min-height: 34px;
    padding: 6px 14px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-muted);
    font: 400 14px/20px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .sm button {
    min-height: 38px;
    padding: 6px 10px;
    font-size: 13px;
  }
  button:hover:enabled {
    transform: none;
    color: var(--color-ink);
  }
  button.on {
    background: var(--color-surface-raised);
    color: var(--color-ink);
    box-shadow: 0 1px 2px var(--color-shadow-action);
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 1px;
  }
</style>
