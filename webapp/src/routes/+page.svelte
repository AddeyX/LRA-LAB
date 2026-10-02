<script lang="ts">
  import { onMount } from "svelte";
  import { Badge, Button } from "portal-bits";
  import { StudioSerial, type DeviceMessage } from "$lib/serial";
  import {
    EFFECTS,
    MAX_MS,
    blockDuration,
    durationOf,
    effectById,
    emptySignature,
    parseDraft,
    validateSignature,
    type Block,
    type PulseBlock,
    type Signature,
  } from "$lib/signature";
  import { exportCpp } from "$lib/export";

  let signature = $state<Signature>(emptySignature());
  let selectedId = $state<string | null>(null);
  let connected = $state(false);
  let calibrated = $state(false);
  let playing = $state(false);
  let busy = $state(false);
  let notice = $state("Connect board to preview. Editor works offline.");
  let error = $state("");
  let copied = $state(false);
  let serial: StudioSerial | null = null;
  let selected = $derived(
    signature.blocks.find((block) => block.id === selectedId),
  );
  let total = $derived(durationOf(signature));
  let validation = $derived(
    signature.blocks.length
      ? validateSignature(signature)
      : "Add effect or pulse to begin.",
  );
  let code = $derived.by(() => (validation ? "" : exportCpp(signature)));
  const ticks = [0, 1000, 2000, 3000, 4000, 5000];
  const newId = () => crypto.randomUUID();
  const label = (block: Block) =>
    block.type === "effect"
      ? `${effectById(block.effectId)?.name} · ${effectById(block.effectId)?.strength}`
      : "Custom pulse";
  const persist = () => {
    localStorage.setItem("haptic-studio-draft-v1", JSON.stringify(signature));
  };
  function commit(blocks: Block[], focus?: string) {
    const candidate: Signature = {
      schemaVersion: 1,
      blocks: [...blocks].sort((a, b) => a.startMs - b.startMs),
    };
    const issue = candidate.blocks.length ? validateSignature(candidate) : null;
    if (issue) {
      error = issue;
      return;
    }
    signature = candidate;
    error = "";
    if (focus) selectedId = focus;
    persist();
  }
  function addEffect(effectId: number) {
    const startMs = total;
    const block: Block = { id: newId(), type: "effect", startMs, effectId };
    commit([...signature.blocks, block], block.id);
  }
  function addPulse() {
    const block: PulseBlock = {
      id: newId(),
      type: "pulse",
      startMs: total,
      durationMs: 300,
      keyframes: [
        { timeMs: 0, amplitudePercent: 0 },
        { timeMs: 60, amplitudePercent: 75 },
        { timeMs: 300, amplitudePercent: 0 },
      ],
    };
    commit([...signature.blocks, block], block.id);
  }
  function updateBlock(replacement: Block) {
    commit(
      signature.blocks.map((block) =>
        block.id === replacement.id ? replacement : block,
      ),
      replacement.id,
    );
  }
  function removeBlock(id: string) {
    commit(signature.blocks.filter((block) => block.id !== id));
    selectedId = signature.blocks.find((block) => block.id !== id)?.id ?? null;
  }
  function moveBlock(id: string, direction: -1 | 1) {
    const blocks = [...signature.blocks];
    const index = blocks.findIndex((block) => block.id === id);
    const other = index + direction;
    if (index < 0 || other < 0 || other >= blocks.length) return;
    [blocks[index], blocks[other]] = [blocks[other], blocks[index]];
    let cursor = 0;
    commit(
      blocks.map((block) => {
        const moved = { ...block, startMs: cursor };
        cursor += blockDuration(block);
        return moved;
      }),
      id,
    );
  }
  function changeDuration(block: PulseBlock, value: number) {
    if (!Number.isInteger(value) || value < 10) return;
    const points = block.keyframes.map((point, index) =>
      index === block.keyframes.length - 1
        ? { ...point, timeMs: value }
        : point,
    );
    updateBlock({ ...block, durationMs: value, keyframes: points });
  }
  function updatePoint(
    block: PulseBlock,
    index: number,
    field: "timeMs" | "amplitudePercent",
    value: number,
  ) {
    if (!Number.isInteger(value)) return;
    const keyframes = block.keyframes.map((point, i) =>
      i === index ? { ...point, [field]: value } : point,
    );
    updateBlock({ ...block, keyframes });
  }
  function addPoint(block: PulseBlock) {
    const count = signature.blocks.reduce(
      (sum, b) => sum + (b.type === "pulse" ? b.keyframes.length : 0),
      0,
    );
    if (count >= 32) {
      error = "Use at most 32 pulse keyframes total.";
      return;
    }
    let best = 0;
    for (let i = 1; i < block.keyframes.length; i++)
      if (
        block.keyframes[i].timeMs - block.keyframes[i - 1].timeMs >
        block.keyframes[best + 1].timeMs - block.keyframes[best].timeMs
      )
        best = i - 1;
    const left = block.keyframes[best],
      right = block.keyframes[best + 1];
    if (right.timeMs - left.timeMs < 2) {
      error = "No room between these keyframes.";
      return;
    }
    const keyframes = [...block.keyframes];
    keyframes.splice(best + 1, 0, {
      timeMs: Math.floor((left.timeMs + right.timeMs) / 2),
      amplitudePercent: Math.round(
        (left.amplitudePercent + right.amplitudePercent) / 2,
      ),
    });
    updateBlock({ ...block, keyframes });
  }
  function deviceMessage(message: DeviceMessage) {
    if (message.type === "DONE" || message.type === "STOPPED") {
      playing = false;
      notice =
        message.type === "DONE" ? "Preview finished." : "Preview stopped.";
    }
    if (message.type === "ERROR") {
      playing = false;
      error = String(message.message || "Board fault.");
    }
  }
  async function connect() {
    busy = true;
    error = "";
    try {
      const device = new StudioSerial();
      serial = device;
      device.onMessage = deviceMessage;
      device.onDisconnect = (reason) => {
        connected = false;
        calibrated = false;
        playing = false;
        notice = reason;
      };
      const ready = await device.connect();
      connected = true;
      calibrated = ready.calibrated === true;
      notice = calibrated
        ? "Board ready for preview."
        : "Board connected. Calibrate LRA before preview.";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not connect.";
      serial = null;
    } finally {
      busy = false;
    }
  }
  async function calibrate() {
    if (!serial) return;
    busy = true;
    error = "";
    calibrated = false;
    try {
      const result = await serial.calibrate();
      calibrated = result.calibrated === true;
      notice = calibrated ? "Calibration passed." : "Calibration failed.";
      if (!calibrated) error = String(result.message || notice);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Calibration failed.";
    } finally {
      busy = false;
    }
  }
  async function preview() {
    if (!serial || validation || busy || playing) return;
    busy = true;
    error = "";
    try {
      if (await serial.play(signature)) {
        playing = true;
        notice = "Playing signature on board…";
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Preview failed.";
    } finally {
      busy = false;
    }
  }
  async function stop() {
    if (!serial) return;
    try {
      await serial.stop();
      playing = false;
      notice = "Preview stopped.";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Stop failed.";
    }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      error = "Clipboard blocked. Select code and copy it manually.";
    }
  }
  onMount(() => {
    try {
      const saved = localStorage.getItem("haptic-studio-draft-v1");
      const parsed = parseDraft(saved);
      if (parsed) {
        signature = parsed;
        selectedId = parsed.blocks[0]?.id ?? null;
        notice = "Local draft restored.";
      } else if (saved) {
        notice = "Saved draft was invalid. Started fresh.";
      }
    } catch {
      notice = "Saved draft could not be read. Started fresh.";
    }
    return () => {
      void serial?.disconnect();
    };
  });
