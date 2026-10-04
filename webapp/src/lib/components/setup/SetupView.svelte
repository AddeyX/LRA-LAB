<script lang="ts">
  import { tick } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { MediaQuery } from "svelte/reactivity";
  import { fly } from "svelte/transition";
  import Card from "$lib/components/studio/Card.svelte";
  import { deriveLra, derivePins, hex, profileLabel } from "$lib/lra-profile";
  import { StudioSerial } from "$lib/serial";
  import { PARTS, SetupState, type SetupMode } from "$lib/setup.svelte";
  import RigCard, { type RigItem } from "./RigCard.svelte";
  import Segmented from "./Segmented.svelte";
  import SetupSteps from "./SetupSteps.svelte";
  import StepPager from "./StepPager.svelte";
  import BuzzSection from "./sections/BuzzSection.svelte";
  import CalibrateSection from "./sections/CalibrateSection.svelte";
  import ConnectSection from "./sections/ConnectSection.svelte";
  import FirmwareSection from "./sections/FirmwareSection.svelte";
  import LraSection from "./sections/LraSection.svelte";
  import PartsSection from "./sections/PartsSection.svelte";
  import WiringSection from "./sections/WiringSection.svelte";

  let {
    connected,
    calibrated,
    calibrating,
    busy,
    playing,
    error,
    firmwareProfile,
    onconnect,
    oncalibrate,
    onbuzz,
    onexit,
  }: {
    connected: boolean;
    calibrated: boolean;
    calibrating: boolean;
    busy: boolean;
    playing: boolean;
    error: string;
    firmwareProfile: string | null;
    onconnect: () => Promise<void>;
    oncalibrate: () => Promise<void>;
    onbuzz: () => Promise<boolean>;
    onexit: () => void;
  } = $props();

  type StepId = "parts" | "lra" | "wiring" | "firmware" | "connect" | "calibrate" | "buzz";
  const STEPS: readonly { id: StepId; title: string }[] = [
    { id: "parts", title: "Parts" },
    { id: "lra", title: "Your LRA" },
    { id: "wiring", title: "Wiring" },
    { id: "firmware", title: "Firmware" },
    { id: "connect", title: "Connect" },
    { id: "calibrate", title: "Calibrate" },
    { id: "buzz", title: "First haptic" },
  ];
  const indexOf = (id: StepId) => STEPS.findIndex((step) => step.id === id);

  const setup = new SetupState();
  if (typeof localStorage !== "undefined") setup.load(localStorage);
  const serialSupported = StudioSerial.supported();
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let lraResult = $derived(deriveLra(setup.lra));
  let pinResult = $derived(derivePins(setup.pins));
  let profile = $derived(lraResult.profile);
  let pins = $derived(pinResult.pins);
  let config = $derived(profile && pins ? { profile, pins } : null);
  let expectedProfile = $derived(config && profileLabel(config.profile, config.pins));
  let mismatch = $derived(
    Boolean(connected && firmwareProfile && expectedProfile && firmwareProfile !== expectedProfile),
  );

  let buzzPending = $state(false);
  let lastAction = $state<"connect" | "calibrate" | "buzz" | null>(null);
  let errorStep = $derived(lastAction ?? "connect");
  let buzzing = $derived(buzzPending || (lastAction === "buzz" && playing));

  let doneById = $derived<Record<StepId, boolean>>({
    parts: setup.parts.length === PARTS.length,
    lra: Boolean(profile),
    wiring: Boolean(pins),
    firmware: setup.downloaded,
    connect: connected,
    calibrate: calibrated,
    buzz: setup.felt,
  });
  let steps = $derived(STEPS.map((step) => ({ ...step, done: doneById[step.id] })));

  function resumeIndex() {
    const done = STEPS.map((step) => doneById[step.id]);
    const last = done.slice(0, -1).lastIndexOf(true);
    const next = done.findIndex((value, index) => !value && index > last);
    return next >= 0 ? next : STEPS.length - 1;
  }

  let mode = $state<SetupMode>(setup.preferredMode ?? "guided");
  let step = $state(resumeIndex());
  let active = $state(0);
  let current = $derived(mode === "guided" ? step : active);
  let scroller = $state<HTMLElement>();
  let spyLockedUntil = 0;

  $effect(() => {
    setup.save(localStorage);
  });
  $effect(() => {
    if (calibrated && !setup.completed) {
      setup.completed = true;
      setup.preferredMode = "docs";
    }
  });

  function sectionEl(index: number) {
    return scroller?.querySelector<HTMLElement>(`#setup-${STEPS[index].id}`);
  }
  function scrollToSection(index: number, smooth = true) {
    active = index;
    spyLockedUntil = performance.now() + 700;
    sectionEl(index)?.scrollIntoView({
      block: "start",
      behavior: smooth && !reducedMotion.current ? "smooth" : "auto",
    });
  }
  function goto(index: number) {
    const target = Math.max(0, Math.min(STEPS.length - 1, index));
    if (mode === "docs") return scrollToSection(target);
    step = target;
    scroller?.scrollTo({ top: 0 });
    if (scroller && scroller.getBoundingClientRect().top < 0)
      scroller.scrollIntoView({ block: "start" });
  }
  const gotoId = (id: StepId) => goto(indexOf(id));

  async function setMode(next: SetupMode) {
    setup.preferredMode = next;
    if (next === mode) return;
    if (next === "docs") {
      const from = step;
      mode = next;
      await tick();
      scrollToSection(from, false);
    } else {
      step = active;
      mode = next;
      await tick();
      scroller?.scrollTo({ top: 0 });
    }
  }

  function spy() {
    if (mode !== "docs" || !scroller || performance.now() < spyLockedUntil) return;
    const scrolls = scroller.scrollHeight > scroller.clientHeight + 1 &&
      getComputedStyle(scroller).overflowY !== "visible";
    const atEnd = scrolls
      ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
      : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atEnd) {
      active = STEPS.length - 1;
      return;
    }
    const line = scrolls ? scroller.getBoundingClientRect().top + 140 : 200;
    let next = 0;
    STEPS.forEach((_, index) => {
      const top = sectionEl(index)?.getBoundingClientRect().top ?? Infinity;
      if (top <= line) next = index;
    });
    active = next;
  }

  let isLast = $derived(current === STEPS.length - 1);
  let skip = $derived(
    mode === "guided" &&
      ((STEPS[current].id === "connect" && !connected) ||
        (STEPS[current].id === "calibrate" && !calibrated)),
  );
  let nextLabel = $derived(isLast ? "Open the studio" : skip ? "Skip for now →" : "Next →");

  async function connect() {
    lastAction = "connect";
    await onconnect();
  }
  async function calibrate() {
    lastAction = "calibrate";
    await oncalibrate();
  }
  async function buzz() {
    lastAction = "buzz";
    buzzPending = true;
    try {
      if (await onbuzz()) setup.felt = true;
    } finally {
      buzzPending = false;
    }
  }

  const routeName = { arduino: "Arduino IDE", platformio: "PlatformIO" };
  const volts = (value: number | null) => (value === null ? "" : `${+value.toFixed(3)}`);
  let rig = $derived<RigItem[]>([
    {
      key: "lra",
      label: "LRA",
      value: profile
        ? `${volts(profile.resonantHz)} Hz · ${volts(setup.lra.ratedVrms)} V RMS`
        : "Not described",
      state: profile ? "ok" : "todo",
      step: indexOf("lra"),
    },
    {
      key: "registers",
      label: "Driver registers",
      value: profile
        ? `${hex(profile.ratedVoltage)} · ${hex(profile.clampVoltage)} · ${hex(profile.driveTime)}`
        : "Not calculated",
      state: profile ? "ok" : "todo",
      step: indexOf("lra"),
    },
    {
      key: "pins",
      label: "I²C pins",
      value: pins ? `SDA ${pins.sda} · SCL ${pins.scl}` : "Not chosen",
      state: pins ? "ok" : "todo",
      step: indexOf("wiring"),
    },
    {
      key: "firmware",
      label: "Firmware",
      value: `${routeName[setup.route]} · ${setup.downloaded ? "downloaded" : "not downloaded"}`,
      state: setup.downloaded ? "ok" : "todo",
      step: indexOf("firmware"),
    },
    {
      key: "browser",
      label: "Browser",
      value: !serialSupported
        ? "Needs Chrome or Edge"
        : !secure
          ? "Needs HTTPS or localhost"
          : "Web Serial ready",
      state: serialSupported && secure ? "ok" : "warn",
      step: indexOf("connect"),
    },
    {
      key: "board",
      label: "Board",
      value: connected
        ? mismatch
          ? `Reports ${firmwareProfile}`
          : (firmwareProfile ?? "Connected")
        : "Not connected",
      state: connected ? (mismatch ? "warn" : "ok") : "todo",
      step: indexOf("connect"),
    },
    {
      key: "calibration",
      label: "Calibration",
      value: calibrated ? "Passed" : connected ? "Pending" : "Needs board",
      state: calibrated ? "ok" : "todo",
      step: indexOf("calibrate"),
    },
  ]);
