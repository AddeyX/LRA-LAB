<script lang="ts">
  import { onMount } from "svelte";
  import { Badge, Button, Dialog, Popover } from "portal-bits";
  import SetupView from "$lib/SetupView.svelte";
  import HapticTimeline from "$lib/HapticTimeline.svelte";
  import BuiltInImpulses from "$lib/BuiltInImpulses.svelte";
  import ScrubField from "$lib/components/ScrubField.svelte";
  import { GRID_MS, editTimeline, resizePulse, snapTime } from "$lib/timeline";
  import {
    fileStem,
    parseProjectFile,
    putProject,
    readProjects,
    type SavedProject,
  } from "$lib/projects";
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
  let firmwareProfile = $state<string | null>(null);
  let calibrated = $state(false);
  let playing = $state(false);
  let busy = $state(false);
  let notice = $state("Connect board to preview. Editor works offline.");
  let error = $state("");
  let copied = $state(false);
  let view = $state<"studio" | "setup">("studio");
  let fileOpen = $state(false);
  let deviceOpen = $state(false);
  let calibrating = $state(false);
  let sequenceExpanded = $state(false);
  let filePane = $state<"main" | "open">("main");
  let saveDialog = $state(false);
  let newDialog = $state(false);
  let newAfterSave = false;
  let projectsDialog = $state(false);
  let codeDialog = $state(false);
  let settingsDialog = $state(false);
  let replaceDialog = $state(false);
  let projectName = $state("");
  let currentProjectId = $state<string | null>(null);
  let savedSnapshot = $state(JSON.stringify(emptySignature()));
  let projects = $state<SavedProject[]>([]);
  let pendingOpen: {
    signature: Signature;
    name: string;
    id: string | null;
  } | null = null;
  let fileInput: HTMLInputElement;
  let serial: StudioSerial | null = null;
  let dirty = $derived(JSON.stringify(signature) !== savedSnapshot);
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
  let brushKind = $state<number | "pulse">(1);
  let brush = $derived(makeBeat(brushKind, 0, "placement-brush"));
  const newId = () => crypto.randomUUID();
  const label = (block: Block) =>
    block.type === "effect"
      ? `${effectById(block.effectId)?.name} · ${effectById(block.effectId)?.strength}`
      : "Custom pulse";
  const persist = () => {
    try {
      localStorage.setItem("haptic-studio-draft-v1", JSON.stringify(signature));
    } catch {
      error = "Browser storage is full. Download JSON to keep your work.";
    }
  };
  function downloadFile(content: string, filename: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function closeFileMenu() {
    fileOpen = false;
    filePane = "main";
  }
  function save() {
    closeFileMenu();
    newAfterSave = false;
    if (!currentProjectId) {
      projectName = projectName || "Untitled signature";
      saveDialog = true;
      return;
    }
    writeProject(currentProjectId, projectName);
  }
  function writeProject(id: string, name: string): boolean {
    const cleanName = name.trim();
    if (!cleanName) {
      error = "Enter a project name before saving.";
      return false;
    }
    try {
      projects = putProject(localStorage, {
        id,
        name: cleanName,
        signature: $state.snapshot(signature),
        updatedAt: new Date().toISOString(),
      });
      currentProjectId = id;
      projectName = cleanName;
      savedSnapshot = JSON.stringify(signature);
      localStorage.setItem("haptic-studio-active-project-v1", id);
      saveDialog = false;
      notice = `Saved “${cleanName}” in this browser.`;
      return true;
    } catch {
      error =
        "Could not save project in browser storage. Download JSON to keep your work.";
      return false;
    }
  }
  function saveNamed() {
    if (writeProject(crypto.randomUUID(), projectName) && newAfterSave)
      startFresh();
  }
  function startFresh() {
    signature = emptySignature();
    selectedId = null;
    currentProjectId = null;
    projectName = "";
    savedSnapshot = JSON.stringify(signature);
    localStorage.removeItem("haptic-studio-active-project-v1");
    persist();
    error = "";
    notice = "New signature ready. Add an effect or pulse to begin.";
    newDialog = false;
    newAfterSave = false;
    view = "studio";
  }
  function requestNew() {
    closeFileMenu();
    if (dirty) newDialog = true;
    else startFresh();
  }
  function saveAndNew() {
    newDialog = false;
    if (currentProjectId) {
      if (writeProject(currentProjectId, projectName)) startFresh();
    } else {
      newAfterSave = true;
      projectName = projectName || "Untitled signature";
      saveDialog = true;
    }
  }
  function saveAs() {
    closeFileMenu();
    downloadFile(
      JSON.stringify(signature, null, 2),
      `${fileStem(projectName)}.json`,
      "application/json",
    );
    notice = "JSON downloaded.";
  }
  function applyOpen(next: {
    signature: Signature;
    name: string;
    id: string | null;
  }) {
    signature = next.signature;
    selectedId = next.signature.blocks[0]?.id ?? null;
    currentProjectId = next.id;
    projectName = next.name;
    savedSnapshot = JSON.stringify(next.id ? next.signature : emptySignature());
    if (next.id)
      localStorage.setItem("haptic-studio-active-project-v1", next.id);
    else localStorage.removeItem("haptic-studio-active-project-v1");
    persist();
    error = "";
    notice = next.id
      ? `Opened “${next.name}”.`
      : `Imported “${next.name}”. Save to keep it in this browser.`;
    projectsDialog = false;
    replaceDialog = false;
    pendingOpen = null;
  }
  function requestOpen(next: {
    signature: Signature;
    name: string;
    id: string | null;
  }) {
    closeFileMenu();
    projectsDialog = false;
    if (dirty) {
      pendingOpen = next;
      replaceDialog = true;
    } else applyOpen(next);
  }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      error = "JSON file is too large. Choose a signature under 1 MB.";
      return;
    }
    try {
      const imported = parseProjectFile(await file.text());
      requestOpen({
        signature: imported,
        name: file.name.replace(/\.json$/i, ""),
        id: null,
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not open file.";
    }
  }
  function downloadCode() {
    if (validation) return;
    downloadFile(code, `${fileStem(projectName)}.cpp`, "text/x-c++src");
  }
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
  function makeBeat(
    kind: number | "pulse",
    startMs: number,
    id: string,
  ): Block {
    return kind === "pulse"
      ? {
          id,
          type: "pulse",
          startMs,
          durationMs: 320,
          keyframes: [
            { timeMs: 0, amplitudePercent: 0 },
            { timeMs: 80, amplitudePercent: 75 },
            { timeMs: 320, amplitudePercent: 0 },
          ],
        }
      : { id, type: "effect", startMs, effectId: kind };
  }
  function placeBeat(startMs: number, kind: number | "pulse" = brushKind) {
    const block = makeBeat(kind, startMs, newId());
    updateBlock(block);
  }
  function dragEffect(event: DragEvent, kind: number | "pulse") {
    brushKind = kind;
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/x-haptic-beat", String(kind));
      event.dataTransfer.effectAllowed = "copy";
    }
  }
  function updateBlock(replacement: Block) {
    const result = editTimeline(signature.blocks, replacement);
    if (result.error) {
      error = result.error;
      return;
    }
    commit(result.blocks, replacement.id);
  }
  function removeBlock(id: string) {
    commit(signature.blocks.filter((block) => block.id !== id));
    if (selectedId === id) selectedId = signature.blocks[0]?.id ?? null;
  }
  function moveBlock(id: string, direction: -1 | 1) {
    const block = signature.blocks.find((item) => item.id === id);
    if (block)
      updateBlock({
        ...block,
        startMs: Math.max(0, snapTime(block.startMs) + direction * GRID_MS),
      });
  }
  function changeDuration(block: PulseBlock, value: number) {
    if (!Number.isFinite(value)) return;
    updateBlock(resizePulse(block, value));
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
    if (busy || connected) return;
    busy = true;
    error = "";
    try {
      const device = new StudioSerial();
      serial = device;
      device.onMessage = deviceMessage;
      device.onDisconnect = (reason) => {
        connected = false;
        deviceOpen = false;
        firmwareProfile = null;
        calibrated = false;
        playing = false;
        notice = reason;
      };
      const ready = await device.connect();
      connected = true;
      firmwareProfile =
        typeof ready.profile === "string" ? ready.profile : null;
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
    if (!serial || busy || playing) return;
    calibrating = true;
    busy = true;
    notice = "Calibrating LRA…";
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
      calibrating = false;
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
      projects = readProjects(localStorage);
      const activeId = localStorage.getItem("haptic-studio-active-project-v1");
      const active = projects.find((item) => item.id === activeId);
      if (active) {
        currentProjectId = active.id;
        projectName = active.name;
        savedSnapshot = JSON.stringify(active.signature);
      }
      const saved = localStorage.getItem("haptic-studio-draft-v1");
      const parsed = parseDraft(saved);
      if (parsed) {
        signature = parsed;
        selectedId = parsed.blocks[0]?.id ?? null;
        notice = "Local draft restored.";
      } else if (saved) {
        if (active) {
          signature = active.signature;
          selectedId = active.signature.blocks[0]?.id ?? null;
          notice = "Invalid recovery draft. Opened last saved project.";
        } else notice = "Saved draft was invalid. Started fresh.";
      } else if (active) {
        signature = active.signature;
        selectedId = active.signature.blocks[0]?.id ?? null;
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
  ><title>LRA LAB</title><meta
    name="description"
    content="Compose and preview five-second LRA haptic signatures."
  /></svelte:head
>
<main>
  <header class="topbar">
    <div class="file-area">
      <Popover
        bind:open={fileOpen}
        label="File menu"
        align="start"
        theme="dark"
        triggerClass="file-trigger"
      >
        {#snippet trigger()}<span>File</span><span
            class="file-chevron"
            aria-hidden="true">⌄</span
          >{/snippet}
        <div class="file-menu">
          {#if filePane === "main"}
            <p class="file-menu-label">PROJECT</p>
            <button onclick={requestNew}>New <small>Fresh canvas</small></button
            >
            <button onclick={save}>Save <small>Browser</small></button>
            <button onclick={saveAs}>Save As <small>JSON ↓</small></button>
            <button onclick={() => (filePane = "open")}
              >Open <span aria-hidden="true">→</span></button
            >
            <div class="file-menu-divider"></div>
            <button
              onclick={() => {
                closeFileMenu();
                codeDialog = true;
              }}>Generate Code <small>C++</small></button
            >
            <button
              onclick={() => {
                closeFileMenu();
                settingsDialog = true;
              }}>Settings <small>View</small></button
            >
          {:else}
            <button class="file-back" onclick={() => (filePane = "main")}
              >← File</button
            >
            <p class="file-menu-label">OPEN PROJECT</p>
            <button
              onclick={() => {
                closeFileMenu();
                projects = readProjects(localStorage);
                projectsDialog = true;
              }}>Browser projects</button
            >
            <button
              onclick={() => {
                closeFileMenu();
                fileInput?.click();
              }}>From computer <small>JSON</small></button
            >
          {/if}
        </div>
      </Popover>
      <span class="current-project"
        >{projectName || "Untitled Haptic Signature"}{#if dirty}<i
            aria-label="Unsaved changes"
          ></i>{/if}</span
      >
    </div>
    <button
      class="sequence-meter"
      class:expanded={sequenceExpanded}
      aria-label="Expand sequence length"
      aria-pressed={sequenceExpanded}
      onclick={() => (sequenceExpanded = !sequenceExpanded)}
    >
      <span class="sequence-clock"
        ><span>{(total / 1000).toFixed(2)}</span><small>/ 5.00 SEC</small></span
      >
      <span class="sequence-progress" aria-hidden="true"
        ><span style:transform={`scaleX(${total / MAX_MS})`}></span></span
      >
      <span class="sequence-label">SEQUENCE LENGTH</span>
    </button>
    <div class="top-right">
      {#if connected}
        <Popover
          bind:open={deviceOpen}
          label="Board connection and calibration"
          theme="dark"
          triggerClass="board-button board-connected"
        >
          {#snippet trigger()}
            <span
              class="status-dot"
              class:online={calibrated}
              class:needs-calibration={!calibrated}
            ></span>
            <span>{calibrated ? "Board connected" : "Needs calibration"}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
            >
          {/snippet}
          <div class="board-popover">
            <strong>Board connected</strong>
            <Badge variant={calibrated ? "success" : "neutral"}
              >{calibrated ? "CALIBRATED" : "NEEDS CALIBRATION"}</Badge
            >
            <p role="status">{notice}</p>
            {#if error}<p class="board-error" role="alert">{error}</p>{/if}
            <Button
              variant="secondary"
              onclick={calibrate}
              disabled={busy || playing}
              >{calibrating
                ? "Calibrating…"
                : calibrated
                  ? "Recalibrate"
                  : "Calibrate"}</Button
            >
            <div class="file-menu-divider"></div>
            <button
              class="board-disconnect"
              disabled={busy || playing}
              onclick={async () => {
                deviceOpen = false;
                try {
                  await serial?.disconnect();
                  connected = false;
                  calibrated = false;
                  firmwareProfile = null;
                  notice = "Board disconnected. Editor works offline.";
                } catch (cause) {
                  error =
                    cause instanceof Error
                      ? cause.message
                      : "Could not disconnect.";
                }
              }}>Disconnect</button
            >
          </div>
        </Popover>
      {:else}
        <button class="board-button" onclick={connect} disabled={busy}
          >{busy ? "Connecting…" : "Connect board"}</button
        >
      {/if}
      <button
        class="setup-button"
        onclick={() => (view = view === "studio" ? "setup" : "studio")}
        >{view === "studio" ? "Setup" : "Studio"}
        <span aria-hidden="true">↗</span></button
      >
    </div>
  </header>
  <input
    class="visually-hidden"
    type="file"
    accept=".json,application/json"
    bind:this={fileInput}
    onchange={importFile}
    aria-label="Open JSON from computer"
  />
  {#if view === "setup"}
    <SetupView
      {connected}
      {calibrated}
      {busy}
      {notice}
      {error}
      onConnect={connect}
      onCalibrate={calibrate}
      onExit={() => (view = "studio")}
    />
  {:else}
    <div class="content">
      <section class="hero" hidden>
        <div>
          <p class="kicker">01 / COMPOSE</p>
          <h1>Shape the <em>feel.</em></h1>
          <p class="hero-copy" hidden>
            Build a tactile signature, then feel it on hardware. Every moment
            lives on one five-second canvas.
          </p>
        </div>
      </section>
      <p class="studio-notice" role="status" hidden>{notice}</p>
      {#if error}<div class="error-banner" role="alert">
          <strong>CHECK THIS</strong><span>{error}</span><button
            onclick={() => (error = "")}
            aria-label="Dismiss error">×</button
          >
        </div>{/if}
      <div class="workspace">
        <div class="editor-column">
          <section class="timeline-section">
            <div class="section-head timeline-head">
              <div>
                <h2>Haptic sequencer</h2>
                <p>Pattern 01 · single track · 40 ms grid</p>
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
            <HapticTimeline
              blocks={signature.blocks}
              {selectedId}
              {brush}
              onselect={(id) => (selectedId = id)}
              onplace={placeBeat}
              onedit={updateBlock}
              onremove={removeBlock}
            />
          </section>
          <section class="inspector">
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
              <div class="inspector-fields">
                {#if selected.type === "effect"}<div class="form-grid">
                    <label style:grid-column="1 / -1"
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
                    >
                  </div>
                  <div class="duration-field">
                    <span class="group-label">FIXED SLOT</span>
                    {#key selected.id}
                      <ScrubField
                        label="Duration"
                        suffix="ms"
                        value={blockDuration(selected)}
                        defaultValue={blockDuration(selected)}
                        min={0}
                        max={MAX_MS}
                        size="lg"
                        accent="#80b4ff"
                        chipColor="var(--surface)"
                        disabled
                      />
                    {/key}
                  </div>
                {:else}<div class="duration-field">
                    <span class="group-label">PULSE DURATION</span>
                    {#key selected.id}
                      <ScrubField
                        label="Duration"
                        suffix="ms"
                        value={selected.durationMs}
                        defaultValue={320}
                        min={GRID_MS}
                        max={Math.floor((MAX_MS - selected.startMs) / GRID_MS) *
                          GRID_MS}
                        step={GRID_MS}
                        fineMultiplier={1}
                        size="lg"
                        accent="#80b4ff"
                        chipColor="var(--surface)"
                        onChange={(value) =>
                          changeDuration(selected as PulseBlock, value)}
                      />
                    {/key}
                  </div>{/if}
              </div>
              <div class="arrange">
                <span>NUDGE · 40 MS</span><button
                  onclick={() => moveBlock(selected!.id, -1)}
                  disabled={selected.startMs <= 0}>← Earlier</button
                ><button
                  onclick={() => moveBlock(selected!.id, 1)}
                  disabled={selected.startMs +
                    blockDuration(selected) +
                    GRID_MS >
                    MAX_MS}>Later →</button
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
                Click a beat to edit its feel. Drag it on the grid to change its
                start time.
              </div>{/if}
          </section>
        </div>
        <section class="palette">
          <div class="section-head">
            <div>
              <h2>Effect library</h2>
              <p>Choose a beat, then click the grid</p>
            </div>
          </div>
          <div class="palette-group">
            <span class="group-label">BUILT-IN IMPULSES</span>
            <BuiltInImpulses
              selectedId={brushKind}
              onselect={(id) => (brushKind = id)}
              ondragstart={dragEffect}
            />
          </div>
          <div class="palette-group pulse-group">
            <span class="group-label">MAKE YOUR OWN</span><button
              class="pulse-choice"
              class:active-effect={brushKind === "pulse"}
              aria-pressed={brushKind === "pulse"}
              onclick={() => (brushKind = "pulse")}
              draggable="true"
              ondragstart={(event) => dragEffect(event, "pulse")}
              ><span class="pulse-icon">〰</span><span
                ><strong>Custom pulse</strong><small
                  >Shape amplitude over time</small
                ></span
              ><span>↗</span></button
            >
          </div>
        </section>
      </div>
    </div>
  {/if}
</main>

<Dialog
  bind:open={newDialog}
  title="Start new signature?"
  description="Current changes are not saved to a browser project."
  theme="dark"
>
  <div class="studio-dialog-body">
    <p>Save these changes before clearing the canvas?</p>
    <div class="dialog-actions">
      <button onclick={() => (newDialog = false)}>Cancel</button>
      <button onclick={startFresh}>Don't Save</button>
      <button class="dialog-primary" onclick={saveAndNew}>Save changes</button>
    </div>
  </div>
</Dialog>
<Dialog
  bind:open={saveDialog}
  title="Save project"
  description="Keep this signature in your browser."
  theme="dark"
>
  <div class="studio-dialog-body">
    <label class="dialog-label" for="project-name">PROJECT NAME</label><input
      id="project-name"
      class="dialog-input"
      bind:value={projectName}
      maxlength="80"
      onkeydown={(event) => {
        if (event.key === "Enter") saveNamed();
      }}
    />
    <p>Stored in this browser profile. Use Save As for a portable JSON file.</p>
    <div class="dialog-actions">
      <button
        onclick={() => {
          saveDialog = false;
          newAfterSave = false;
        }}>Cancel</button
      ><button
        class="dialog-primary"
        onclick={saveNamed}
        disabled={!projectName.trim()}>Save project</button
      >
    </div>
  </div>
</Dialog>
<Dialog
  bind:open={projectsDialog}
  title="Open browser project"
  description="Projects saved in this browser profile."
  theme="dark"
>
  <div class="studio-dialog-body project-list">
    {#if projects.length}{#each projects as project (project.id)}<button
          onclick={() =>
            requestOpen({
              signature: project.signature,
              name: project.name,
              id: project.id,
            })}
          ><strong>{project.name}</strong><span
            >Edited {new Date(project.updatedAt).toLocaleDateString()}</span
          ></button
        >{/each}{:else}<p>
        No browser projects yet. Use File → Save to create one.
      </p>{/if}
  </div>
</Dialog>
<Dialog
  bind:open={replaceDialog}
  title="Open another project?"
  description="Current unsaved edits will be replaced."
  theme="dark"
>
  <div class="studio-dialog-body">
    <p>Save current project first if you want to keep these changes.</p>
    <div class="dialog-actions">
      <button
        onclick={() => {
          replaceDialog = false;
          pendingOpen = null;
        }}>Keep editing</button
      ><button
        class="dialog-primary"
        onclick={() => {
          if (pendingOpen) applyOpen(pendingOpen);
        }}>Discard edits and open</button
      >
    </div>
  </div>
</Dialog>
<Dialog
  bind:open={codeDialog}
  title="Generate Code"
  description="Arduino C++ for your current signature."
  theme="dark"
>
  <div class="studio-dialog-body code-dialog">
    {#if validation}<div class="code-placeholder">
        {validation}
      </div>{:else}<pre><code>{code}</code></pre>{/if}
    <div class="dialog-actions">
      <button onclick={() => (codeDialog = false)}>Close</button><button
        onclick={copyCode}
        disabled={!!validation}>{copied ? "Copied ✓" : "Copy"}</button
      ><button
        class="dialog-primary"
        onclick={downloadCode}
        disabled={!!validation}>Download .cpp ↓</button
      >
    </div>
  </div>
</Dialog>
<Dialog
  bind:open={settingsDialog}
  title="LRA settings"
  description="Current profile and firmware defaults. Editing arrives with firmware support."
  theme="dark"
>
  <div class="studio-dialog-body settings-dialog">
    <div class="settings-status">
      <span class:online={connected} class="status-dot"></span><strong
        >{connected ? "Board connected" : "Board offline"}</strong
      ><span
        >{connected
          ? calibrated
            ? "Calibrated"
            : "Needs calibration"
          : "Connect board for live status"}</span
      >
    </div>
    <dl>
      <div>
        <dt>Firmware profile</dt>
        <dd>{firmwareProfile ?? "Connect board to read"}</dd>
      </div>
      <div>
        <dt>Driver</dt>
        <dd>DRV2605L · library 6</dd>
      </div>
      <div>
        <dt>Rated voltage register</dt>
        <dd>0x32</dd>
      </div>
      <div>
        <dt>Overdrive clamp register</dt>
        <dd>0x4F</dd>
      </div>
      <div>
        <dt>Drive time register</dt>
        <dd>0x18</dd>
      </div>
    </dl>
    <p>
      Register values shown are compiled firmware defaults, not live readbacks.
      Check your actuator rating before preview.
    </p>
  </div>
</Dialog>

<style>
  .inspector-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
    gap: 14px;
  }
  .duration-field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding-right: 25px;
  }
  .duration-field:first-child {
    grid-column: 1 / -1;
    padding-left: 25px;
  }
  @media (max-width: 500px) {
    .inspector-fields {
      grid-template-columns: minmax(0, 1fr);
    }
    .duration-field {
      padding-left: 25px;
    }
  }
  .editor-column {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
  }
  .timeline-section,
  .inspector {
    min-width: 0;
  }
  .timeline-head {
    flex-wrap: wrap;
  }
  .timeline-controls {
    justify-content: flex-end;
  }
  .inspector-top {
    border-top: 0;
    padding-top: 0;
  }
  .pulse-choice.active-effect {
    background: var(--surface-soft);
    box-shadow: inset 0 0 0 1px var(--accent-bright);
  }
</style>
