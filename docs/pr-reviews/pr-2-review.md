# PR #2 review — guided setup, calculator, and firmware downloads

Reviewed 2026-10-04. PR: https://github.com/AddeyX/LRA-LAB/pull/2. Head: `a3e23ed8de7812e0dfde0445e2c5b841d32c297c`. Base: `d7ff433f1ee83291d542f27bc910a347c285c62b`. Scope: 41 files, +4,097 / −623 lines.

> Implementation follow-up (2026-10-04): All seven findings below were fixed in separate local commits (`afa5a66` through `fc9dae7`). Fresh review found an additional permission-change-during-LOAD race, fixed separately in `990ebde`. Final validation: 102 tests passed; typecheck and static build passed. Browser checks with a mocked board confirmed mismatch blocking, legacy acknowledgment, and completion persisted only after DONE. No physical hardware validation or firmware compilation was performed. One minor follow-up remains: setup's legacy-profile warning still uses mismatch wording despite the central acknowledgment policy. The original audit below is retained as historical context.

## 1. Executive Summary

**Request changes.** All three unresolved technical review comments are valid. Broader code inspection identified four additional issues: detected firmware mismatches do not gate hardware actions, failed serial handshakes leak the open connection, empty recovery drafts restore deleted content, and the first-haptic step records success before playback finishes.

The `app.css` instruction comment was already resolved by AddeyX when checked. This review does not reopen it or infer permission for future stylesheet changes. CodeRabbit skipped its review; its top-level comment contains no technical findings.

This pass produced analysis only. No application code, firmware, or stylesheet was changed; no GitHub replies, thread resolutions, or commits were made. The existing local AGENTS.md edit was preserved.

## 2. PR Map

| Area | Changes / inspection scope |
| --- | --- |
| Setup | New guided/docs components, persisted rig configuration, connect/calibrate/test actions. |
| Firmware generation | Register calculator, source patching, Arduino/PlatformIO archives, ZIP writer. |
| Studio | Space playback shortcut, dialog styling, timeline controls, layout. |
| Broader scan | Serial lifecycle, playback, firmware command handling, draft/project persistence, signature validation, pulse library, timeline/envelope helpers, C++ export. |
| Tests/build | New calculator, firmware and setup tests; Vite access to sibling firmware sources. |

Firmware source itself is unchanged by this PR, but the new downloads reuse it. The branch also includes studio/layout work beyond the setup feature. Review focused on behavioral paths and contracts; it is not an exhaustive hardware or visual audit.

## 3. Findings

### F1 — High: downloaded completion survives configuration changes

- **Existing unresolved comment:** https://github.com/AddeyX/LRA-LAB/pull/2#discussion_r4176586701
- **Evidence:** `webapp/src/lib/components/setup/sections/FirmwareSection.svelte:70` sets `setup.downloaded = true`; `webapp/src/lib/components/setup/SetupView.svelte:85` treats that boolean as completion. `webapp/src/lib/setup.svelte.ts:99` restores the persisted boolean without checking the associated configuration.
- **Trigger:** Download firmware, then change voltage, frequency, pins, route, board ID, or USB option. Firmware remains marked complete although the previous artifact has different settings.
- **Consequence:** The guide can direct a user onward with stale firmware, including stale actuator limits.
- **Fix:** Persist the configuration identity of the downloaded artifact and derive completion from equality with the current configuration. Treat old boolean-only storage conservatively; invalidate dependent success indicators when the rig changes.
- **Verification:** Code-path inspection; current tests cover persistence but not invalidation.

### F2 — High: firmware identity omits voltage registers

- **Existing unresolved comment:** https://github.com/AddeyX/LRA-LAB/pull/2#discussion_r4176586705
- **Evidence:** `webapp/src/lib/lra-profile.ts:148` includes only rounded frequency and pins. `webapp/src/lib/components/setup/SetupView.svelte:72` compares this label against the board report.
- **Reproduced:** Configurations with register pairs `[50, 79]` and `[83, 141]` both report `LRA-170Hz-GPIO4-5`.
- **Consequence:** Changing rated/clamp voltage can appear to match firmware that still contains the old values.
- **Fix:** Include rated voltage, clamp voltage, drive time, and pins in a versioned identity. Keep generated firmware and bundled firmware reporting consistent; explicitly handle legacy identities as unverified.

