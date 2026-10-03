# LRA Lab V1 scope

Status: definitive scope supplied by the user on 2026-10-02; implementation reviewed on 2026-10-03 against recent commits and current code through `64a96a5`. Checked, struck-through items are implemented in the current code. Unchecked items remain incomplete, partially implemented, or unverified against the full requirement. This update is documentation only.

## Product goal

Create a clean workspace where users can add, edit, save, and test haptic signatures on the fly. Users can review playback through audio and visual waveform displays without hardware, then test the same signature on their own ESP32, DRV2605L driver, and linear resonant actuator (LRA).

This document is the source of truth for V1 product scope. Where earlier design documents conflict with it, this scope takes precedence. Existing editor capabilities and signature validation remain the baseline, including reusable pulses, browser projects, JSON import/export, sequential effect and pulse blocks, and current playback limits. V1 adds the requirements below.

## 1. Timeline mini-map

- [x] ~~Place a mini-map directly below the main timeline.~~
- [x] ~~Show the full signature duration, occupied sections, silent gaps, and the portion currently visible in the main timeline.~~
- [x] ~~Let users scrub and navigate to occupied sections with pointer and keyboard controls.~~
- [x] ~~Mini-map interaction changes the main timeline viewport. Main timeline navigation and zoom update the mini-map's viewport indicator.~~
- [x] ~~Scrubbing must not move blocks or change signature timing.~~
- [x] ~~Provide an understandable empty state before users add blocks.~~

- [x] ~~Acceptance: users can find a placed block through the mini-map and navigate to its timeline region. Both displays stay synchronized without changing the signature.~~

## 2. Playback arm, audio, and waveform visualizers

- [x] ~~Preview or Play starts a visible timeline arm indicating approximate playback progress through the signature.~~
- [x] ~~Synchronize the arm and waveform displays to the same signature timeline, including silent gaps.~~
- [x] ~~Stop, completion, disconnect, and playback failure leave an explicit stopped or completed state rather than a moving arm.~~
- [x] ~~Show both audio and visual waveform visualizers during playback without a connected board. Include an audio waveform representation and the haptic amplitude envelope so users can see what the signature is doing without an LRA setup.~~
- [x] ~~Keep hardware preview available for users with a connected and calibrated LRA.~~
- [x] ~~Identify simulated output as an approximation. The arm represents timeline progress, not measured physical actuator position; simulated waveforms are not live actuator measurements. Built-in driver effects must not be presented as exact measured waveforms without supporting data.~~

- [x] ~~Acceptance: users can preview a signature without hardware while seeing synchronized progress and both waveform visualizers. Connected hardware playback retains calibration and validation requirements.~~

## 3. ESP32 choice and bring-your-own LRA

### ESP32 setup

- [x] ~~Do not add an ESP32 variant selector to the application.~~
- [ ] Replace product and setup wording that requires the current C3/S3 configuration with instructions that let users choose their own ESP32 device.
- [ ] Explain how users select their board in Arduino IDE or PlatformIO and configure valid I²C pins, upload settings, and the board's available serial connection.
- [ ] Keep board-specific settings in firmware configuration and toolchain instructions rather than a hardcoded application variant choice.
- [ ] Keep browser compatibility instructions accurate. ESP32 model names and Chrome/Edge Web Serial requirements describe different constraints; removing a board restriction does not remove the browser API requirement for hardware connection.

### LRA values and application calculator

- [ ] Support user-supplied LRAs rather than requiring the current 170 Hz actuator profile.
- [ ] Provide an application calculator that converts the user's LRA specifications into firmware settings.
- [ ] Collect rated voltage, permitted maximum drive/clamp voltage, and nominal resonant frequency, plus any additional driver parameters needed by the verified conversion method.
- [ ] Label units and voltage conventions explicitly, including RMS versus peak where relevant. Explain which values users should obtain from their actuator documentation.
- [ ] Show entered specifications and derived firmware constants/register values, including voltage and drive-time settings.
- [ ] Validate missing, invalid, and unsupported values before generating firmware. Do not silently substitute the current fixed actuator defaults.
- [ ] Use the same derived configuration in the calculator output and downloadable firmware. Generated code must not retain contradictory hardcoded settings.
- [ ] Document conversion formulas, rounding, valid ranges, and driver assumptions against the DRV2605L documentation during implementation.
- [ ] Treat configuration and calibration as separate steps. A calculated profile does not mean physical calibration has passed.