</script>

<svelte:window onscroll={spy} />

{#snippet section(index: number)}
  {@const id = STEPS[index].id}
  {#if id === "parts"}
    <PartsSection {index} {setup} done={doneById.parts} onstudio={onexit} />
  {:else if id === "lra"}
    <LraSection {index} {setup} result={lraResult} done={doneById.lra} />
  {:else if id === "wiring"}
    <WiringSection {index} {setup} result={pinResult} done={doneById.wiring} />
  {:else if id === "firmware"}
    <FirmwareSection {index} {setup} {config} done={doneById.firmware} ongoto={gotoId} />
  {:else if id === "connect"}
    <ConnectSection
      {index}
      {connected}
      {busy}
      {serialSupported}
      {secure}
      boardProfile={firmwareProfile}
      {expectedProfile}
      error={errorStep === "connect" ? error : ""}
      onconnect={connect}
      ongoto={gotoId}
    />
  {:else if id === "calibrate"}
    <CalibrateSection
      {index}
      {connected}
      {calibrated}
      {calibrating}
      {busy}
      error={errorStep === "calibrate" ? error : ""}
      oncalibrate={calibrate}
      ongoto={gotoId}
    />
  {:else}
    <BuzzSection
      {index}
      ready={connected && calibrated}
      {connected}
      felt={setup.felt}
      {buzzing}
      busy={busy || playing}
      error={errorStep === "buzz" ? error : ""}
      onbuzz={buzz}
      onstudio={onexit}
      ongoto={gotoId}
    />
  {/if}
{/snippet}

<div class="setup-grid" class:rig-closed={!setup.rigOpen}>
  <SetupSteps {steps} {current} onselect={goto} />

  <Card area="doc" stack aria-labelledby="setup-title">
    <div class="doc">
      <header class="doc-head">
        <div>
          <h1 id="setup-title">Set up your rig</h1>
          <p>ESP32, DRV2605L and LRA. Seven steps from parts list to first haptic playback.</p>
        </div>
        <Segmented
          label="Reading mode"
          options={[
            { value: "guided", label: "Guided" },
            { value: "docs", label: "Docs" },
          ]}
          value={mode}
          onchange={setMode}
        />
      </header>
      <div class="doc-scroll" class:docs={mode === "docs"} bind:this={scroller} onscroll={spy}>
        <div class="doc-body">
          {#if mode === "guided"}
            {#key step}
              <div
                class="doc-item"
                in:fly={{ y: 10, duration: reducedMotion.current ? 0 : 320, easing: cubicOut }}
              >
                {@render section(step)}
              </div>
            {/key}
          {:else}
            {#each STEPS as item, index (item.id)}
              <div class="doc-item">{@render section(index)}</div>
            {/each}
          {/if}
        </div>
        <div class="pager-dock">
          <StepPager
            index={current}
            total={STEPS.length}
            title={STEPS[current].title}
            {nextLabel}
            {skip}
            onprev={() => goto(current - 1)}
            onnext={() => (isLast ? onexit() : goto(current + 1))}
          />
        </div>
      </div>
    </div>
  </Card>

  <RigCard
    items={rig}
    open={setup.rigOpen}
    ontoggle={() => (setup.rigOpen = !setup.rigOpen)}
    onselect={goto}
  />
</div>

<style>
  .setup-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 300px;
    grid-template-areas: "steps doc rig";
    gap: 12px;
    padding: 0
      max(var(--spacing-page-gutter), calc((100% - var(--spacing-content)) / 2));
    transition: grid-template-columns 0.45s var(--ease-butter);
  }
  .setup-grid.rig-closed {
    grid-template-columns: 240px minmax(0, 1fr) 72px;
  }
  .setup-grid > :global(*) {
    min-height: 0;
  }
  .doc {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }
  .doc-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 24px;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 0 20px;
  }
  .doc-head h1 {
    margin: 0;
    font: 500 18px/1.2 var(--font-sans);
    letter-spacing: 0.005em;
  }
  .doc-head p {
    margin: 4px 0 0;
    color: var(--color-muted);
    font-size: 13px;
    letter-spacing: 0.02em;
  }
  .doc-scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    margin: 0 -24px -24px;
    padding: 12px 24px 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
  .doc-body {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
  .docs .doc-body {
    padding-bottom: 30vh;
  }
  .doc-item + .doc-item {
    margin-top: 48px;
    padding-top: 48px;
    border-top: 1px solid var(--color-line);
  }
  .pager-dock {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: flex;
    justify-content: center;
    margin: auto -24px 0;
    padding: 40px 24px 20px;
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-surface) 0%, transparent),
      var(--color-surface) 55%
    );
    pointer-events: none;
  }
  .pager-dock > :global(*) {
    pointer-events: auto;
  }
  @media (max-width: 75rem) {
    .setup-grid {
      grid-template-columns: 210px minmax(0, 1fr) 260px;
    }
    .setup-grid.rig-closed {
      grid-template-columns: 210px minmax(0, 1fr) 72px;
    }
  }
  @media (max-width: 62.5rem) {
    .setup-grid,
    .setup-grid.rig-closed {
      flex: none;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "rig" "steps" "doc";
    }
    .doc-scroll {
      margin: 0;
      padding: 12px 0 0;
      overflow: visible;
      scroll-margin-top: 170px;
    }
    .doc-scroll :global([data-setup-section]) {
      scroll-margin-top: 170px;
    }
    .pager-dock {
      margin-inline: 0;
      padding: 32px 0 12px;
      background: none;
    }
  }
  @media (max-width: 45rem) {
    .doc-scroll {
      padding-top: 4px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .setup-grid {
      transition: none;
    }
  }
</style>
