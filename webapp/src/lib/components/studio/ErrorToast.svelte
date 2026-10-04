<script lang="ts">
  let {
    message,
    ondismiss,
    tone = "error",
  }: {
    message: string;
    ondismiss: () => void;
    tone?: "error" | "notice";
  } = $props();
</script>

<div
  class="toast"
  class:notice={tone === "notice"}
  role={tone === "error" ? "alert" : "status"}
>
  <span>{message}</span>
  <button
    onclick={ondismiss}
    aria-label={tone === "error" ? "Dismiss error" : "Dismiss notification"}
    >×</button
  >
</div>

<style>
  .toast {
    position: fixed;
    inset-inline: 0;
    bottom: 24px;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 14px;
    width: fit-content;
    max-width: calc(100vw - 32px);
    margin: 0 auto;
    padding: 10px 10px 10px 18px;
    border-radius: var(--radius-island);
    background: var(--color-action);
    color: var(--color-action-ink);
    font-size: 14px;
    line-height: 1.4;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.18);
    animation: toast-in 0.5s var(--ease-butter);
  }
  .toast span::before {
    content: "";
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-inline-end: 10px;
    border-radius: 50%;
    background: var(--color-danger);
    vertical-align: middle;
  }
  .toast.notice span::before {
    background: var(--color-accent);
  }
  .toast button {
    width: 32px;
    height: 32px;
    flex: none;
    border: 0;
    border-radius: 8px;
    background: rgb(255 255 255 / 0.08);
    color: inherit;
    font-size: 18px;
  }
  .toast button:hover:enabled {
    transform: none;
    background: rgb(255 255 255 / 0.16);
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }
</style>