- [ ] Acceptance: users can enter their own LRA specifications and board pins, review calculated settings, and obtain firmware containing those settings. Current C3/S3 and 170 Hz defaults are not mandatory product choices.

## 4. Firmware downloads and upload instructions

- [ ] Provide a downloadable, configurable copy of the application firmware, not only the existing signature data/playback helper export.
- [ ] Supply an Arduino sketch (`.ino`) or main C++ source (`main.cpp`) appropriate to the upload path. Both Arduino IDE and PlatformIO users must have a documented usable route; identical packaging is not required.
- [ ] Include protocol handling, driver initialization, user-selected configuration, calibration, and signature playback in the firmware source.
- [ ] State required libraries, compatible dependency versions, configuration placement, and how the download fits into an existing project. Include supporting files required to build it.
- [ ] Keep firmware downloads available from the statically hosted site.
- [x] ~~Preserve signature-specific C++ export alongside complete firmware download.~~

### Lightweight Arduino IDE route

Provide concise steps tailored to Arduino IDE:

- [ ] Install the ESP32 board package and required libraries.
- [ ] Download/open the sketch, or place the supplied source and configuration in the documented sketch structure.
- [ ] Select the user's ESP32 board and upload port; apply only the serial/USB options that board needs.
- [ ] Check wiring, LRA settings, and I²C pins, then upload.
- [ ] Close Serial Monitor, connect through the web app, calibrate, and preview.

Arduino IDE users must not need PlatformIO-specific project files or commands. Provide a separate concise PlatformIO route for VS Code users, covering board configuration, dependencies, source placement, build, and upload.

- [ ] Acceptance: each route supplies enough source, configuration, and instructions to build and flash the selected ESP32, then connect and calibrate through LRA Lab.

## 5. Workspace layout, themes, and identity

- [ ] Use a bento-box layout with stable section sizes independent of content volume.
- [ ] Fit the complete primary workspace within the viewport without document scrolling. Keep timeline, mini-map, library, inspector, playback controls, and waveform displays reachable.
- [ ] Adapt section dimensions to the supported viewport and active workspace mode. Adding blocks, switching selection, or changing status text must not grow sections and push controls off the page.
- [ ] Use concise content and progressive setup steps to preserve the page-fit goal. Define supported viewport sizes during design rather than promising one fixed pixel layout for every screen.
- [ ] Preserve readable controls, visible focus, and keyboard access when adapting the layout.
- [ ] Add a workspace color switcher for dark and light themes. Cover every application surface, including popovers, dialogs, timeline, calculator, setup, and visualizers.
- [ ] Add a proper application logo, with legible presentation in both themes and appropriate application icon assets.
- [ ] Give the board connection popover consistent spacing, typography, status presentation, and action hierarchy. Its shell and content must share compatible widths; badges and buttons must not clip.

- [ ] Acceptance: at documented supported viewports, content changes do not resize workspace sections or introduce page scrolling. Users can switch themes, identify the application, and operate all workspace controls and the board popover.

## 6. Static deployment, GitHub access, and changelog