### F3 — High: a detected firmware mismatch still permits hardware actions

- **Additional finding; new setup path plus existing shared action handlers.**
- **Evidence:** `webapp/src/lib/components/setup/SetupView.svelte:305` passes `ready={connected && calibrated}` to the test step regardless of `mismatch`. `webapp/src/lib/components/setup/sections/CalibrateSection.svelte:45` enables calibration based only on connection/busy state. `webapp/src/routes/+page.svelte:104` also defines studio board readiness without profile compatibility.
- **Trigger:** Connect firmware with a different reported profile, then go to Calibrate or First haptic. The mismatch warning is displayed on Connect, but hardware commands remain available elsewhere.
- **Consequence:** Fixing F2 alone improves detection without preventing use of the wrong configuration.
- **Fix:** Centralize known-profile compatibility in hardware action guards and button readiness. Block known mismatches and provide a path to reflash/reconnect. Define unknown/legacy-profile behavior explicitly while retaining offline simulation.
- **Verification:** Traced props and shared handlers; no physical actuator was driven.

### F4 — Medium: handshake timeout leaves the serial port open and locked

- **Additional finding; pre-existing.**
- **Evidence:** `webapp/src/lib/serial.ts:47` awaits HELLO without failure cleanup. Explicit cleanup exists only after certain successful responses. `webapp/src/routes/+page.svelte:413` drops the serial instance on connection failure.
- **Reproduced:** With a mock port that never answers HELLO, connect rejects after three seconds. Observed `closed: false`, `readLocked: true`, `writeLocked: true`, `portRetained: true`.
- **Consequence:** Retrying connection to the same port can fail because the original instance still owns it; the page has discarded its cleanup handle.
- **Fix:** Ensure every failure after acquiring/opening the port releases readers/writers and closes the port before rethrowing. Cover timeout, rejected handshake, and partial initialization.

### F5 — Medium: empty recovery drafts resurrect deleted beats

- **Additional finding; pre-existing.**
- **Evidence:** `webapp/src/lib/signature.ts:143` validates drafts with the playback validator, which rejects zero blocks at line 63. `webapp/src/routes/+page.svelte:556` reads that draft; line 565 falls back to the saved project when validation fails.
- **Trigger:** Open a saved nonempty project, delete every beat, then reload without saving the project.
- **Reproduced:** `validProjectSignature(emptySignature())` returns true, but `parseDraft(JSON.stringify(emptySignature()))` returns null. The page's fallback restores the old saved beats.
- **Consequence:** Legitimate unsaved deletions are lost, and an empty editor is incorrectly reported as corrupt recovery data.
- **Fix:** Use draft validation that accepts an empty editable signature while keeping playback validation strict. Add a reload/recovery regression for deleting the last beat of a saved project.

### F6 — Medium: first-haptic success is persisted before DONE

- **Additional finding; introduced by this PR.**
- **Evidence:** `webapp/src/lib/serial.ts:108` awaits PREVIEW, which resolves on PLAYING; `webapp/src/routes/+page.svelte:487` immediately returns true. `webapp/src/lib/components/setup/SetupView.svelte:193` then persists `setup.felt = true`.
- **Trigger:** Start the test signature, then stop it or receive a playback fault/disconnect before completion.
- **Consequence:** The guide retains its successful first-haptic state despite interrupted/failed playback. It can display readiness alongside a failure message.
- **Fix:** Mark completion only after DONE for the relevant test request. Preserve incomplete status on STOPPED, ERROR, or disconnect. If actual felt response is required, use a separate user acknowledgment.
- **Verification:** Traced the PLAYING → resolved request → persisted state sequence; no end-to-end browser repro was run.

### F7 — Medium: clamp warning compares peak volts directly with RMS volts

