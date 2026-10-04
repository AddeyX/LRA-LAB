<script lang="ts">
  import Note from "../Note.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    ready,
    connected,
    felt,
    buzzing,
    busy,
    error,
    onbuzz,
    onstudio,
    ongoto,
  }: {
    index: number;
    ready: boolean;
    connected: boolean;
    felt: boolean;
    buzzing: boolean;
    busy: boolean;
    error: string;
    onbuzz: () => void;
    onstudio: () => void;
    ongoto: (id: "connect" | "calibrate") => void;
  } = $props();
</script>

<SetupSection
  id="setup-buzz"
  {index}
  title="Feel the first buzz"
  lead="Send a short test pattern to the board: two clicks and a swell. If you feel it, your rig is ready for the studio."
  done={felt}
>
  <div class="stage" class:live={buzzing} class:ready>
    <svg viewBox="0 0 240 48" aria-hidden="true">
      <rect x="4" y="12" width="26" height="24" rx="6" />
      <rect x="42" y="12" width="26" height="24" rx="6" />
      <path d="M84 40 C120 40 128 8 152 8 S184 40 236 40" />
    </svg>
    <div class="stage-actions">
      <SetupButton
        variant="primary"
        size="lg"
        onclick={onbuzz}
        disabled={!ready || busy}
        >{buzzing ? "Buzzing…" : felt ? "Play again" : "Feel it"}</SetupButton
      >
      {#if felt}
        <SetupButton size="lg" onclick={onstudio}>Open the studio →</SetupButton>
      {/if}
    </div>
  </div>

  {#if !ready}
    <Note title={connected ? "Calibrate first" : "Connect and calibrate first"}>
      <p>
        The test plays on hardware only. You can still design in the studio
        with simulated playback.
      </p>
    </Note>
    <div class="row">
      <SetupButton onclick={() => ongoto(connected ? "calibrate" : "connect")}
        >{connected ? "Go to calibrate" : "Go to connect"}</SetupButton
      >
      <SetupButton variant="ghost" onclick={onstudio}>Open the studio</SetupButton>
    </div>
  {:else if felt}
    <Note tone="success" title="Your rig is ready">
      <p>
        Build a signature in the studio and press Space to play it on your LRA.
      </p>
    </Note>
  {/if}
  {#if error}
    <Note tone="danger" title="The test didn't play" role="alert"><p>{error}</p></Note>
  {/if}
</SetupSection>

<style>
  .stage {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px 24px;
    padding: 20px;
    border-radius: var(--radius-panel);
    background: var(--color-surface-soft);
  }
  svg {
    width: min(240px, 100%);
    height: 48px;
    fill: var(--color-control-hover);
    stroke: var(--color-control-hover);
    transition:
      fill 0.3s ease,
      stroke 0.3s ease;
  }
  svg path {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .ready svg {
    fill: var(--color-ink);
    stroke: var(--color-accent-bright);
  }
  .live svg {
    animation: buzz 0.12s linear infinite;
  }
  .stage-actions,
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  @keyframes buzz {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(1.5px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .live svg {
      animation: none;
    }
  }
</style>
