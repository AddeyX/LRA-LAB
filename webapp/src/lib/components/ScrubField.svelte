<script module lang="ts">
  // Svelte Bits ScrubField, adapted from the supplied TypeScript/Tailwind source.
  // Scoped CSS replaces utilities so the host app does not need Tailwind.
  export type ScrubFieldSize = "sm" | "md" | "lg";
  export interface ScrubFieldProps {
    label?: string;
    suffix?: string;
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    size?: ScrubFieldSize;
    sensitivity?: number;
    rubberReach?: number;
    returnDuration?: number;
    coarseMultiplier?: number;
    fineMultiplier?: number;
    showDelta?: boolean;
    showDirty?: boolean;
    showFill?: boolean;
    accent?: string;
    chipColor?: string;
    disabled?: boolean;
    onChange?: (value: number) => void;
    onCommit?: (value: number) => void;
    className?: string;
  }
  interface DragState {
    id: number;
    x: number;
    raw: number;
    mult: number;
    moved: boolean;
    before: number;
    slack: number;
    left: number;
  }
  type Modifiers = { shiftKey: boolean; altKey: boolean };
  const SIZES = {
    sm: { height: 28, font: 12, radius: 6, width: 104 },
    md: { height: 34, font: 13, radius: 8, width: 128 },
    lg: { height: 44, font: 16, radius: 10, width: 160 },
  };
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const decimalsOf = (n: number) => {
    const [coefficient, exponent = "0"] = String(n).toLowerCase().split("e");
    return Math.max(
      0,
      (coefficient.split(".")[1]?.length ?? 0) - Number(exponent),
    );
  };
  const onColor = (hex: string) => {
    const raw = hex.replace("#", "");
    const full =
      raw.length === 3
        ? [...raw].map((ch) => ch + ch).join("")
        : raw.slice(0, 6);
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return "#FFF7F0";
    const yiq =
      (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) /
      1000;
    return yiq >= 128 ? "#14110E" : "#FFF7F0";
  };
</script>