- **Existing unresolved comment:** https://github.com/AddeyX/LRA-LAB/pull/2#discussion_r4176586709
- **Evidence:** `webapp/src/lib/lra-profile.ts:121` compares `clampVpeak < ratedVrms`.
- **Reproduced:** With rated input 1.2 V RMS and maximum 1.5 V peak, calculated clamp is 1.4854 V peak and nominal sinusoidal rated peak is approximately 1.6860 V, but warnings are empty.
- **Consequence:** The calculator misses a clamp below the nominal waveform peak.
- **Fix:** Compare both values in the same convention, e.g. clamp peak against `ratedVrms * Math.SQRT2`, and update warning wording/tests. Distinguish entered ratings from quantized register values in expectations.

## 4. Strengths

- Firmware generation checks for exactly one template match instead of silently producing partially patched firmware (`webapp/src/lib/firmware.ts:18`).
- Signature validation and firmware parsing enforce bounds, ordered blocks, and non-overlap (`webapp/src/lib/signature.ts:58`, `firmware/src/main.cpp:86`).
- Timeline edits validate the full candidate before accepting changes (`webapp/src/lib/timeline.ts:14`).
- Pulse library persistence protects unreadable existing data from replacement (`webapp/src/lib/pulse-library.ts:148`).
- Existing automated checks pass on the reviewed head.

## 5. Risk Assessment

Top risks: stale actuator configuration appears current (F1/F2); known mismatches can still drive hardware (F3); incomplete asynchronous operations leave misleading or unusable state (F4/F6).

Validation performed:

- `pnpm test`: **64 tests passed**, 10 files.
- `pnpm check`: **0 errors, 0 warnings**.
- `pnpm build`: **passed**, static output generated.
- Svelte autofixer on SetupView: no issues; only generic effect/attachment suggestions.
- Read-only Vite module probes reproduced F2, F4, F5's validator mismatch, and F7. Mock serial resources were explicitly cleaned up after probing.

Coverage confidence: good for existing pure helpers; limited for serial failure recovery and component-level setup transitions. Passing tests do not cover the reported cases. No physical hardware tests, firmware compilation, browser interaction tests, or full visual regression were performed during this pass.

**Verdict: Request changes.**

## 6. Fix Plan

Every bug fix requires regression tests under AGENTS.md. No app.css edits are needed for these technical fixes.

| Priority | Task / files | Acceptance criteria | Effort | Fix risk |
| --- | --- | --- | --- | --- |
| Before merge | F1/F2: setup state, profile identity, firmware generator/report | Each relevant setting invalidates stale completion; voltage changes produce different identities; legacy storage and firmware handled explicitly. | M | Medium: compatibility/migration |
| Before merge | F3: SetupView, page action guards, setup action sections | Known mismatch prevents calibration and hardware playback from every entry point; matching rig works; offline simulation remains available. | M | Medium: shared action state |
| Before merge | F6: serial/playback completion and setup buzz state | PLAYING alone does not mark complete; matching DONE does; stop/fault/disconnect cannot mark success. | M | Medium: async ordering |
| Before merge | F7: lra-profile.ts and tests | Peak/RMS equivalent inputs warn consistently, including a clamp between rated RMS and nominal rated peak. | S | Low |
| Soon | F4: serial.ts, connection handler, serial tests | All failed handshakes release both locks, close port, and allow retry. | M | Medium: stream cleanup races |
| Soon | F5: draft parser and recovery tests | Deleting every beat survives reload; malformed drafts still fall back safely; empty signatures remain unplayable. | S | Low |

Optional follow-up: add a reusable mocked-board integration harness for setup and playback lifecycle tests. Avoid unrelated refactors.

## 7. Open Questions

- Should legacy or missing firmware identities block hardware actions or require explicit acknowledgment? A known mismatch should not silently proceed.
- Does first-haptic completion mean a successful DONE response, or user-confirmed physical response? Current state name `felt` suggests the latter, but no acknowledgment exists.
- app.css thread is already resolved by the owner. No further stylesheet authorization was inferred or requested in this audit.
