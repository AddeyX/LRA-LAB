<script lang="ts">
  import Note from "../Note.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    connected,
    busy,
    serialSupported,
    secure,
    boardProfile,
    expectedProfile,
    error,
    onconnect,
    ongoto,
  }: {
    index: number;
    connected: boolean;
    busy: boolean;
    serialSupported: boolean;
    secure: boolean;
    boardProfile: string | null;
    expectedProfile: string | null;
    error: string;
    onconnect: () => void;
    ongoto: (id: "firmware") => void;
  } = $props();

  let checks = $derived([
    {
      label: "Web Serial available",
      ok: serialSupported,
      fix: "Use desktop Chrome or Edge.",
    },
    {
      label: "Secure page",
      ok: secure,
      fix: "Open LRA Lab over HTTPS or localhost.",
    },
  ]);
  let blocked = $derived(!serialSupported || !secure);
  let mismatch = $derived(
    connected && boardProfile && expectedProfile && boardProfile !== expectedProfile,
  );
</script>

<SetupSection
  id="setup-connect"
  {index}
  title="Connect the board"
  lead="Plug the board in with your data cable and choose its serial port when the browser asks. LRA Lab then checks the firmware version and the driver."
  done={connected}
>
  <ul class="checks">
    {#each checks as check (check.label)}
      <li class:ok={check.ok} class:bad={!check.ok}>
        <span class="mark" aria-hidden="true">{check.ok ? "✓" : "!"}</span>
        <span
          >{check.label}<small>{check.ok ? "Ready" : check.fix}</small></span
        >
      </li>
    {/each}
    <li>
      <span class="mark" aria-hidden="true">i</span>
      <span
        >Serial monitors closed<small
          >Arduino IDE, PlatformIO or other apps can hold the port.</small
        ></span
      >
    </li>
  </ul>

  <div class="action">
    {#if connected}
      <span class="chip ok"><i></i>Connected</span>
      {#if boardProfile}<span class="profile">Firmware profile: <b>{boardProfile}</b></span>{/if}
    {:else}
      <SetupButton
        variant="primary"
        size="lg"
        onclick={onconnect}
        disabled={busy || blocked}
        >{busy ? "Connecting…" : "Connect board"}</SetupButton
      >
    {/if}
  </div>

  {#if mismatch}
    <Note tone="warn" title="Firmware doesn't match your setup">
      <p>
        The board reports <b>{boardProfile}</b>, but your settings build
        <b>{expectedProfile}</b>. Upload the firmware again to apply them.
      </p>
    </Note>
    <div>
      <SetupButton onclick={() => ongoto("firmware")}>Go to firmware</SetupButton>
    </div>
  {/if}
  {#if error}
    <Note tone="danger" title="Couldn't connect" role="alert"><p>{error}</p></Note>
  {/if}
</SetupSection>

<style>
  .checks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .checks li {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    font-size: 14px;
    line-height: 1.4;
  }
  .checks li > span:last-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  small {
    color: var(--color-muted);
    font-size: 12px;
  }
  .mark {
    display: grid;
    flex: none;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-control);
    color: var(--color-muted);
    font-size: 11px;
    font-weight: 600;
  }
  .ok .mark {
    background: var(--color-success-surface);
    color: var(--color-success-ink);
  }
  .bad .mark {
    background: var(--color-danger-surface);
    color: var(--color-danger);
  }
  .action {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    min-height: 48px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    background: var(--color-success-surface);
    color: var(--color-success-ink);
    font-size: 14px;
  }
  .chip i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-success);
  }
  .profile {
    color: var(--color-muted);
    font-size: 13px;
  }
  b {
    color: var(--color-ink);
    font-weight: 500;
  }
</style>
