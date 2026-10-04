<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import SetupView from "$lib/components/setup/SetupView.svelte";
  import { BUZZ_SIGNATURE, SetupState } from "$lib/setup.svelte";
  import { FirmwareAccess } from "$lib/firmware-access.svelte";
  import { deriveLra, derivePins, profileLabel } from "$lib/lra-profile";
  import StudioDialog from "$lib/components/studio/dialogs/StudioDialog.svelte";
  import PulseLibrary from "$lib/components/PulseLibrary.svelte";
  import type { FileAction } from "$lib/components/header/FileMenu.svelte";
  import StudioTopBar from "$lib/components/studio/StudioTopBar.svelte";
  import SequenceCard from "$lib/components/studio/SequenceCard.svelte";
  import InspectorCard from "$lib/components/studio/InspectorCard.svelte";
  import LibraryCard from "$lib/components/studio/LibraryCard.svelte";
  import ErrorToast from "$lib/components/studio/ErrorToast.svelte";
  import NewSignatureDialog from "$lib/components/studio/dialogs/NewSignatureDialog.svelte";
  import SaveProjectDialog from "$lib/components/studio/dialogs/SaveProjectDialog.svelte";
  import OpenProjectDialog from "$lib/components/studio/dialogs/OpenProjectDialog.svelte";
  import ReplaceProjectDialog from "$lib/components/studio/dialogs/ReplaceProjectDialog.svelte";
  import CodeDialog from "$lib/components/studio/dialogs/CodeDialog.svelte";
  import SettingsDialog from "$lib/components/studio/dialogs/SettingsDialog.svelte";
  import ChangelogDialog from "$lib/components/studio/dialogs/ChangelogDialog.svelte";
  import {
    clonePulse,
    defaultPulse,
    type BrushKind,
    type PulsePreset,
  } from "$lib/pulse-library";
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
    MAX_MS,
    durationOf,
    emptySignature,
    parseDraft,
    validateSignature,
    type Block,
    type PulseBlock,
    type Signature,
  } from "$lib/signature";
  import { exportCpp } from "$lib/export";
  import { Playback } from "$lib/playback.svelte";

  let connected = $state(false);
  let firmwareProfile = $state<string | null>(null);
  const setup = new SetupState();
  if (typeof window !== "undefined") {
    try { setup.load(localStorage); } catch { /* Storage may be blocked. */ }
  }
  $effect(() => {
    try { setup.save(localStorage); } catch { /* Keep session state usable. */ }
  });
  const firmwareAccess = new FirmwareAccess();
  let firmwareDialog = $state(false);
  let expectedProfile = $derived.by(() => {
    const profile = deriveLra(setup.lra).profile;
    const pins = derivePins(setup.pins).pins;
    return profile && pins ? profileLabel(profile, pins) : null;
  });
  let setupInputs = $derived(JSON.stringify([setup.lra, setup.pins, setup.route, setup.boardId, setup.nativeUsb]));
  let firmwareStatus = $derived(firmwareAccess.status(firmwareProfile, expectedProfile));
  let hardwareAllowed = $derived(connected && firmwareAccess.allowed(firmwareProfile, expectedProfile, setupInputs));
  function requireHardwareAccess() {
    if (hardwareAllowed) return true;
    if (connected && firmwareStatus === "unverified") firmwareDialog = true;
    error = firmwareStatus === "mismatch"
      ? "Firmware does not match your setup. Upload matching firmware and reconnect."
      : "Review and acknowledge the unverified firmware before using hardware.";
    return false;
  }
  let signature = $state<Signature>(emptySignature());
  let selectedId = $state<string | null>(null);
  let calibrated = $state(false);
  const playback = new Playback();
  let playing = $derived(playback.active);
  let boardPlaying = $derived(playing && playback.source === "board");
  let busy = $state(false);
  let notice = $state("Connect board to preview. Editor works offline.");
  let error = $state("");
  let libraryToast = $state("");
  let libraryToastTimeout: ReturnType<typeof setTimeout>;
  function showLibraryNotice(message: string) {
    notice = message;
    libraryToast = message;
    clearTimeout(libraryToastTimeout);
    libraryToastTimeout = setTimeout(() => (libraryToast = ""), 4000);
  }
  onDestroy(() => clearTimeout(libraryToastTimeout));
  let view = $state<"studio" | "setup">("studio");
  let calibrating = $state(false);
  let saveDialog = $state(false);
  let newDialog = $state(false);
  let newAfterSave = false;
  let projectsDialog = $state(false);
  let codeDialog = $state(false);
  let settingsDialog = $state(false);
  let changelogDialog = $state(false);
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
  let pulseLibrary = $state<ReturnType<typeof PulseLibrary>>();
  let libraryDraft = $state<PulsePreset | null>(null);
  let presets = $state<PulsePreset[]>([]);
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
  let brushKind = $state<BrushKind>(1);
  let brush = $derived(makeBeat(brushKind, 0, "placement-brush"));
  let boardReady = $derived(hardwareAllowed && calibrated);
  let canPreview = $derived(!validation && !busy && !playing);
  let previewHint = $derived(
    validation ??
      (boardReady
        ? "Play on board"
        : connected && !hardwareAllowed
          ? "Simulate preview · review firmware before hardware playback"
          : connected
          ? "Simulate preview · calibrate the board to play on hardware"
          : "Simulate preview · no board needed"),
  );
  let playhead = $derived(
    playback.status === "idle"
      ? null
      : { ms: playback.positionMs, status: playback.status },
  );
  $effect(() => {
    void signature;
    untrack(() => playback.clear());
  });
  $effect(() => {
    if (playback.status === "completed")
      untrack(() => (notice = "Preview finished."));
  });
  let pointBudget = $derived(
    32 -
      signature.blocks.reduce(
        (sum, block) =>
          sum +
          (block.type === "pulse" && block.id !== selectedId
            ? block.keyframes.length
            : 0),
        0,
      ),
  );
  const newId = () => crypto.randomUUID();
  function leaveLibrary(action: () => void): boolean {
    if (pulseLibrary) return pulseLibrary.leave(action);
    action();
    return true;
  }
  function selectBeat(id: string) {
    return leaveLibrary(() => (selectedId = id));
  }
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
  function fileAction(action: FileAction) {
    leaveLibrary(() => {
      if (action === "new") requestNew();
      else if (action === "open") {
        projects = readProjects(localStorage);
        projectsDialog = true;
      } else if (action === "import") fileInput?.click();
      else if (action === "save") save();
      else if (action === "export") saveAs();
      else if (action === "code") codeDialog = true;
      else if (action === "settings") settingsDialog = true;
      else if (action === "changelog") changelogDialog = true;
    });
  }
  function save() {
    newAfterSave = false;
    if (!currentProjectId) {
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
  function saveNamed(name: string) {
    if (writeProject(crypto.randomUUID(), name) && newAfterSave) startFresh();
  }
  function cancelSave() {
    saveDialog = false;
    newAfterSave = false;
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
    if (dirty) newDialog = true;
    else startFresh();
  }
  function saveAndNew() {
    newDialog = false;
    if (currentProjectId) {
      if (writeProject(currentProjectId, projectName)) startFresh();
    } else {
      newAfterSave = true;
      saveDialog = true;
    }
  }
  function saveAs() {
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
  function makeBeat(kind: BrushKind, startMs: number, id: string): Block {
    if (typeof kind === "number")
      return { id, type: "effect", startMs, effectId: kind };
    const preset = kind.startsWith("preset:")
      ? presets.find((p) => p.id === kind.slice(7))
      : undefined;
    return clonePulse(preset ?? defaultPulse(), id, startMs);
  }
  function placeBeat(startMs: number, kind: BrushKind = brushKind) {
    leaveLibrary(() => updateBlock(makeBeat(kind, startMs, newId())));
  }
  function dragEffect(event: DragEvent, kind: BrushKind) {
    if (libraryDraft && !leaveLibrary(() => (brushKind = kind))) {
      event.preventDefault();
      return;
    }
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
  function deviceMessage(message: DeviceMessage) {
    if (!boardPlaying) {
      if (message.type === "ERROR")
        error = String(message.message || "Board fault.");
      return;
    }
    if (message.type === "DONE") playback.finish();
    if (message.type === "STOPPED") {
      playback.stop();
      notice = "Preview stopped.";
    }
    if (message.type === "ERROR") {
      playback.stop("failed");
      error = String(message.message || "Board fault.");
    }
  }
  async function connect() {
    if (busy || connected) return;
    busy = true;
    error = "";
    firmwareAccess.reset();
    try {
      const device = new StudioSerial();
      serial = device;
      device.onMessage = deviceMessage;
      device.onDisconnect = (reason) => {
        firmwareAccess.reset();
        firmwareDialog = false;
        connected = false;
        firmwareProfile = null;
        calibrated = false;
        if (boardPlaying) playback.stop("failed");
        notice = reason;
      };
      const ready = await device.connect();
      connected = true;
      firmwareProfile =
        typeof ready.profile === "string" ? ready.profile : null;
      calibrated = ready.calibrated === true;
      if (firmwareStatus === "unverified") firmwareDialog = true;
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
    if (!serial || busy || boardPlaying || !requireHardwareAccess()) return;
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
  async function disconnect() {
    firmwareAccess.reset();
    firmwareDialog = false;
    try {
      if (boardPlaying) playback.stop();
      await serial?.disconnect();
      connected = false;
      calibrated = false;
      firmwareProfile = null;
      notice = "Board disconnected. Editor works offline.";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not disconnect.";
    }
  }
  async function preview() {
    if (validation || busy || playing) return;
    const device = boardReady ? serial : null;
    playback.prime();
    playback.begin(
      $state.snapshot(signature),
      device ? "board" : "simulation",
    );
    error = "";
    if (!device) {
      playback.run();
      notice = "Simulating preview. Output is an approximation.";
      return;
    }
    busy = true;
    try {
      if (await device.play(signature, { canPlay: () => serial === device && boardReady })) {
        playback.run();
        notice = "Playing signature on board…";
      } else playback.stop();
    } catch (cause) {
      playback.stop("failed");
      error = cause instanceof Error ? cause.message : "Preview failed.";
    } finally {
      busy = false;
    }
  }
  async function buzz(): Promise<boolean> {
    if (!boardReady || !serial || busy || playing) return false;
    const device = serial;
    playback.prime();
    playback.begin(structuredClone(BUZZ_SIGNATURE), "board");
    error = "";
    busy = true;
    try {
      if (await setup.runTest(() => device.play(BUZZ_SIGNATURE, {
        waitForDone: true,
        canPlay: () => serial === device && boardReady,
        onPlaying: () => {
          playback.run();
          notice = "Playing test signature on board…";
        },
      }))) {
        notice = "Test signature completed.";
        return true;
      }
      playback.stop("failed");
      if (!error) error = "Test signature did not complete. Run it again when the board is ready.";
      return false;
    } catch (cause) {
      playback.stop("failed");
      error = cause instanceof Error ? cause.message : "Test signature failed.";
      return false;
    } finally {
      busy = false;
    }
  }
  async function stop() {
    if (!playing) return;
    if (playback.source === "simulation" || !serial) {
      playback.stop();
      notice = "Preview stopped.";
      return;
    }
    try {
      await serial.stop();
      playback.stop();
      notice = "Preview stopped.";
    } catch (cause) {
      playback.stop("failed");
      error = cause instanceof Error ? cause.message : "Stop failed.";
    }
  }
  function playbackShortcut(event: KeyboardEvent) {
    if (
      event.code !== "Space" ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      view !== "studio" ||
      document.querySelector('[role="dialog"], [role="alertdialog"]')
    )
      return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest(
          'input, textarea, select, button, a[href], [role="button"], [role="menu"], [role="menuitem"], [role="slider"], [role="textbox"]',
        ))
    )
      return;

    if (!playing && !canPreview) return;
    event.preventDefault();
    if (event.repeat) return;
    if (playing) void stop();
    else void preview();
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
      playback.dispose();
    };
  });
</script>

<svelte:window onkeydown={playbackShortcut} />

<svelte:head
  ><title>LRA LAB</title><meta
    name="description"
    content="Compose and preview five-second LRA haptic signatures."
  /></svelte:head
>
<main class="lab">
  <StudioTopBar
    {playback}
    project={projectName || "Untitled signature"}
    {dirty}
    {view}
    totalMs={total}
    maxMs={MAX_MS}
    beats={signature.blocks.length}
    {connected}
    {calibrated}
    {calibrating}
    {hardwareAllowed}
    {busy}
    playing={boardPlaying}
    {notice}
    {error}
    onhome={() => leaveLibrary(() => (view = "studio"))}
    onfile={fileAction}
    onconnect={connect}
    oncalibrate={calibrate}
    ondisconnect={disconnect}
    onstop={stop}
    ontoggleview={() =>
      leaveLibrary(() => (view = view === "studio" ? "setup" : "studio"))}
  />
  {#if connected && !hardwareAllowed}
    <aside class="firmware-notice" role="status">
      <p>{firmwareStatus === "mismatch"
        ? "Firmware does not match your setup. Upload matching firmware and reconnect before using hardware."
        : "Firmware settings are unverified. Review them before calibration or hardware playback."}</p>
      <button onclick={() => firmwareStatus === "mismatch" ? (view = "setup") : (firmwareDialog = true)}>
        {firmwareStatus === "mismatch" ? "Open setup" : "Review firmware"}
      </button>
    </aside>
  {/if}
  <input
    class="visually-hidden"
    type="file"
    accept=".json,application/json"
    bind:this={fileInput}
    onchange={importFile}
    aria-label="Open JSON from computer"
  />
  <p class="visually-hidden" role="status">{notice}</p>
  {#if view === "setup"}
    <SetupView
      {setup}
      {hardwareAllowed}
      {connected}
      {calibrated}
      {calibrating}
      {busy}
      playing={boardPlaying}
      {error}
      {firmwareProfile}
      onconnect={connect}
      oncalibrate={calibrate}
      onbuzz={buzz}
      onexit={() => (view = "studio")}
    />
  {:else}
    <div class="lab-grid">
      <SequenceCard
        blocks={signature.blocks}
        {selectedId}
        {brush}
        {playhead}
        {canPreview}
        canStop={playing}
        {playing}
        {previewHint}
        hasPreset={(id) => presets.some((p) => p.id === id)}
        onpreview={preview}
        onstop={stop}
        onselect={selectBeat}
        onplace={placeBeat}
        onedit={(block) => leaveLibrary(() => updateBlock(block))}
        onremove={(id) => leaveLibrary(() => removeBlock(id))}
      />
      <InspectorCard
        block={selected}
        maxPoints={pointBudget}
        draft={libraryDraft}
        draftEditing={presets.some((p) => p.id === libraryDraft?.id)}
        draftError={pulseLibrary?.errorMessage() ?? ""}
        onupdate={updateBlock}
        onremove={removeBlock}
        onmove={moveBlock}
        onduration={changeDuration}
        onsavepulse={(block) => pulseLibrary?.create(undefined, block)}
        ondraftchange={(draft) => (libraryDraft = draft)}
        ondraftsave={() => pulseLibrary?.save()}
        ondraftcancel={() => pulseLibrary?.cancel()}
      />
      <LibraryCard
        customActive={brushKind === "pulse"}
        onpickcustom={() => leaveLibrary(() => (brushKind = "pulse"))}
        ondragcustom={(event) => dragEffect(event, "pulse")}
      >
        <PulseLibrary
          bind:this={pulseLibrary}
          bind:draft={libraryDraft}
          bind:presets
          selectedId={brushKind}
          onselect={(id) => (brushKind = id)}
          ondragstart={dragEffect}
          onnotice={showLibraryNotice}
        />
      </LibraryCard>
    </div>
  {/if}
  {#if error && view !== "setup"}
    <ErrorToast message={error} ondismiss={() => (error = "")} />
  {:else if libraryToast}
    <ErrorToast
      message={libraryToast}
      tone="notice"
      ondismiss={() => (libraryToast = "")}
    />
  {/if}
</main>

<NewSignatureDialog
  open={newDialog}
  onclose={() => (newDialog = false)}
  ondiscard={startFresh}
  onsave={saveAndNew}
/>
<SaveProjectDialog
  open={saveDialog}
  name={projectName || "Untitled signature"}
  onclose={cancelSave}
  onsave={saveNamed}
/>
<OpenProjectDialog
  open={projectsDialog}
  {projects}
  onclose={() => (projectsDialog = false)}
  onopen={(project) =>
    requestOpen({
      signature: project.signature,
      name: project.name,
      id: project.id,
    })}
/>
<ReplaceProjectDialog
  open={replaceDialog}
  onclose={() => {
    replaceDialog = false;
    pendingOpen = null;
  }}
  ondiscard={() => {
    if (pendingOpen) applyOpen(pendingOpen);
  }}
/>
<CodeDialog
  open={codeDialog}
  {code}
  {validation}
  onclose={() => (codeDialog = false)}
  ondownload={downloadCode}
  onerror={(message) => (error = message)}
/>
<SettingsDialog
  open={settingsDialog}
  {connected}
  {calibrated}
  {firmwareProfile}
  onclose={() => (settingsDialog = false)}
/>
<ChangelogDialog open={changelogDialog} onclose={() => (changelogDialog = false)} />

<style>
  .lab {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .lab-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(
        calc(var(--spacing-library-min) * 0.85),
        calc(var(--spacing-library) * 0.85)
      );
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      "sequence library"
      "inspector library";
    gap: 12px;
    padding: 0
      max(var(--spacing-page-gutter), calc((100% - var(--spacing-content)) / 2));
  }
  .lab-grid > :global(*) {
    min-height: 0;
  }
  @media (max-width: 62.5rem) {
    .lab-grid {
      grid-template-columns: minmax(0, 1fr);
      flex: none;
      grid-template-rows: none;
      grid-template-areas: "sequence" "inspector" "library";
    }
  }

  .firmware-notice {
    margin: 0 var(--spacing-page-gutter) 12px;
    padding: 12px 16px;
    border-radius: var(--radius-control);
    background: var(--color-warning-surface, var(--color-surface-raised));
    color: var(--color-ink);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .firmware-notice p { flex: 1; margin: 0; }

</style>


<StudioDialog open={firmwareDialog} onclose={() => (firmwareDialog = false)}
  title="Verify your firmware settings"
  description="This firmware's actuator settings could not be verified against your setup.">
  <div class="studio-dialog-body">
    <p>Check that the flashed voltage limits, resonance, and pins suit your LRA. Incorrect settings can damage the actuator. Acknowledgment applies only to this connection and these settings.</p>
    <p>Reported profile: {firmwareProfile ?? "Not provided"}</p>
    <div class="dialog-actions">
      <button onclick={() => (firmwareDialog = false)}>Cancel</button>
      <button class="dialog-primary" disabled={!connected || firmwareStatus !== "unverified"}
        onclick={() => {
          firmwareAccess.acknowledge(firmwareProfile, expectedProfile, setupInputs);
          firmwareDialog = false;
          error = "";
        }}>I checked the settings — allow hardware</button>
    </div>
  </div>
</StudioDialog>
