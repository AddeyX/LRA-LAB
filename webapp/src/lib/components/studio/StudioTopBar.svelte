<script lang="ts">
  import BoardMenu from "$lib/components/header/BoardMenu.svelte";
  import FileMenu, {
    type FileAction,
  } from "$lib/components/header/FileMenu.svelte";
  import IslandButton from "$lib/components/header/IslandButton.svelte";
  import PlaybackIsland from "$lib/components/header/PlaybackIsland.svelte";
  import StudioHeader from "$lib/components/header/StudioHeader.svelte";
  import type { Playback } from "$lib/playback.svelte";

  let {
    playback,
    project,
    dirty,
    view,
    totalMs,
    maxMs,
    beats,
    connected,
    calibrated,
    calibrating,
    busy,
    playing,
    notice,
    error,
    onhome,
    onfile,
    onconnect,
    oncalibrate,
    ondisconnect,
    ontoggleview,
    onstop,
  }: {
    playback: Playback;
    project: string;
    dirty: boolean;
    view: "studio" | "setup";
    totalMs: number;
    maxMs: number;
    beats: number;
    connected: boolean;
    calibrated: boolean;
    calibrating: boolean;
    busy: boolean;
    playing: boolean;
    notice: string;
    error: string;
    onhome: () => void;
    onfile: (action: FileAction) => void;
    onconnect: () => void;
    oncalibrate: () => void;
    ondisconnect: () => void;
    ontoggleview: () => void;
    onstop: () => void;
  } = $props();
</script>

<StudioHeader {project} {dirty} {onhome}>
  {#snippet file(anchor)}
    <FileMenu {anchor} {dirty} onaction={onfile} />
  {/snippet}
  {#snippet center()}
    <PlaybackIsland {playback} {totalMs} {maxMs} {beats} {onstop} />
  {/snippet}
  {#snippet actions(anchor)}
    <BoardMenu
      {anchor}
      {connected}
      {calibrated}
      {calibrating}
      {busy}
      {playing}
      {notice}
      {error}
      {onconnect}
      {oncalibrate}
      {ondisconnect}
    />
    <IslandButton
      text={view === "studio" ? "Setup" : "Studio"}
      onclick={ontoggleview}
    />
  {/snippet}
</StudioHeader>
