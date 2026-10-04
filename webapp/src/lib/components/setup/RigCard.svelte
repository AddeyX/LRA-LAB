<script lang="ts" module>
  export type RigItem = {
    key: string;
    label: string;
    value: string;
    state: "ok" | "warn" | "todo";
    step: number;
  };
</script>

<script lang="ts">
  import Card from "$lib/components/studio/Card.svelte";

  let {
    items,
    open,
    ontoggle,
    onselect,
  }: {
    items: RigItem[];
    open: boolean;
    ontoggle: () => void;
    onselect: (step: number) => void;
  } = $props();

  const listId = $props.id();
  let okCount = $derived(items.filter((item) => item.state === "ok").length);
  let complete = $derived(okCount === items.length);
</script>

{#snippet toggle()}
  <button
    type="button"
    class="rig-toggle"
    aria-expanded={open}
    aria-controls={listId}
    aria-label={open ? "Collapse your rig summary" : "Expand your rig summary"}
    title={open ? "Collapse" : "Expand"}
    onclick={ontoggle}
  >
    <svg viewBox="0 0 20 20" aria-hidden="true"
      ><rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3" /><path
        d="M12.5 4v12"
      /></svg
    >
  </button>
{/snippet}

{#if open}
  <Card area="rig" title="Your rig" stack actions={toggle}>
    {#snippet titleDetail()}
      <span class="count">{okCount}/{items.length}</span>
    {/snippet}
    <div class="meter" aria-hidden="true">
      <i style:transform={`scaleX(${okCount / items.length})`}></i>
    </div>
    <ul id={listId} class="items">
      {#each items as item (item.key)}
        <li>
          <button type="button" class={item.state} onclick={() => onselect(item.step)}>
            <span class="dot" aria-hidden="true"></span>
            <span class="label">{item.label}</span>
            <span class="value">{item.value}</span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="summary" class:complete>
      {complete
        ? "Rig ready. Every signature can play on hardware."
        : "Fills in as you work through the steps."}
    </p>
  </Card>
{:else}
  <Card area="rig" compact aria-label="Your rig">
    <div class="mini">
      {@render toggle()}
      <span class="mini-label">Your rig <b>{okCount}/{items.length}</b></span>
      <ul id={listId} class="mini-dots">
        {#each items as item (item.key)}
          <li>
            <button
              type="button"
              class={item.state}
              aria-label={`${item.label}: ${item.value}`}
              title={`${item.label}: ${item.value}`}
              onclick={() => onselect(item.step)}
              ><span class="dot" aria-hidden="true"></span></button
            >
          </li>
        {/each}
      </ul>
    </div>
  </Card>
{/if}

<style>
  .count {
    color: var(--color-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .rig-toggle {
    display: grid;
    flex: none;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: var(--color-surface-raised);
    color: var(--color-muted);
  }
  .rig-toggle:hover:enabled {
    transform: none;
    color: var(--color-ink);
    background: var(--color-control);
  }
  .rig-toggle:focus-visible,
  .items button:focus-visible,
  .mini-dots button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 1px;
  }
  .rig-toggle svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .meter {
    height: 4px;
    margin-bottom: 12px;
    border-radius: 2px;
    background: var(--color-control);
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--color-success);
    transform-origin: left;
    transition: transform 0.45s var(--ease-butter);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 -10px;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }
  .items button {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas: "dot label" ". value";
    column-gap: 10px;
    row-gap: 2px;
    width: 100%;
    padding: 10px;
    border: 0;
    border-radius: var(--radius-inset);
    background: transparent;
    color: var(--color-ink);
    text-align: start;
  }
  .items button:hover:enabled {
    transform: none;
    background: var(--color-surface-raised);
  }
  .dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-inactive);
    transition:
      background-color 0.3s ease,
      box-shadow 0.3s ease;
  }
  .items .dot {
    grid-area: dot;
    align-self: center;
  }
  .ok .dot {
    background: var(--color-success);
    box-shadow: 0 0 0 3px var(--color-success-surface);
  }
  .warn .dot {
    background: var(--color-warning);
  }
  .label {
    grid-area: label;
    color: var(--color-muted);
    font-size: 12px;
    letter-spacing: 0.04em;
  }
  .value {
    grid-area: value;
    overflow: hidden;
    font: 500 14px/1.3 var(--font-sans);
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .todo .value {
    color: var(--color-subtle);
    font-weight: 400;
  }
  .summary {
    margin: auto 0 0;
    padding-top: 12px;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .summary.complete {
    color: var(--color-success-ink);
  }
  .mini {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: var(--card-inset);
  }
  .mini-label {
    display: none;
    color: var(--color-muted);
    font-size: 14px;
    white-space: nowrap;
  }
  .mini-label b {
    color: var(--color-ink);
    font-weight: 500;
  }
  .mini-dots {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mini-dots button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-field);
    background: transparent;
  }
  .mini-dots button:hover:enabled {
    transform: none;
    background: var(--color-surface-raised);
  }
  @media (max-width: 62.5rem) {
    .mini {
      flex-direction: row;
      gap: 12px;
      padding: 0;
    }
    .mini-label {
      display: inline;
    }
    .mini-dots {
      flex-direction: row;
      gap: 0;
      min-width: 0;
      margin-inline-start: auto;
    }
    .mini-dots button {
      width: 22px;
    }
    .items {
      max-height: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .meter i {
      transition: none;
    }
  }
</style>
