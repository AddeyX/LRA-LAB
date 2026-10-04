import { quintOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

/** Drops a panel down from its top edge, like a sheet unrolling under the header island. */
export function reveal(
  _node: Element,
  { duration = 520, radius = 16 }: { duration?: number; radius?: number } = {},
): TransitionConfig {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    return { duration: 0 };
  return {
    duration,
    easing: quintOut,
    css: (t, u) =>
      `clip-path: inset(0 0 ${u * 100}% 0 round ${radius}px);` +
      `transform: scale(${0.98 + t * 0.02});` +
      `opacity: ${Math.min(1, t * 1.6)};`,
  };
}
