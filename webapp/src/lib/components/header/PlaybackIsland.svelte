<script lang="ts">
  import { MediaQuery } from "svelte/reactivity";
  import type { Playback } from "$lib/playback.svelte";
  import SequenceMeter from "./SequenceMeter.svelte";

  let {
    playback,
    totalMs,
    maxMs,
    beats,
    onstop,
  }: {
    playback: Playback;
    totalMs: number;
    maxMs: number;
    beats: number;
    onstop: () => void;
  } = $props();

  // Motion is slowed far below the carrier so the swing stays legible.
  const MOTION_HZ = 14;
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  let meterWidth = $state(0);
  let meterHeight = $state(0);
  let panelHeight = $state(0);
  let scopeWidth = $state(0);
  let scopeHeight = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  let track = $state(0);
  const samples = new Float32Array(2048);
  const SCOPE_SAMPLES = 1024;
  const seconds = (ms: number) => (ms / 1000).toFixed(2);
  let open = $derived(playback.showing);
  let board = $derived(playback.source === "board");
  let swing = $derived(
    reducedMotion.current
      ? 0
      : playback.motion *
          Math.sin((2 * Math.PI * MOTION_HZ * playback.clockMs) / 1000),
  );
  let status = $derived(
    {
      idle: "",
      starting: "Loading board",
      playing: board ? "Board preview" : "Simulated preview",
      completed: "Completed",
      stopped: "Stopped",
      failed: "Playback failed",
    }[playback.status],
  );
  let envelopePath = $derived.by(() => {
    const total = Math.max(1, playback.totalMs);
    const points = playback.envelope
      .filter((point) => point.timeMs <= total)
      .map(
        (point) =>
          `${((point.timeMs / total) * 100).toFixed(2)},${(30 - point.amplitude * 0.28).toFixed(2)}`,
      );
    return points.length ? `M0,30 L${points.join(" L")} L100,30 Z` : "";
  });

  $effect(() => {
    void playback.clockMs;
    void playback.positionMs;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !scopeWidth) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(scopeWidth * ratio);
    const height = Math.round(scopeHeight * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.clearRect(0, 0, width, height);
    const style = getComputedStyle(canvas);
    context.strokeStyle = style.getPropertyValue("--scope-line");
    context.lineWidth = 1.6 * ratio;
    context.lineJoin = "round";
    const live = playback.readWaveform(samples);
    // Trigger on a rising zero crossing so the trace holds still between frames.
    let offset = 0;
    if (live)
      for (let index = 1; index < samples.length - SCOPE_SAMPLES; index++)
        if (samples[index - 1] < 0 && samples[index] >= 0) {
          offset = index;
          break;
        }
    context.beginPath();
    for (let index = 0; index < SCOPE_SAMPLES; index++) {
      const value = live ? samples[offset + index] : 0;
      const px = (index / (SCOPE_SAMPLES - 1)) * width;
      const py = height / 2 - value * (height / 2 - 2 * ratio);
      if (index) context.lineTo(px, py);
      else context.moveTo(px, py);
    }
    context.stroke();
  });
</script>

