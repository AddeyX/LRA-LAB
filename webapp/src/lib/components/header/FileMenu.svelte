<script lang="ts" module>
  export type FileAction =
    "new" | "open" | "import" | "save" | "export" | "code" | "settings" | "changelog";
</script>

<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import RollText from "./RollText.svelte";
  import { reveal } from "./reveal";

  let {
    anchor,
    dirty,
    onaction,
  }: {
    anchor: HTMLElement | null;
    dirty: boolean;
    onaction: (action: FileAction) => void;
  } = $props();
  let open = $state(false);

  const rows = $derived<{ action: FileAction; label: string; hint: string }[]>([
    { action: "new", label: "New", hint: "Fresh canvas" },
    { action: "open", label: "Open", hint: "Browser projects" },
    { action: "import", label: "Import", hint: "JSON file" },
    {
      action: "save",
      label: "Save",
      hint: dirty ? "Unsaved changes" : "Saved",
    },
    { action: "export", label: "Export", hint: "Download JSON" },
  ]);
</script>

{#snippet glyph(kind: string)}
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if kind === "new"}
      <path d="M12 6v12M6 12h12" />
    {:else if kind === "open"}
      <path d="M4 7h6l2 2h8v9H4Z" />
    {:else if kind === "import"}
      <path d="M12 4v10m-4-4 4 4 4-4M5 19h14" />
    {:else if kind === "save"}
      <path d="m6 12 4 4 8-8" />
    {:else}
      <path d="M12 15V5m-4 4 4-4 4 4M5 19h14" />
    {/if}
  </svg>
{/snippet}

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger class="lab-file-trigger">
    <RollText text={open ? "Close" : "File"} />
    <svg class="file-dots" viewBox="0 0 3 11" aria-hidden="true"
      ><rect width="3" height="3" rx="1" /><rect
        y="8"
        width="3"
        height="3"
        rx="1"
      /></svg
    >
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      forceMount
      customAnchor={anchor}
      side="bottom"
      align="start"
      sideOffset={8}
      collisionPadding={12}
    >
      {#snippet child({ wrapperProps, props, open: isOpen })}
        {#if isOpen}
          <div {...wrapperProps}>
            <div {...props} class="file-drop" transition:reveal>
              <div class="file-rows">
                {#each rows as row (row.action)}
                  <DropdownMenu.Item
                    class="file-row"
                    onSelect={() => onaction(row.action)}
                  >
                    <span class="file-tile">{@render glyph(row.action)}</span>
                    <span class="file-label"><RollText text={row.label} /></span
                    >
                    <span
                      class="file-hint"
                      class:dirty={row.action === "save" && dirty}
                      >{row.hint}</span
                    >
                  </DropdownMenu.Item>
                {/each}
                <DropdownMenu.Item textValue="GitHub repository">
                  {#snippet child({ props })}
                    <a {...props} class="file-row"
                      href="https://github.com/AddeyX/LRA-LAB"
                      target="_blank" rel="noopener noreferrer">
                      <span class="file-tile">{@render glyph("export")}</span>
                      <span class="file-label"><RollText text="GitHub" /></span>
                      <span class="file-hint">Repository ↗</span>
                    </a>
                  {/snippet}
                </DropdownMenu.Item>
                <DropdownMenu.Item class="file-row" onSelect={() => onaction("changelog")}>
                  <span class="file-tile">{@render glyph("open")}</span>
                  <span class="file-label"><RollText text="Changelog" /></span>
                  <span class="file-hint">Build history</span>
                </DropdownMenu.Item>
              </div>
              <div class="file-foot">
                <DropdownMenu.Item
                  class="file-cap"
                  onSelect={() => onaction("code")}
                  ><RollText text="Generate code" /></DropdownMenu.Item
                >
                <DropdownMenu.Item
                  class="file-cap"
                  onSelect={() => onaction("settings")}
                  ><RollText text="LRA settings" /></DropdownMenu.Item
                >
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
  :global(.lab-file-trigger) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    margin: -6px -10px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--color-ink);
    font: 400 16px/20px var(--font-sans);
    letter-spacing: 0.02em;
  }
  :global(.lab-file-trigger:hover:enabled) {
    transform: none;
  }
  :global(.lab-file-trigger:focus-visible) {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 2px;
  }
  .file-dots {
    width: 3px;
    height: 11px;
    fill: currentColor;
    transition: transform 0.5s var(--ease-butter);
  }
  :global(.lab-file-trigger[data-state="open"]) .file-dots {
    transform: rotate(90deg);
  }
  .file-drop {
    z-index: 60;
    width: max(var(--bits-floating-anchor-width), 320px);
    max-width: calc(100vw - 24px);
    padding: 14px 14px 18px;
    border-radius: var(--radius-island);
    background: var(--color-surface);
    color: var(--color-ink);
    transform-origin: top left;
    outline: none;
  }
  .file-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  :global(.file-row) {
    display: grid;
    grid-template-columns: 44px auto 1fr;
    align-items: center;
    gap: 14px;
    padding: 6px;
    border-radius: 12px;
    font: 400 18px/27px var(--font-sans);
    letter-spacing: 0.01em;
    cursor: pointer;
    outline: none;
  }
  .file-tile {
    display: grid;
    place-items: center;
    width: 44px;
    height: 32px;
    border-radius: 8px;
    background: var(--color-surface-soft);
    transition:
      background-color 0.3s var(--ease-butter),
      color 0.3s var(--ease-butter);
  }
  .file-tile svg {
    width: 18px;
    height: 18px;
  }
  :global(.file-row[data-highlighted]) .file-tile {
    background: var(--color-accent);
  }
  .file-hint {
    justify-self: end;
    padding-inline-end: 6px;
    font-size: 13px;
    letter-spacing: 0.03em;
    color: var(--color-muted);
    opacity: 0;
    transform: translateY(60%);
    transition:
      opacity 0.4s var(--ease-butter),
      transform 0.5s var(--ease-butter);
  }
  .file-hint.dirty {
    opacity: 1;
    transform: none;
    color: var(--color-accent-bright);
  }
  :global(.file-row[data-highlighted]) .file-hint {
    opacity: 1;
    transform: none;
  }
  .file-foot {
    display: flex;
    gap: 20px;
    margin: 18px 6px 0;
    padding-top: 14px;
    border-top: 1px solid var(--color-line);
  }
  :global(.file-cap) {
    font: 400 13px/24px var(--font-sans);
    letter-spacing: 0.04em;
    color: var(--color-muted);
    cursor: pointer;
    outline: none;
    border-radius: 6px;
  }
  :global(.file-cap[data-highlighted]) {
    color: var(--color-ink);
  }
</style>