<script lang="ts">
  import { untrack, onMount } from "svelte";
  import { animate, motionValue, transformValue, styleEffect } from "motion";

  let {
    label = "Radius",
    suffix = "px",
    value: valueProp,
    defaultValue = 24,
    min = 0,
    max = 100,
    step = 1,
    size = "md",
    sensitivity = 2,
    rubberReach = 8,
    returnDuration = 300,
    coarseMultiplier = 10,
    fineMultiplier = 0.1,
    showDelta = true,
    showDirty = false,
    showFill = true,
    accent = "#F5EFE9",
    chipColor = "#3A312A",
    disabled = false,
    onChange,
    onCommit,
    className = "",
  }: ScrubFieldProps = $props();

  const id = $props.id();
  let reduce = $state(false);
  const controlled = $derived(valueProp !== undefined);
  let value = $state(untrack(() => clamp(valueProp ?? defaultValue, min, max)));
  let dragging = $state(false);
  let over = $state(false);
  let draft = $state<string | null>(null);
  let chip: HTMLDivElement;
  let input: HTMLInputElement;
  let ghost = $state<HTMLSpanElement>();
  let ghostDelta = $state("");
  let drag: DragState | null = null;
  let valueRef = untrack(() => value);
  let typing = false;
  let moved = false;
  let mounted = false;
  let previousCursor = "";
  const display = motionValue(untrack(() => value));
  const baseDecimals = $derived(decimalsOf(step));
  const fineDecimals = $derived(
    Math.min(6, baseDecimals + decimalsOf(fineMultiplier)),
  );
  const preset = $derived(SIZES[size]);
  const reach = $derived(
    (rubberReach / 100) * Math.max(max - min, Number.EPSILON),
  );
  const dirty = $derived(showDirty && value !== defaultValue);
  const fmt = (v: number) => {
    const scaled = v * 10 ** baseDecimals;
    return v.toFixed(
      Math.abs(scaled - Math.round(scaled)) < 1e-6
        ? baseDecimals
        : fineDecimals,
    );
  };
  const signed = (d: number) => (d < 0 ? "−" : "+") + fmt(Math.abs(d));
  const bend = (raw: number) =>
    reach ? Math.sign(raw) * reach * Math.log1p(Math.abs(raw) / reach) : 0;
  const unbend = (over: number) =>
    reach ? Math.sign(over) * reach * Math.expm1(Math.abs(over) / reach) : 0;
  const toShown = (raw: number) => {
    const c = clamp(raw, min, max);
    return c + bend(raw - c);
  };
  const toRaw = (shown: number) => {
    const c = clamp(shown, min, max);
    return c + unbend(shown - c);
  };
  const multiplierOf = (e: Modifiers) =>
    e.shiftKey ? coarseMultiplier : e.altKey ? fineMultiplier : 1;

  const lean = untrack(() =>
    transformValue(() => {
      const d = display.get();
      return reduce || !reach
        ? 0
        : clamp((d - clamp(d, min, max)) / reach, -1, 1) * 4;
    }),
  );
  const chipTransform = transformValue(() => `translateX(${lean.get()}px)`);
  const fill = untrack(() =>
    transformValue(
      () =>
        (clamp(display.get(), min, max) - min) /
        Math.max(max - min, Number.EPSILON),
    ),
  );
  const fillTransform = transformValue(() => `scaleX(${fill.get()})`);

  // Svelte props are not MotionValues: refresh transforms when their bounds change.
  $effect(() => {
    const d = display.get();
    const nextLean =
      reduce || !reach ? 0 : clamp((d - clamp(d, min, max)) / reach, -1, 1) * 4;
    const nextFill =
      (clamp(d, min, max) - min) / Math.max(max - min, Number.EPSILON);
    untrack(() => {
      lean.set(nextLean);
      fill.set(nextFill);
    });
  });

  function commit(next: number) {
    if (!Number.isFinite(next)) return;
    const rounded = clamp(Number(next.toFixed(fineDecimals)), min, max);
    if (rounded === valueRef) return;
    valueRef = rounded;
    value = rounded;
    onChange?.(rounded);
  }
  function adopt(next: number) {
    valueRef = next;
    value = next;
    display.jump(next);
    if (!typing && input) input.value = fmt(next);
  }
  $effect(() => {
    valueProp;
    dragging;
    value;
    untrack(() => {
      // Also resync on release when the parent rejects an invalid edit.
      if (controlled && !drag && valueProp !== valueRef)
        adopt(clamp(valueProp as number, min, max));
    });
  });
  $effect(() => {
    defaultValue;
    untrack(() => {
      if (!mounted) {
        mounted = true;
        return;
      }
      if (!controlled && !drag) adopt(clamp(defaultValue, min, max));
    });
  });
  $effect(() => {
    baseDecimals;
    fineDecimals;
    untrack(() => {
      if (!typing && input) input.value = fmt(valueRef);
    });
  });

  function handlePointerDown(
    e: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    if (disabled || drag || e.button !== 0 || typing) return;
    if (e.pointerType !== "touch") e.preventDefault();
    display.stop();
    moved = false;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      raw: toRaw(display.get()),
      mult: multiplierOf(e),
      moved: false,
      before: valueRef,
      slack: e.pointerType === "touch" ? 8 : 3,
      left: chip.getBoundingClientRect().left,
    };
    previousCursor = document.documentElement.style.cursor;
    chip.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(
    e: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const g = drag;
    if (!g || e.pointerId !== g.id) return;
    if (!g.moved) {
      if (Math.abs(e.clientX - g.x) < g.slack) return;
      g.moved = true;
      moved = true;
      // Retain travel beyond the threshold, including a single coalesced move.
      g.x += Math.sign(e.clientX - g.x) * g.slack;
      dragging = true;
      document.documentElement.style.cursor = "ew-resize";
    }
    const m = multiplierOf(e);
    if (m !== g.mult) {
      g.mult = m;
      g.raw = toRaw(display.get());
      g.x = e.clientX;
    }
    const raw = g.raw + Math.round((e.clientX - g.x) / sensitivity) * step * m;
    const shown = toShown(raw);
    display.set(shown);
    commit(clamp(raw, min, max));
    if (ghost) {
      ghost.style.translate = `calc(${e.clientX - g.left}px - 50%) -100%`;
      ghostDelta = signed(shown - g.before);
    }
  }
  function end(cancel = false) {
    const g = drag;
    if (!g) return;
    drag = null;
    dragging = false;
    document.documentElement.style.cursor = previousCursor;
    if (chip.hasPointerCapture(g.id)) chip.releasePointerCapture(g.id);
    if (cancel) {
      commit(g.before);
      display.jump(g.before);
      return;
    }
    if (!g.moved) {
      input.focus();
      return;
    }
    const bound = clamp(display.get(), min, max);
    if (display.get() !== bound) {
      if (reduce) display.jump(bound);
      else
        animate(display, bound, {
          type: "spring",
          duration: returnDuration / 1000,
          bounce: 0,
        });
    }
    if (valueRef !== g.before) onCommit?.(valueRef);
  }
  function leaveTyping() {
    typing = false;
    draft = null;
    if (input) input.value = fmt(valueRef);
  }
  function handleKeyDown(
    e: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) {
    const typedNumber =
      draft !== null && draft.trim() !== "" ? Number(draft) : NaN;
    const from = Number.isFinite(typedNumber) ? typedNumber : valueRef;
    const deltas: Record<string, number> = {
      ArrowUp: step * multiplierOf(e),
      ArrowDown: -step * multiplierOf(e),
      PageUp: step * coarseMultiplier,
      PageDown: -step * coarseMultiplier,
    };
    const delta = deltas[e.key];
    if (delta !== undefined || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      leaveTyping();
      commit(delta !== undefined ? from + delta : e.key === "Home" ? min : max);
      display.jump(valueRef);
      input.value = fmt(valueRef);
      onCommit?.(valueRef);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      leaveTyping();
      e.currentTarget.blur();
    }
  }
  function handleFocus(e: FocusEvent & { currentTarget: HTMLInputElement }) {
    typing = true;
    draft = e.currentTarget.value;
    e.currentTarget.select();
  }
  function handleBlur() {
    const n = draft === null || draft.trim() === "" ? NaN : Number(draft);
    if (Number.isFinite(n)) {
      commit(n);
      onCommit?.(valueRef);
    }
    leaveTyping();
    display.jump(valueRef);
  }

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce = media.matches;
    const change = () => {
      reduce = media.matches;
    };
    media.addEventListener("change", change);
    const off = display.on("change", (d) => {
      if (!typing) input.value = fmt(d);
      over = d < min || d > max;
    });
    return () => {
      if (drag) document.documentElement.style.cursor = previousCursor;
      media.removeEventListener("change", change);
      off();
      [chipTransform, fillTransform, lean, fill, display].forEach((mv) =>
        mv.destroy(),
      );
    };
  });
  const chipStyles = (node: HTMLElement) =>
    styleEffect(node, { transform: chipTransform });
  const fillStyles = (node: HTMLElement) =>
    styleEffect(node, { transform: fillTransform });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && drag) {
      e.preventDefault();
      end(true);
    }
  }}
