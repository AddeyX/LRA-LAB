<script lang="ts">
  import { DATASHEET_URL } from "$lib/lra-profile";
  import Card from "$lib/components/studio/Card.svelte";

  let {
    steps,
    current,
    onselect,
  }: {
    steps: readonly { id: string; title: string; done: boolean }[];
    current: number;
    onselect: (index: number) => void;
  } = $props();

  let doneCount = $derived(steps.filter((step) => step.done).length);
  let list = $state<HTMLOListElement>();

  $effect(() => {
    const item = list?.children[current];
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    const offset = item.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollTo({ left: list.scrollLeft + offset - 8, behavior: "smooth" });
  });
</script>

<Card area="steps" title="Setup" stack>
  {#snippet titleDetail()}
    <span class="count">{doneCount}/{steps.length}</span>
  {/snippet}
  <nav aria-label="Setup steps">
    <ol bind:this={list}>
      {#each steps as step, index (step.id)}
        <li>
          <button
            type="button"
            class:current={index === current}
            class:done={step.done}
            aria-current={index === current ? "step" : undefined}
            onclick={() => onselect(index)}
          >
            <span class="glyph" aria-hidden="true">
              {#if step.done}<svg viewBox="0 0 16 16"
                  ><path d="m3.5 8.5 3 3 6-7" /></svg
                >{:else}{index + 1}{/if}
            </span>
            <span class="title">{step.title}</span>
            {#if step.done}<span class="visually-hidden">(done)</span>{/if}
          </button>
        </li>
      {/each}
    </ol>
  </nav>
  <div class="links">
    <a
      href="https://github.com/AddeyX/LRA-LAB/blob/main/firmware/README.md"
      target="_blank"
      rel="noopener noreferrer">Firmware README ↗</a
    >
    <a href={DATASHEET_URL} target="_blank" rel="noopener noreferrer"
      >DRV2605L datasheet ↗</a
    >
  </div>
</Card>

<style>
  .count {
    color: var(--color-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  ol {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--radius-inset);
    background: transparent;
    color: var(--color-muted);
    font: 400 15px/1.2 var(--font-sans);
    text-align: start;
  }
  button:hover:enabled {
    transform: none;
    color: var(--color-ink);
    background: color-mix(in srgb, var(--color-surface-raised) 55%, transparent);
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 1px;
  }
  button.current {
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  button.done {
    color: var(--color-ink);
  }
  .glyph {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--color-control-hover);
    color: var(--color-subtle);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    transition:
      background-color 0.25s ease,
      box-shadow 0.25s ease;
  }
  .current .glyph {
    box-shadow: inset 0 0 0 1.5px var(--color-ink);
    color: var(--color-ink);
  }
  .done .glyph {
    background: var(--color-success);
    box-shadow: none;
  }
  .glyph svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--color-surface-raised);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .links {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: auto;
    padding: 16px 10px 0;
  }
  .links a {
    color: var(--color-muted);
    font-size: 13px;
    text-decoration: none;
  }
  .links a:hover {
    color: var(--color-ink);
  }
  @media (max-width: 62.5rem) {
    ol {
      flex-direction: row;
      gap: 4px;
      margin: 0 -4px;
      padding: 0 4px 2px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    li {
      flex: none;
    }
    button {
      min-height: 40px;
      padding: 6px 12px 6px 8px;
      font-size: 14px;
      white-space: nowrap;
    }
    .links {
      display: none;
    }
  }
</style>
