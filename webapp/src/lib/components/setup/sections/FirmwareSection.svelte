<script lang="ts">
  import {
    PIO_FOLDER,
    SKETCH_NAME,
    configLines,
    configureMain,
    firmwareArchive,
    type FirmwareConfig,
  } from "$lib/firmware";
  import { profileLabel } from "$lib/lra-profile";
  import type { SetupState } from "$lib/setup.svelte";
  import CodeBlock from "../CodeBlock.svelte";
  import Note from "../Note.svelte";
  import Segmented from "../Segmented.svelte";
  import SetupButton from "../SetupButton.svelte";
  import SetupSection from "../SetupSection.svelte";

  let {
    index,
    setup,
    config,
    done,
    ongoto,
  }: {
    index: number;
    setup: SetupState;
    config: Omit<FirmwareConfig, "nativeUsb" | "boardId"> | null;
    done: boolean;
    ongoto: (id: "lra" | "wiring") => void;
  } = $props();
  let error = $state("");

  const boardsUrl = "https://docs.platformio.org/en/latest/boards/index.html";
  const readmeUrl =
    "https://github.com/AddeyX/LRA-LAB/blob/main/firmware/README.md";
  let boardIdValid = $derived(/^[\w.-]+$/.test(setup.boardId.trim()));
  let full = $derived<FirmwareConfig | null>(
    config && {
      ...config,
      nativeUsb: setup.nativeUsb,
      boardId: setup.boardId,
    },
  );
  let canDownload = $derived(
    Boolean(full) && (setup.route === "arduino" || boardIdValid),
  );
  let preview = $derived(
    full
      ? [
          ...configLines(full),
          `// READY profile: ${profileLabel(full.profile, full.pins)}`,
        ].join("\n")
      : "",
  );

  function save(bytes: BlobPart, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function build(make: () => { bytes: BlobPart; filename: string; type: string }) {
    try {
      const file = make();
      save(file.bytes, file.filename, file.type);
      setup.downloaded = true;
      error = "";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not build firmware.";
    }
  }
  function download() {
    if (!full || !canDownload) return;
    const ready = full;
    build(() => {
      const archive = firmwareArchive(setup.route, ready);
      return { bytes: archive.bytes as BlobPart, filename: archive.filename, type: "application/zip" };
    });
  }
  function downloadMain() {
    if (!full) return;
    const ready = full;
    build(() => ({ bytes: configureMain(ready), filename: "main.cpp", type: "text/x-c++src" }));
  }
</script>

<SetupSection
  id="setup-firmware"
  {index}
  title="Flash the firmware"
  lead="Download firmware with your LRA settings and pins built in. Then upload it with Arduino IDE or PlatformIO."
  {done}
>
  <div class="route">
    <Segmented
      label="Upload tool"
      options={[
        { value: "arduino", label: "Arduino IDE" },
        { value: "platformio", label: "PlatformIO" },
      ]}
      value={setup.route}
      onchange={(value) => (setup.route = value)}
    />
    <label class="check">
      <input type="checkbox" bind:checked={setup.nativeUsb} />
      <span
        ><strong>Board uses native USB serial</strong><small
          >ESP32-C3, S3 or C6 plugged into its own USB port. Turn this off for
          boards with a USB-to-UART chip (CP210x, CH340).</small
        ></span
      >
    </label>
  </div>

  {#if setup.route === "platformio"}
    <label class="board-id">
      <span>PlatformIO board ID</span>
      <input
        type="text"
        bind:value={setup.boardId}
        spellcheck="false"
        autocomplete="off"
        aria-invalid={!boardIdValid}
      />
      <small
        >Find your board in the <a
          href={boardsUrl}
          target="_blank"
          rel="noopener noreferrer">PlatformIO board list ↗</a
        >.</small
      >
    </label>
  {/if}

  {#if full}
    <CodeBlock label="Built into main.cpp" code={preview} />
    <div class="download">
      <SetupButton variant="primary" size="lg" onclick={download} disabled={!canDownload}
        >{setup.route === "arduino"
          ? "Download Arduino sketch (.zip)"
          : "Download PlatformIO project (.zip)"}</SetupButton
      >
      <SetupButton onclick={downloadMain}>main.cpp only</SetupButton>
      {#if setup.downloaded}<span class="saved">Downloaded ✓</span>{/if}
    </div>
    {#if error}
      <Note tone="danger" title="Couldn't build firmware" role="alert"><p>{error}</p></Note>
    {/if}
  {:else}
    <Note title="Firmware needs your settings">
      <p>
        Fill in your LRA values and I²C pins first. Firmware is never built
        with placeholder values.
      </p>
    </Note>
    <div class="download">
      <SetupButton onclick={() => ongoto("lra")}>Describe your LRA</SetupButton>
      <SetupButton onclick={() => ongoto("wiring")}>Choose pins</SetupButton>
    </div>
  {/if}

  <ol class="steps">
    {#if setup.route === "arduino"}
      <li>
        In Boards Manager, install <b>esp32 by Espressif Systems</b>. Core 2.0.17
        matches the tested build.
      </li>
      <li>
        In Library Manager, install <b>Adafruit DRV2605 Library 1.2.4</b> (with
        Adafruit BusIO) and <b>ArduinoJson 7.4.x</b>.
      </li>
      <li>
        Unzip and open <code>{SKETCH_NAME}/{SKETCH_NAME}.ino</code>.
        <code>main.cpp</code> opens as a second tab. Leave the .ino empty.
      </li>
      <li>
        In <b>Tools</b>, pick your board and port.{#if setup.nativeUsb}
          Set <b>USB CDC On Boot</b> to Enabled.{/if}
      </li>
      <li>Click <b>Upload</b>, then close Serial Monitor so the browser can use the port.</li>
    {:else}
      <li>Install the PlatformIO extension in VS Code.</li>
      <li>
        Unzip and open the <code>{PIO_FOLDER}</code> folder. Libraries install on
        the first build.
      </li>
      <li>
        Upload. If the port isn't detected, set <code>upload_port</code> in
        <code>platformio.ini</code>.
      </li>
    {/if}
  </ol>
  {#if setup.route === "platformio"}
    <CodeBlock label="Terminal" code={"pio run --target upload"} />
  {/if}
  <p class="fine">
    Already have a project? Use <b>main.cpp only</b> and replace your source
    file. <a href={readmeUrl} target="_blank" rel="noopener noreferrer"
      >Firmware README ↗</a
    >
  </p>
</SetupSection>

<style>
  .route {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px 20px;
  }
  .check {
    display: flex;
    flex: 1 1 280px;
    gap: 10px;
    cursor: pointer;
  }
  .check input {
    flex: none;
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    accent-color: var(--color-ink);
  }
  .check span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .check strong {
    font: 500 14px/1.4 var(--font-sans);
  }
  .check small,
  .board-id small {
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.45;
  }
  .board-id {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 360px;
  }
  .board-id span {
    color: var(--color-muted);
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .board-id input {
    height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radius-inset);
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font:
      400 14px/1 ui-monospace,
      "SF Mono",
      Menlo,
      monospace;
  }
  .board-id input[aria-invalid="true"] {
    box-shadow: inset 0 0 0 1px var(--color-danger);
  }
  .board-id input:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 0;
  }
  .board-id a,
  .fine a {
    color: var(--color-ink);
  }
  .download {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .saved {
    color: var(--color-success-ink);
    font-size: 13px;
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 68ch;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  .steps li {
    position: relative;
    padding-inline-start: 36px;
    color: var(--color-secondary);
    font-size: 15px;
    line-height: 1.6;
    counter-increment: step;
  }
  .steps li::before {
    content: counter(step);
    position: absolute;
    top: 1px;
    left: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font-size: 12px;
  }
  .steps b,
  .fine b {
    color: var(--color-ink);
    font-weight: 500;
  }
  code {
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--color-surface-raised);
    color: var(--color-ink);
    font:
      400 13px ui-monospace,
      "SF Mono",
      Menlo,
      monospace;
  }
  .fine {
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.6;
  }
</style>