/>

<!-- The contained spinbutton provides keyboard access to this pointer scrub surface. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={chip}
  class={`scrub-field ${className}`}
  data-dirty={dirty}
  data-dragging={dragging}
  data-typing={draft !== null}
  data-disabled={disabled}
  data-over={over}
  aria-disabled={disabled || undefined}
  style:--sf-accent={accent}
  style:--sf-chip={chipColor}
  style:--sf-ghost-ink={onColor(accent)}
  style:--sf-h={`${preset.height}px`}
  style:--sf-fs={`${preset.font}px`}
  style:--sf-r={`${preset.radius}px`}
  style:--sf-w={`${preset.width}px`}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={() => end()}
  onpointercancel={() => end(true)}
  onlostpointercapture={() => end()}
  {@attach chipStyles}
>
  {#if showFill}<span class="fill-clip" aria-hidden="true"
      ><span class="fill" {@attach fillStyles}></span></span
    >{/if}
  <!-- This only prevents native label focus after a drag; the spinbutton handles keyboard input. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <label
    for={id}
    onclick={(e) => {
      if (moved) e.preventDefault();
    }}>{label}</label
  >
  <input
    bind:this={input}
    {id}
    type="text"
    inputmode="decimal"
    role="spinbutton"
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuetext={`${fmt(value)}${suffix ? ` ${suffix}` : ""}`}
    value={fmt(value)}
    {disabled}
    onfocus={handleFocus}
    oninput={(e) => (draft = e.currentTarget.value)}
    onkeydown={handleKeyDown}
    onblur={handleBlur}
  />
  {#if suffix}<span class="suffix" aria-hidden="true">{suffix}</span>{/if}
  {#if showDelta}<span bind:this={ghost} class="delta" aria-hidden="true"
      >{ghostDelta}</span
    >{/if}
</div>

<style>
  .scrub-field {
    position: relative;
    display: inline-flex;
    height: var(--sf-h);
    width: var(--sf-w);
    max-width: 100%;
    align-items: center;
    gap: 4px;
    border-radius: var(--sf-r);
    padding: 0 8px 0 4px;
    line-height: 1;
    user-select: none;
    isolation: isolate;
    font: inherit;
    font-size: var(--sf-fs);
    color: #ffffff;
    background: var(--sf-chip);
    box-shadow: 0 0 0 1px transparent;
    cursor: ew-resize;
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    transition:
      background-color 200ms ease,
      box-shadow 200ms ease;
  }
  .scrub-field[data-dirty="true"] {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--sf-accent) 55%, transparent);
    transition-duration: 0ms;
  }
  .scrub-field[data-typing="true"] {
    cursor: text;
    background: color-mix(in srgb, currentColor 7%, var(--sf-chip));
  }
  .scrub-field[data-disabled="true"] {
    opacity: 0.5;
    cursor: default;
  }
  .scrub-field:focus-within {
    outline: 2px solid var(--sf-accent);
    outline-offset: 3px;
  }
  .fill-clip {
    pointer-events: none;
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    border-radius: inherit;
  }
  .fill {
    position: absolute;
    inset: 0;
    transform-origin: left;
    background: color-mix(in srgb, var(--sf-accent) 16%, transparent);
  }
  label {
    display: inline-flex;
    height: 100%;
    cursor: inherit;
    align-items: center;
    white-space: nowrap;
    border-radius: calc(var(--sf-r) - 2px);
    padding-inline: 6px;
    font-weight: 500;
    color: inherit;
    transition:
      color 120ms ease,
      transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .scrub-field[data-dragging="true"] label,
  .scrub-field[data-disabled="false"][data-typing="false"]:active label {
    transform: scale(0.96);
    color: inherit;
  }
  input {
    margin: 0;
    width: 100%;
    min-width: 0;
    flex: 1;
    cursor: inherit;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: right;
    font: inherit;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    outline: 0;
    color: inherit;
    transition: color 120ms ease;
  }
  .scrub-field[data-typing="true"] input {
    cursor: text;
  }
  .scrub-field[data-over="true"] input {
    color: inherit;
  }
  .suffix {
    font-weight: 500;
    color: inherit;
  }
  .delta {
    pointer-events: none;
    position: absolute;
    top: -6px;
    left: 0;
    transform-origin: bottom;
    white-space: nowrap;
    border-radius: 999px;
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.4;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    opacity: 0;
    color: var(--sf-ghost-ink);
    translate: 0 -100%;
    scale: 0.95;
    background: var(--sf-accent);
    transition:
      opacity 125ms ease,
      scale 125ms ease;
  }
  .scrub-field[data-dragging="true"] .delta {
    opacity: 1;
    scale: 1;
  }
  @media (hover: hover) and (pointer: fine) {
    .scrub-field[data-disabled="false"]:hover label {
      color: inherit;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    label {
      transition: color 120ms ease;
    }
    .scrub-field[data-dragging="true"] label,
    .scrub-field[data-disabled="false"][data-typing="false"]:active label {
      transform: none;
    }
    .delta {
      scale: 1;
      transition: opacity 200ms ease;
    }
  }
</style>