<div class="pi">
  <div
    class="pi-meter"
    inert={open}
    bind:clientWidth={meterWidth}
    bind:clientHeight={meterHeight}
  >
    <SequenceMeter {totalMs} {maxMs} {beats} />
  </div>
  <div
    class="pi-shell"
    class:open
    style:--meter-w={`${meterWidth}px`}
    style:--meter-h={`${meterHeight}px`}
    style:--open-h={`${panelHeight}px`}
  >
    <div
      class="pi-panel"
      bind:clientHeight={panelHeight}
      inert={!open}
      aria-hidden={!open}
      role="group"
      aria-label="Playback visualizer"
    >
      <div class="pi-head">
        <span
          class="pi-status"
          class:live={playback.status === "playing"}
          class:failed={playback.status === "failed"}><i></i>{status}</span
        >
        <span class="pi-time"
          ><strong>{seconds(playback.positionMs)}</strong>
          <small>/ {seconds(playback.totalMs)} s</small></span
        >
        <span class="pi-actions">
          {#if !board}
            <button
              class="pi-icon"
              aria-pressed={!playback.muted}
              aria-label={playback.muted ? "Unmute preview" : "Mute preview"}
              title={playback.muted ? "Sound off" : "Sound on"}
              onclick={() => playback.setMuted(!playback.muted)}
              ><svg viewBox="0 0 24 24" aria-hidden="true"
                ><path
                  d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"
                />{#if playback.muted}<path
                    class="stroke"
                    d="m16 9.5 5 5m0-5-5 5"
                  />{:else}<path
                    class="stroke"
                    d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
                  />{/if}</svg
              ></button
            >
          {/if}
          <button
            class="pi-icon pi-stop"
            aria-label="Stop preview"
            title="Stop"
            disabled={!playback.active}
            onclick={onstop}
            ><svg viewBox="0 0 24 24" aria-hidden="true"
              ><rect x="7" y="7" width="10" height="10" rx="1.5" /></svg
            ></button
          >
        </span>
      </div>
      <div class="pi-viz">
        <figure class="pi-motion">
          <div class="pi-track" bind:clientWidth={track}>
            <span class="pi-rail" aria-hidden="true"></span>
            <span
              class="pi-mass"
              style:transform={`translateX(${(swing * track * 0.32).toFixed(2)}px) scaleY(${reducedMotion.current ? 0.5 + playback.motion * 0.5 : 1})`}
              aria-hidden="true"
            ></span>
          </div>
          <figcaption>Motion</figcaption>
        </figure>
        <figure class="pi-scope">
          <div
            class="pi-scope-frame"
            bind:clientWidth={scopeWidth}
            bind:clientHeight={scopeHeight}
          >
            <canvas bind:this={canvas} aria-hidden="true"></canvas>
          </div>
          <figcaption>Audio</figcaption>
        </figure>
      </div>
      <figure class="pi-envelope">
        <div class="pi-envelope-frame">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"
            ><path d={envelopePath} /></svg
          >
          <span
            class="pi-arm"
            class:failed={playback.status === "failed"}
            style:left={`${(playback.positionMs / Math.max(1, playback.totalMs)) * 100}%`}
            aria-hidden="true"
          ></span>
        </div>
        <figcaption>Envelope</figcaption>
      </figure>
      <p class="pi-note">
        {board
          ? "Arm shows timeline progress, not measured actuator motion."
          : "Simulated approximation · not measured actuator output."}
      </p>
    </div>
  </div>
</div>

<style>
  .pi {
    position: relative;
  }
  .pi-shell {
    --open-w: min(440px, calc(100vw - 36px));
    position: absolute;
    top: 0;
    left: 50%;
    z-index: 25;
    width: var(--meter-w);
    height: var(--meter-h);
    overflow: hidden;
    border-radius: 14px;
    background: color-mix(in srgb, var(--color-surface) 0%, transparent);
    box-shadow: 0 0 0 0 transparent;
    transform: translateX(-50%);
    transition:
      width 0.55s var(--ease-butter),
      height 0.55s var(--ease-butter),
      border-radius 0.55s var(--ease-butter),
      background-color 0.35s ease,
      box-shadow 0.45s ease;
  }
  .pi-shell.open {
    width: var(--open-w);
    height: var(--open-h);
    border-radius: var(--radius-island);
    background: var(--color-surface);
    box-shadow: var(--shadow-dialog);
  }
  .pi-meter {
    position: relative;
    z-index: 26;
    transition:
      opacity 0.25s ease,
      transform 0.45s var(--ease-butter);
  }
  .pi-meter[inert] {
    opacity: 0;
    transform: translateY(-8px);
  }
  .pi-panel {
    position: absolute;
    top: 0;
    left: 50%;
    display: grid;
    gap: 8px;
    width: var(--open-w);
    padding: 10px 12px 10px 14px;
    opacity: 0;
    transform: translate(-50%, 6px);
    transition:
      opacity 0.2s ease,
      transform 0.45s var(--ease-butter);
  }
  .open .pi-panel {
    opacity: 1;
    transform: translate(-50%, 0);
    transition:
      opacity 0.35s ease 0.15s,
      transform 0.5s var(--ease-butter) 0.1s;
  }
  .pi-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-height: 32px;
  }
  .pi-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    overflow: hidden;
    color: var(--color-muted);
    font-size: 12px;
    letter-spacing: 0.03em;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .pi-status i {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-inactive);
    transition: background-color 0.3s ease;
  }
  .pi-status.live i {
    background: var(--color-success);
    box-shadow: 0 0 0 3px var(--color-success-surface);
  }
  .pi-status.failed i {
    background: var(--color-danger);
  }
  .pi-time {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .pi-time strong {
    font: 500 22px/1 var(--font-sans);
    letter-spacing: -0.02em;
  }
  .pi-time small {
    color: var(--color-muted);
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .pi-actions {
    display: flex;
    justify-self: end;
    gap: 6px;
  }
  .pi-icon {
    display: inline-grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: var(--color-surface-raised);
    color: var(--color-ink);
  }
  .pi-icon:hover:enabled {
    transform: none;
    background: var(--color-control);
  }
  .pi-stop:hover:enabled {
    background: var(--color-danger-surface);
    color: var(--color-danger);
  }
  .pi-icon:disabled {
    opacity: 1;
    background: var(--color-control);
    color: var(--color-subtle);
  }
  .pi-icon:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .pi-icon svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  .pi-icon .stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  figure {
    display: grid;
    gap: 4px;
    min-width: 0;
    margin: 0;
  }
  figcaption {
    color: var(--color-subtle);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .pi-viz {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 10px;
  }
  .pi-track,
  .pi-scope-frame,
  .pi-envelope-frame {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    background: var(--color-surface-raised);
  }
  .pi-track,
  .pi-scope-frame {
    height: 52px;
  }
  .pi-rail {
    position: absolute;
    top: 50%;
    left: 12px;
    right: 12px;
    height: 2px;
    border-radius: 2px;
    background: var(--color-line);
    transform: translateY(-50%);
  }
  .pi-mass {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 22px;
    height: 32px;
    margin: -16px 0 0 -11px;
    border-radius: 6px;
    background: var(--color-ink);
    will-change: transform;
  }
  .pi-scope-frame {
    --scope-line: var(--color-accent-bright);
  }
  .pi-scope-frame::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--color-line);
  }
  canvas {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
  }
  .pi-envelope-frame {
    height: 28px;
  }
  .pi-envelope svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .pi-envelope path {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-bright);
    stroke-width: 1.4;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .pi-arm {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--color-ink);
  }
  .pi-arm.failed {
    background: var(--color-danger);
  }
  .pi-note {
    margin: 0;
    color: var(--color-subtle);
    font-size: 11px;
    letter-spacing: 0.02em;
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) {
    .pi-shell,
    .pi-meter,
    .pi-panel,
    .open .pi-panel {
      transition-duration: 0.01s;
      transition-delay: 0s;
    }
  }
</style>
