<span class="logo">
  <svg viewBox="0 0 28 28" aria-hidden="true">
    <path d="M3 3h6v16h8v6H3Z" />
    <path d="M11 3h14v22h-6V9h-8Z" />
    <circle class="logo-core" cx="14" cy="14" r="2.6" />
  </svg>
  <span class="logo-word" aria-hidden="true">lra<b>lab</b></span>
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--color-ink);
  }
  svg {
    width: 24px;
    height: 24px;
    flex: none;
    fill: currentColor;
    overflow: visible;
  }
  .logo-core {
    fill: var(--color-accent);
    transform-origin: 14px 14px;
    transition: transform 0.5s var(--ease-butter);
  }
  :global(a:hover) > .logo .logo-core,
  :global(a:focus-visible) > .logo .logo-core {
    transform: scale(1.6);
  }
  .logo-word {
    font:
      600 20px/1 var(--font-display),
      sans-serif;
    letter-spacing: -0.045em;
  }
  .logo-word b {
    font-weight: 400;
    color: var(--color-muted);
  }
  @media (max-width: 30rem) {
    .logo-word {
      display: none;
    }
  }
</style>
