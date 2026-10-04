<script lang="ts">
  import { PARTS, type SetupState } from "$lib/setup.svelte";
  import Note from "../Note.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    setup,
    done,
    onstudio,
  }: {
    index: number;
    setup: SetupState;
    done: boolean;
    onstudio: () => void;
  } = $props();

  function toggle(id: string) {
    setup.parts = setup.parts.includes(id)
      ? setup.parts.filter((part) => part !== id)
      : [...setup.parts, id];
  }
</script>

<SetupSection
  id="setup-parts"
  {index}
  title="Gather your parts"
  lead="You need four pieces of hardware and a desktop browser. Tick each one off as you collect it."
  {done}
>
  <ul class="parts">
    {#each PARTS as part (part.id)}
      {@const checked = setup.parts.includes(part.id)}
      <li>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          class:checked
          onclick={() => toggle(part.id)}
        >
          <span class="box" aria-hidden="true"
            >{#if checked}<svg viewBox="0 0 16 16"
                ><path d="m3.5 8.5 3 3 6-7" /></svg
              >{/if}</span
          >
          <span class="text"
            ><strong>{part.label}</strong><small>{part.detail}</small></span
          >
        </button>
      </li>
    {/each}
  </ul>
  <Note title="No hardware yet?">
    <p>
      The studio simulates every signature with sound and waveforms. You can
      design now and test on hardware later.
    </p>
  </Note>
  <div>
    <SetupButton onclick={onstudio}>Open the studio</SetupButton>
  </div>
</SetupSection>

<style>
  .parts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  button {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    height: 100%;
    padding: 14px;
    border: 0;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    color: var(--color-ink);
    text-align: start;
  }
  button:hover:enabled {
    transform: none;
    background: var(--color-panel-raised);
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .box {
    display: grid;
    flex: none;
    place-items: center;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1.5px var(--color-strong-line);
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  .checked .box {
    background: var(--color-success);
    box-shadow: none;
  }
  .box svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--color-surface-raised);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  strong {
    font: 500 15px/1.3 var(--font-sans);
  }
  small {
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.45;
  }
</style>
