<script lang="ts">
  let { text }: { text: string } = $props();
</script>

<!-- The nearest link, button, or menu item drives the roll on hover, focus, or highlight. -->
<span class="roll"
  ><span class="roll-track"
    ><span>{text}</span><span aria-hidden="true">{text}</span></span
  ></span
>

<style>
  .roll {
    display: inline-flex;
    align-items: flex-start;
    height: 1lh;
    overflow: hidden;
    vertical-align: top;
  }
  .roll-track {
    display: flex;
    flex-direction: column;
    transition: transform 0.55s var(--ease-butter);
  }
  .roll-track > span {
    display: block;
    white-space: nowrap;
  }
  :global(
      :is(a, button, [role^="menuitem"]):is(
        :hover,
        :focus-visible,
        [data-highlighted]
      )
    )
    .roll-track {
    transform: translateY(-50%);
  }
</style>
