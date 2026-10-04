<script lang="ts">
  import { Popover } from "bits-ui";
  import RollText from "./RollText.svelte";
  import { reveal } from "./reveal";

  let {
    anchor,
    connected,
    calibrated,
    hardwareAllowed,
    calibrating,
    busy,
    playing,
    notice,
    error,
    onconnect,
    oncalibrate,
    ondisconnect,
  }: {
    anchor: HTMLElement | null;
    connected: boolean;
    calibrated: boolean;
    hardwareAllowed: boolean;
    calibrating: boolean;
    busy: boolean;
    playing: boolean;
    notice: string;
    error: string;
    onconnect: () => void;
    oncalibrate: () => void;
    ondisconnect: () => void;
  } = $props();
  let open = $state(false);
</script>

{#if connected}
  <Popover.Root bind:open>
    <Popover.Trigger
      class="lab-board-link"
      aria-label="Board connection and calibration"
    >
      <span
        class="lab-dot"
        class:online={calibrated}
        class:warn={!calibrated}
        aria-hidden="true"
      ></span>
      <RollText text={calibrated ? "Connected" : "Calibrate"} />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content
        forceMount
        customAnchor={anchor}
        side="bottom"
        align="end"
        sideOffset={8}
        collisionPadding={12}
      >
        {#snippet child({ wrapperProps, props, open: isOpen })}
          {#if isOpen}
            <div {...wrapperProps}>
              <div {...props} class="board-drop" transition:reveal>
                <div class="board-head">
                  <strong>Board</strong>
                  <span class="board-chip" class:ok={calibrated}
                    >{calibrated ? "Calibrated" : "Needs calibration"}</span
                  >
                </div>
                <p role="status">{notice}</p>
                {#if error}<p class="board-error" role="alert">{error}</p>{/if}
                <div class="board-actions">
                  <button
                    class="board-primary"
                    onclick={oncalibrate}
                    disabled={busy || playing || !hardwareAllowed}
                    >{calibrating
                      ? "Calibrating…"
                      : calibrated
                        ? "Recalibrate"
                        : "Calibrate"}</button
                  >
                  <button
                    class="board-quiet"
                    disabled={busy || playing}
                    onclick={ondisconnect}>Disconnect</button
                  >
                </div>
              </div>
            </div>
          {/if}
        {/snippet}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
{:else}
  <button class="lab-board-link" onclick={onconnect} disabled={busy}>
    <span class="lab-dot" aria-hidden="true"></span>
    <RollText text={busy ? "Connecting…" : "Connect"} />
  </button>
{/if}

<style>
  :global(.lab-board-link) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-ink);
    font: 400 16px/20px var(--font-sans);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  :global(.lab-board-link:hover:enabled) {
    transform: none;
  }
  :global(.lab-board-link:disabled) {
    opacity: 0.6;
    cursor: wait;
  }
  :global(.lab-board-link:focus-visible) {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .lab-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-inactive);
    transition: background-color 0.3s ease;
  }
  .lab-dot.online {
    background: var(--color-success);
    box-shadow: 0 0 0 3px var(--color-success-surface);
  }
  .lab-dot.warn {
    background: var(--color-warning);
  }
  .board-drop {
    z-index: 60;
    width: min(300px, calc(100vw - 24px));
    padding: 18px;
    border-radius: var(--radius-island);
    background: var(--color-surface);
    color: var(--color-ink);
    transform-origin: top right;
    outline: none;
  }
  .board-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .board-head strong {
    font: 500 18px/1.2 var(--font-sans);
  }
  .board-chip {
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: var(--color-surface-raised);
    color: var(--color-muted);
    font-size: 12px;
  }
  .board-chip.ok {
    background: var(--color-success-surface);
    color: var(--color-success-ink);
  }
  p {
    margin: 12px 0 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .board-error {
    color: var(--color-danger);
  }
  .board-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }
  .board-actions button {
    flex: 1;
    padding: 9px 12px;
    border: 0;
    border-radius: 10px;
    font: 400 14px/20px var(--font-sans);
  }
  .board-actions button:hover:enabled {
    transform: none;
  }
  .board-primary {
    background: var(--color-action);
    color: var(--color-action-ink);
  }
  .board-primary:hover:enabled {
    background: var(--color-action-hover);
  }
  .board-quiet {
    background: var(--color-surface-raised);
    color: var(--color-danger);
  }
  .board-quiet:hover:enabled {
    background: var(--color-danger-surface);
  }
</style>
