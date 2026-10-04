<script lang="ts">
  import type { SavedProject } from "$lib/projects";
  import StudioDialog from "./StudioDialog.svelte";

  let {
    open,
    projects,
    onclose,
    onopen,
  }: {
    open: boolean;
    projects: SavedProject[];
    onclose: () => void;
    onopen: (project: SavedProject) => void;
  } = $props();
</script>

<StudioDialog
  {open}
  {onclose}
  title="Open browser project"
  description="Projects saved in this browser profile."
>
  <div class="studio-dialog-body project-list">
    {#if projects.length}{#each projects as project (project.id)}<button
          onclick={() => onopen(project)}
          ><strong>{project.name}</strong><span
            >Edited {new Date(project.updatedAt).toLocaleDateString()}</span
          ></button
        >{/each}{:else}<p>
        No browser projects yet. Use File → Save to create one.
      </p>{/if}
  </div>
</StudioDialog>
