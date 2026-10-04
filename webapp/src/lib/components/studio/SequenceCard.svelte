<script lang="ts">
  import HapticTimeline from "$lib/HapticTimeline.svelte";
  import type { BrushKind } from "$lib/pulse-library";
  import type { PlaybackStatus } from "$lib/playback.svelte";
  import type { Block } from "$lib/signature";
  import Card from "./Card.svelte";

  let {
    blocks,
    selectedId,
    brush,
    playhead,
    canPreview,
    canStop,
    playing,
    previewHint,
    hasPreset,
    onpreview,
    onstop,
    onselect,
    onplace,
    onedit,
    onremove,
  }: {
    blocks: Block[];
    selectedId: string | null;
    brush: Block;
    playhead: { ms: number; status: PlaybackStatus } | null;
    canPreview: boolean;
    canStop: boolean;
    playing: boolean;
    previewHint: string;
    hasPreset: (id: string) => boolean;
    onpreview: () => void;
    onstop: () => void;
    onselect: (id: string) => boolean | void;
    onplace: (timeMs: number, kind?: BrushKind) => void;
    onedit: (block: Block) => void;
    onremove: (id: string) => void;
  } = $props();
</script>

<Card area="sequence" title="Sequence" compact>
  {#snippet actions()}
    <div class="transport">
      <button
        class="transport-play"
        onclick={onpreview}
        disabled={!canPreview}
        title={previewHint}
        ><svg viewBox="0 0 24 24" aria-hidden="true"
          ><path d="M8 5.5v13l10.5-6.5Z" /></svg
        ><span>{playing ? "Playing" : "Preview"}</span></button
      >
      <button
        class="transport-stop"
        onclick={onstop}
        disabled={!canStop}
        aria-label="Stop preview"
        title="Stop"
        ><svg viewBox="0 0 24 24" aria-hidden="true"
          ><rect x="7" y="7" width="10" height="10" rx="1.5" /></svg
        ></button
      >
    </div>
  {/snippet}
  <HapticTimeline
    {blocks}
    {selectedId}
    {brush}
    {playhead}
    {onselect}
    {onplace}
    {onedit}
    {onremove}
    {hasPreset}
  />
</Card>

<style>
  .transport {
    display: flex;
    gap: 6px;
  }
  .transport button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 36px;
    border: 0;
    border-radius: 10px;
    font: 400 15px/1 var(--font-sans);
    letter-spacing: 0.02em;
  }
  .transport button:hover:enabled {
    transform: none;
  }
  .transport svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .transport-play {
    padding: 0 16px 0 12px;
    background: var(--color-action);
    color: var(--color-action-ink);
  }
  .transport-play:hover:enabled {
    background: var(--color-accent);
    color: var(--color-ink);
  }
  .transport-stop {
    width: 36px;
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  .transport-stop:hover:enabled {
    background: var(--color-danger-surface);
    color: var(--color-danger);
  }
  .transport button:disabled {
    opacity: 1;
    background: var(--color-control);
    color: var(--color-subtle);
  }
</style>