</script>

<svelte:head
  ><title>Haptic Studio — shape the feel</title><meta
    name="description"
    content="Compose and preview five-second LRA haptic signatures."
  /></svelte:head
>
<div class="app-shell">
  <aside class="rail">
    <div class="brand-mark">H<span>·</span></div>
    <div class="rail-word">STUDIO / 01</div>
    <div class="rail-bottom">LRA<br />LAB</div>
  </aside>
  <main>
    <header class="topbar">
      <div class="eyebrow">
        HAPTIC DESIGN WORKSPACE <span class="separator">/</span> LOCAL SESSION
      </div>
      <div class="top-right">
        <span class:online={connected} class="status-dot"></span>{connected
          ? "DEVICE ONLINE"
          : "DEVICE OFFLINE"}<span class="header-rule"></span> ESP32-C3 · DRV2605L
      </div>
    </header>
    <div class="content">
      <section class="hero">
        <div>
          <p class="kicker">01 / COMPOSE</p>
          <h1>Shape the <em>feel.</em></h1>
          <p class="hero-copy">
            Build a tactile signature, then feel it on hardware. Every moment
            lives on one five-second canvas.
          </p>
        </div>
        <div class="hero-side">
          <div class="clock-face">
            <span>{(total / 1000).toFixed(2)}</span><small>/ 5.00 SEC</small>
          </div>
          <div class="meter">
            <span style:transform={`scaleX(${total / MAX_MS})`}></span>
          </div>
          <p>SEQUENCE LENGTH</p>
        </div>
      </section>
      <section class="device-strip" aria-label="Device connection">
        <div>
          <span class="section-num">A</span><strong>DEVICE LINK</strong>
          <p>{notice}</p>
        </div>
        <div class="device-actions">
          {#if connected}<Badge variant={calibrated ? "success" : "neutral"}
              >{calibrated ? "CALIBRATED" : "NEEDS CALIBRATION"}</Badge
            ><Button
              variant="secondary"
              onclick={calibrate}
              disabled={busy || playing}>Calibrate</Button
            ><button
              class="text-button"
              onclick={() => {
                void serial?.disconnect();
                connected = false;
                calibrated = false;
              }}>Disconnect</button
            >{:else}<Button variant="primary" onclick={connect} disabled={busy}
              >Connect board ↗</Button
            >{/if}
        </div>
      </section>
      {#if error}<div class="error-banner" role="alert">
          <strong>CHECK THIS</strong><span>{error}</span><button
            onclick={() => (error = "")}
            aria-label="Dismiss error">×</button
          >
        </div>{/if}
      <div class="workspace">
        <section class="palette">
          <div class="section-head">
            <span class="section-num">B</span>
            <div>
              <h2>Effect library</h2>
              <p>ROM effects · LRA library 6</p>
            </div>
          </div>
          <div class="palette-group">
            <span class="group-label">BUILT-IN IMPULSES</span
            >{#each EFFECTS as effect (effect.id)}<button
                class="effect-choice"
                onclick={() => addEffect(effect.id)}
                disabled={total + effect.durationMs > MAX_MS ||
                  signature.blocks.length >= 32}
                ><span class="effect-glyph">{effect.id < 10 ? "◢" : "▥"}</span
                ><span class="effect-name"
                  >{effect.name}<small>{effect.strength} STRENGTH</small></span
                ><span class="effect-duration">{effect.durationMs} ms</span
                ><span class="effect-plus">+</span></button
              >{/each}
          </div>
          <div class="palette-group pulse-group">
            <span class="group-label">MAKE YOUR OWN</span><button
              class="pulse-choice"
              onclick={addPulse}
              disabled={total + 300 > MAX_MS || signature.blocks.length >= 32}
              ><span class="pulse-icon">〰</span><span
                ><strong>Custom pulse</strong><small
                  >Shape amplitude over time</small
                ></span
              ><span>↗</span></button
            >
          </div>
        </section>
        <div class="editor-column">
          <section class="timeline-section">
            <div class="section-head timeline-head">
              <span class="section-num">C</span>
              <div>
                <h2>Timeline</h2>
                <p>One track · up to 5 seconds</p>
              </div>
              <div class="timeline-controls">
                <button
                  onclick={preview}
                  disabled={!connected ||
                    !calibrated ||
                    !!validation ||
                    busy ||
                    playing}
                  class="play-button">▶ <span>PREVIEW</span></button
                ><button
                  onclick={stop}
                  disabled={!connected || !playing}
                  class="stop-button">■ <span>STOP</span></button
                >
              </div>
            </div>
            <div class="ruler">
              {#each ticks as tick (tick)}<span
                  style:left={`${(tick / MAX_MS) * 100}%`}>{tick / 1000}s</span
                >{/each}
            </div>
            <div class="track" aria-label="Signature timeline">
              <div class="track-grid">
                {#each ticks as tick (tick)}<i
                    style:left={`${(tick / MAX_MS) * 100}%`}
                  ></i>{/each}
              </div>
              {#if signature.blocks.length === 0}<div class="empty-track">
                  Add an effect or pulse to start your signature <span>←</span>
                </div>{/if}{#each signature.blocks as block (block.id)}<button
                  class:chosen={selectedId === block.id}
                  class:pulse-block={block.type === "pulse"}
                  class="timeline-block"
                  style:left={`${(block.startMs / MAX_MS) * 100}%`}
                  style:width={`${(blockDuration(block) / MAX_MS) * 100}%`}
                  onclick={() => (selectedId = block.id)}
                  title={`${label(block)} · ${block.startMs}–${block.startMs + blockDuration(block)} ms`}
                  ><span>{block.type === "pulse" ? "〰" : "◆"}</span><b
                    >{label(block)}</b
                  ></button
                >{/each}
            </div>
            <div class="track-footer">
              <span>0 MS</span><span
                >{signature.blocks.length} BLOCK{signature.blocks.length === 1
                  ? ""
                  : "S"} · {Math.max(0, MAX_MS - total)} MS REMAINING</span
              ><span>5000 MS</span>
            </div>
            <div class="sequence-list">
              {#each signature.blocks as block, index (block.id)}<button
                  class:active={selectedId === block.id}
                  onclick={() => (selectedId = block.id)}
                  ><span class="order"
                    >{String(index + 1).padStart(2, "0")}</span
                  ><span class="mini-wave"
                    >{block.type === "pulse" ? "〰" : "◆"}</span
                  ><span class="list-name">{label(block)}</span><span
                    class="list-time"
                    >{block.startMs} MS <i>→</i>
                    {block.startMs + blockDuration(block)} MS</span
                  ></button
                >{/each}
            </div>
          </section>
          <section class="inspector">
            <div class="section-head">
              <span class="section-num">D</span>
              <div>
                <h2>Shape &amp; arrange</h2>
                <p>
                  {selected
                    ? "Selected block controls"
                    : "Select a block on the timeline"}
                </p>
              </div>
            </div>
            {#if selected}<div class="inspector-top">
                <div>
                  <span class="group-label">SELECTED BLOCK</span>
                  <h3>{label(selected)}</h3>
                </div>
                <button
                  class="delete-button"
                  onclick={() => removeBlock(selected!.id)}>Remove ×</button
                >
              </div>
              <div class="form-grid">
                <label
                  >START <span>MS</span><input
                    type="number"
                    min="0"
                    max={MAX_MS}
                    value={selected.startMs}
                    onchange={(event) =>
                      updateBlock({
                        ...selected!,
                        startMs: Number(event.currentTarget.value),
                      })}
                  /></label
                >{#if selected.type === "effect"}<label
                    >EFFECT VARIANT<select
                      value={selected.effectId}
                      onchange={(event) =>
                        updateBlock({
                          ...selected!,
                          effectId: Number(event.currentTarget.value),
                        })}
                      >{#each EFFECTS as effect (effect.id)}<option
                          value={effect.id}
                          >{effect.name} · {effect.strength}</option
                        >{/each}</select
                    ></label
                  ><label
                    >DURATION <span>FIXED SLOT</span><input
                      value={`${blockDuration(selected)} ms`}
                      disabled
                    /></label
                  >{:else}<label
                    >DURATION <span>MS</span><input
                      type="number"
                      min="10"
                      max={MAX_MS}
                      value={selected.durationMs}
                      onchange={(event) =>
                        changeDuration(
                          selected as PulseBlock,
                          Number(event.currentTarget.value),
                        )}
                    /></label
                  >{/if}
              </div>
              <div class="arrange">
                <span>ORDER</span><button
                  onclick={() => moveBlock(selected!.id, -1)}
                  disabled={signature.blocks[0]?.id === selected.id}
                  >← Earlier</button
                ><button
                  onclick={() => moveBlock(selected!.id, 1)}
                  disabled={signature.blocks.at(-1)?.id === selected.id}
                  >Later →</button
                >
              </div>
              {#if selected.type === "pulse"}<div class="keyframe-heading">
                  <span class="group-label">AMPLITUDE ENVELOPE</span><button
                    onclick={() => addPoint(selected as PulseBlock)}
                    >+ Add point</button
                  >
                </div>
                <div class="envelope" aria-hidden="true">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                    ><polyline
                      points={selected.keyframes
                        .map(
                          (point) =>
                            `${(point.timeMs / selected.durationMs) * 100},${100 - point.amplitudePercent}`,
                        )
                        .join(" ")}
                    /></svg
                  >
                </div>
                <div class="point-list">
                  {#each selected.keyframes as point, index (index)}<div>
                      <span>{String(index + 1).padStart(2, "0")}</span><label
                        >TIME <input
                          type="number"
                          min="0"
                          max={selected.durationMs}
                          disabled={index === 0 ||
                            index === selected.keyframes.length - 1}
                          value={point.timeMs}
                          onchange={(event) =>
                            updatePoint(
                              selected as PulseBlock,
                              index,
                              "timeMs",
                              Number(event.currentTarget.value),
                            )}
                        /></label
                      ><label
                        >AMP <input
                          type="number"
                          min="0"
                          max="100"
                          value={point.amplitudePercent}
                          onchange={(event) =>
                            updatePoint(
                              selected as PulseBlock,
                              index,
                              "amplitudePercent",
                              Number(event.currentTarget.value),
                            )}
                        /></label
                      ><span>%</span><button
                        disabled={index === 0 ||
                          index === selected.keyframes.length - 1}
                        onclick={() =>
                          updateBlock({
                            ...(selected as PulseBlock),
                            keyframes: selected.keyframes.filter(
                              (_, i) => i !== index,
                            ),
                          })}
                        aria-label="Remove point">×</button
                      >
                    </div>{/each}
                </div>{/if}{:else}<div class="inspector-empty">
                Select a block to adjust timing and feel.
              </div>{/if}
          </section>
        </div>
      </div>
      <section class="export-section">
        <div class="section-head">
          <span class="section-num">E</span>
          <div>
            <h2>Take it to firmware</h2>
            <p>Generated C++ · Adafruit_DRV2605</p>
          </div>
          <button class="copy-button" onclick={copyCode} disabled={!!validation}
            >{copied ? "COPIED ✓" : "COPY CODE ↗"}</button
          >
        </div>
        {#if validation}<div class="code-placeholder">
            {validation}
          </div>{:else}<pre><code>{code}</code></pre>{/if}
      </section>
      <footer>
        <span>HAPTIC STUDIO <i>©</i> 2026</span><span
          >DESIGNED FOR FEEL. BUILT FOR ESP32-C3.</span
        ><span>LOCAL BY DESIGN</span>
      </footer>
    </div>
  </main>
</div>
