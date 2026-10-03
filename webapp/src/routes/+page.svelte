<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import SetupView from "$lib/SetupView.svelte";
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

  let signature = $state<Signature>(emptySignature());
  let selectedId = $state<string | null>(null);
  let connected = $state(false);
  let firmwareProfile = $state<string | null>(null);
  let calibrated = $state(false);
  let playing = $state(false);
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
  let canPreview = $derived(
    connected && calibrated && !validation && !busy && !playing,
  );
  let previewHint = $derived(
    !connected
      ? "Connect a board to preview"
      : !calibrated
        ? "Calibrate the board to preview"
        : (validation ?? "Play on board"),
  );
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
      else settingsDialog = true;
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
  async function disconnect() {
    try {
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
<main class="lab">
  <StudioTopBar
    project={projectName || "Untitled signature"}
    {dirty}
    {view}
    totalMs={total}
    maxMs={MAX_MS}
    beats={signature.blocks.length}
    {connected}
    {calibrated}
    {calibrating}
    {busy}
    {playing}
    {notice}
    {error}
    onhome={() => leaveLibrary(() => (view = "studio"))}
    onfile={fileAction}
    onconnect={connect}
    oncalibrate={calibrate}
    ondisconnect={disconnect}
    ontoggleview={() =>
      leaveLibrary(() => (view = view === "studio" ? "setup" : "studio"))}
  />
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
    <div class="lab-grid">
      <SequenceCard
        blocks={signature.blocks}
        {selectedId}
        {brush}
        {canPreview}
        canStop={connected && playing}
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
  {#if error}
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
</style>