- [ ] Publish the site statically on GitHub Pages through GitHub Actions, following the public Portal Bits repository's deployment method.
- [ ] Build a static site with the repository base path applied to routes, assets, and firmware downloads. No application server is required in production.
- [ ] Add an easily accessible interface link to the [LRA Lab repository](https://github.com/AddeyX/LRA-LAB).
- [ ] Provide a changelog accessible from the interface. Entries describe released changes; planned work must not be presented as shipped.

### Deployment reference

The user named `adx/portal-bits`. The public [AddeyX/portal-bits repository](https://github.com/AddeyX/portal-bits) is used here as the matching reference, inferred from the project owner and Portal Bits dependency. Its [deployment workflow](https://github.com/AddeyX/portal-bits/blob/594e946d71261c26cce619fbeb0d1d55bc4e59c8/.github/workflows/deploy.yml) was inspected on 2026-10-02 at commit `594e946d71261c26cce619fbeb0d1d55bc4e59c8`.

The reference deploys on pushes to `main`, builds with Node 22 and a repository-specific `BASE_PATH`, uploads `build/` with `actions/upload-pages-artifact`, and deploys through a dependent job using `actions/deploy-pages`. It uses Pages permissions, a `github-pages` environment, and a Pages concurrency group. Apply the same build/artifact/deploy structure to LRA Lab, adapting dependency installation to this project's pnpm lockfile.

- [ ] Acceptance: a main-branch deployment publishes a working static site with correct repository paths, downloadable firmware, repository access, and a readable changelog.

## V1 boundaries

V1 centers on signature creation, navigation, simulation, hardware testing, user-configured firmware, and the static workspace described above. Earlier exclusions remain unless explicitly changed here: multi-track or overlapping playback, cloud accounts/sync, arbitrary audio import, ERM support, firmware flashing directly in the browser, and continuous sample streaming to hardware are outside V1.

The LRA calculator configures downloadable firmware; this scope does not require live register editing on a connected board. Audio and visual simulation support review without hardware; physical actuator behavior still requires hardware testing.

## Release checklist

- [x] ~~Mini-map controls and reflects the main timeline viewport.~~
- [ ] Hardware-neutral ESP32 setup replaces mandatory current-board wording without an application variant selector.
- [ ] User-supplied LRA values produce validated firmware settings through the calculator.
- [ ] Complete configured firmware downloads support Arduino IDE and PlatformIO upload paths.
- [ ] Arduino IDE instructions are concise and independent of PlatformIO commands.
- [ ] Bento workspace fits supported viewports with stable section sizes and no document scrolling.
- [ ] Dark/light themes, application logo, and properly styled board popover are complete.
- [x] ~~Playback arm and audio/visual waveform displays work without a board.~~
- [x] ~~Connected hardware preview, calibration, validation, and Stop remain functional.~~
- [ ] GitHub Actions publishes a static GitHub Pages site using the reference method.
- [ ] Interface links to the repository and changelog; published downloads and asset paths work.

These items describe release requirements. A checked item records code implementation, not a fresh browser or physical hardware acceptance test.

## Review evidence and remaining gaps

- `64a96a5` implements the mini-map, shared playback clock, stopped/completed/failed states, simulated audio, and waveform displays. See [timeline and playback interactions](./timeline-playback-interactions.md), `src/lib/HapticTimeline.svelte`, `src/lib/playback.svelte.ts`, `src/lib/simulation.ts`, and `src/lib/components/header/PlaybackIsland.svelte`.
- `src/routes/+page.svelte` retains signature validation, calibrated-board playback, calibration, disconnect handling, and Stop. Hardware behavior has not been physically retested in this review.
- No application ESP32 variant selector exists. However, `src/lib/SetupView.svelte` still requires ESP32-C3 wording, fixed GPIO4/GPIO5 wiring, and the 170 Hz firmware profile. Hardware-neutral setup and accurate hosted-site browser guidance remain open.
- No LRA calculator or complete configured firmware download exists. Setup documents PlatformIO only; `src/lib/export.ts` and the code dialog retain signature-specific C++ export.
- `ad46721`, `103041b`, and `354a008` improve the bento layout, board popover, and viewport fit. Responsive stacking and content-sized rows remain; the complete stable-size/page-fit/accessibility requirements have not been verified across documented supported viewports. These requirements stay open.
- `src/lib/components/header/LabLogo.svelte` provides an application logo, and `src/app.html` includes a favicon. Complete light/dark theme coverage and matching application icon assets remain open. The board popover has dedicated styling, but clipping and all connection states were not browser-verified in this review.
- `webapp/svelte.config.js` still uses `adapter-auto`; there is no GitHub Pages workflow, static base-path configuration, complete firmware asset download, interface repository link, or interface changelog.
