# Tailwind token migration implementation plan

**Goal:** Move the existing studio to Tailwind CSS, with all app colors, radii, and static distances derived from one token theme.

**Architecture:** Tailwind v4 runs through its Vite plugin. `src/tokens.css` owns the theme; global and scoped styles consume token utilities through `@apply`, while straightforward component layouts use utility classes directly. Portal Bits receives aliases of the same tokens. Runtime timeline positions remain computed from haptic timing and zoom.

**Tech stack:** Svelte 5, SvelteKit, Tailwind CSS v4, Vite, pnpm.

**Constraints:** Preserve the dark studio, hardware behavior, and timeline geometry. The user explicitly requested this migration, including the necessary changes to `app.css`. Use logical layout properties outside the physical timeline coordinate system.

## Tasks

- [x] Install `tailwindcss` and `@tailwindcss/vite`; register `tailwindcss()` before `sveltekit()` in `vite.config.ts`.
- [x] Define the palette, spacing base, semantic layout dimensions, radius scale, type sizes, breakpoints, and shadows in `src/tokens.css`. Import theme and utilities without Preflight to preserve the existing browser baseline.
- [x] Migrate `src/app.css` and every Svelte style block to Tailwind utilities and token references; replace ScrubField numeric size presets with theme variables. Alias Portal Bits colors, spacing, radii, and shadows.
- [x] Fix shared panel alignment and control wrapping; preserve physical left-to-right timeline coordinates explicitly in RTL.
- [x] Update `README.md` with token ownership, utility examples, and runtime geometry exceptions.
- [x] Run `pnpm check`, `pnpm test`, `pnpm build`, Svelte autofixer, and a raw-value scan. Inspect studio, setup, and dialogs at 320–1920px, RTL, long labels, and 200% zoom; record verification limits.

## Review focus

- Portaled dialogs must keep dark tokens and focus outlines after stylesheet layering changes.
- Small viewports must retain File, Connect, Setup, and setup navigation actions.
- ScrubField inputs must still support keyboard edits, dragging, and zoom updates.
- Timeline scrolling, placement, selection, and pulse resizing must retain their physical coordinate system.
- Long labels and RTL must wrap without introducing document-level horizontal overflow.

**Result:** Implemented and verified. See [layout review](../../2026-10-02-tailwind-layout-review.md) for findings, checks, and coverage limits.
