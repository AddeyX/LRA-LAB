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
    { action: "code", label: "Generate code", hint: "Signature C++" },
    { action: "settings", label: "LRA settings", hint: "Hardware profile" },
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
    {:else if kind === "code"}
      <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" />
    {:else if kind === "settings"}
      <path d="M4 7h6m4 0h6M4 17h10m4 0h2M10 4v6m4 4v6" />
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
              </div>
              <div class="file-foot">
                <DropdownMenu.Item textValue="GitHub repository">
                  {#snippet child({ props })}
                    <a {...props} class="file-cap inline-flex items-center gap-2"
                      href="https://github.com/AddeyX/LRA-LAB"
                      target="_blank" rel="noopener noreferrer">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                      </svg>
                      <RollText text="GitHub" />
                    </a>
                  {/snippet}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  class="file-cap"
                  onSelect={() => onaction("changelog")}
                  ><RollText text="Changelog" /></DropdownMenu.Item
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
