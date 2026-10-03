# Tailwind migration layout review

## Align to shared edges

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/app.css:541`, `src/app.css:863`, `src/app.css:972`, `src/app.css:1007`, `src/lib/components/ScrubField.svelte:534`, `src/routes/+page.svelte:1069` | Directional borders, spacing, text alignment, and delta placement used physical sides. | Logical spacing, borders, alignment, and delta positioning. Timeline uses explicit `dir="ltr"`. | Align to shared edges: surrounding chrome mirrors in RTL while the timeline preserves its physical interaction model. |
| LOW | `src/app.css:239`, `src/routes/+page.svelte:1069` | Panel headings used 24px gutters; inspector fields used 25px. | Shared 24px token-derived gutter. | Align to shared edges: headings and editable content share a reading edge. |

## Plan for growth and clipping

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/app.css:777`, `src/app.css:1123`, `src/lib/HapticTimeline.svelte:130` | Toolbar, header action group, and setup navigation could not wrap growing controls; desktop header had a fixed height. | Wrapping control groups; header uses minimum height. | Plan for growth and clipping: expanded labels remain reachable at narrow widths. |

## Group with space

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `src/app.css:422` | Empty inspector showed a separator despite already having generous whitespace. | Whitespace groups the empty-state guidance. | Group with space: removes a competing edge without weakening hierarchy. |

## Verification

- `pnpm check`: zero errors and warnings.
- `pnpm test`: 17 tests passed across four files.
- `pnpm build`: passed. Adapter-auto reports no deployment target; this migration does not add one.
- Svelte autofixer: no issues in all six edited Svelte components. Existing suggestions concerning DOM references and Motion synchronization effects were reviewed; they do not require changes for this migration.
- Source scan: no raw hex/RGB colors, px/rem distances, or legacy palette references in app CSS/Svelte outside `src/tokens.css`. SVG illustration coordinates and unitless waveform strokes remain graphic geometry.
- Token reference scan: no missing theme references in global CSS or the theme.
- 74 production-browser layout cases: studio, setup, and Settings dialog at 320, 375, 480, 500, 520, 759, 760, 900, 1050, 1100, 1440, and 1920 CSS pixels, in LTR and RTL; a 720px viewport representing a 1440px screen at 200% zoom; and a German setup action label at 320px. No document overflow or horizontally clipped checked primary actions.
- Built-in and pulse placement, keyboard movement, keyboard pulse resizing, pointer beat movement, pointer scrub input, and zoom edits passed. A temporary timeline cell-size token change from 20px to 24px produced the expected geometry and placement coordinates.
- Dark portaled dialog styling checked. Desktop studio and mobile setup screenshots inspected.
- **Not verified:** native browser 200% zoom controls, complete pseudo-localization, a complete translated locale, connected-board popover, and physical hardware behavior.

Approve — inspected migration and layout coverage only.
