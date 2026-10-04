# Playback duration and storage calculations

Recorded October 4, 2026. These calculations describe possible extensions, not implemented support. The current app, firmware, and generated C++ still enforce a 5,000 ms playback limit.

## Extending the duration limit

The five-second limit is a software policy. Firmware and generated C++ use `uint16_t` for block start times, pulse durations, keyframe times, and signature end time.

```text
Maximum uint16_t value = 2^16 - 1 = 65,535
Timestamp ceiling = 65,535 ms = 65.535 seconds
Maximum duration aligned to the editor's 40 ms grid = 65,520 ms
```

| Proposed duration | Multiple of current limit | Additional time | 40 ms grid intervals |
| --- | ---: | ---: | ---: |
| 10 seconds | 2× | 5 seconds | 250 |
| 30 seconds | 6× | 25 seconds | 750 |
| 60 seconds | 12× | 55 seconds | 1,500 |

Sixty seconds fits the existing timestamp types. Supporting it requires coordinated changes to app validation, timeline and pulse limits, firmware validation and playback cutoff, generated C++ cutoff, tests, and documentation. The app should also check the duration capability reported by connected firmware so older boards cannot receive unsupported signatures.

The existing limits of 32 blocks and 32 pulse keyframes remain separate constraints. Thirty-two consecutive longest built-in effect slots occupy 32 seconds; longer signatures can include custom pulses or silent gaps.

## Generated C++ storage

Generated C++ stores blocks and keyframes, then calculates amplitudes during playback. It does not automatically store one sample per 10 ms interval.

Changing an existing duration from `5000` to `60000` does not change its data width: both values occupy a two-byte `uint16_t`. For the same block and keyframe counts, extending duration adds no array storage. Compiled program size can still vary slightly with instruction encoding and compiler optimization; an exact flash delta requires a build comparison.

Expected structure sizes under normal ESP32 alignment are:

| Structure | Fields | Bytes per entry | Maximum array size |
| --- | --- | ---: | ---: |
| `HapticBlock` | Two `uint16_t` timings and three `uint8_t` fields, including alignment padding | 8 | 32 × 8 = 256 bytes |
| `HapticPoint` | One `uint16_t` time and one `uint8_t` amplitude, including alignment padding | 4 | 32 × 4 = 128 bytes |
| Both arrays | | | 384 bytes |

These are array data estimates, not total firmware sizes. Playback functions, dependencies, constants, and other data add their own storage. Generated source text size is also different from compiled flash size. Confirm actual structure sizes and flash/RAM placement with the target compiler and linker map.

A new pulse block with two keyframes adds approximately 16 bytes of array data: 8 bytes for the block plus 8 bytes for its points. A built-in effect block adds approximately 8 bytes; its waveform is already stored in the DRV2605L's effect library. An effect-only export also emits one dummy point entry.

The live serial workflow has different storage behavior: firmware loads signatures into RAM. Extending duration without increasing entry counts does not enlarge its fixed signature arrays, serial buffers, or allocated JSON payload solely because playback lasts longer.

### Beyond the 16-bit ceiling

Durations above 65.535 seconds require wider timestamps and a review of casts, playback ticks, interpolation arithmetic, validation, and exports. Changing only a limit constant is insufficient.

If all timing fields become `uint32_t`, expected structure sizes become 12 bytes per block and 8 bytes per point:

```text
32 blocks × 12 bytes + 32 points × 8 bytes = 640 bytes
Increase over current maximum array data = 640 - 384 = 256 bytes
```

This corrects the earlier conversational estimate of 768 bytes. Other constants and code changes are excluded.

## Sixty seconds with a new amplitude every 10 ms

```text
60,000 ms / 10 ms = 6,000 playback intervals
```

There are two distinct cases:

- **Calculated amplitudes:** A smooth 60-second ramp can use two endpoint keyframes. Firmware calculates intermediate amplitudes at nominal 10 ms intervals. Longer playback does not require thousands of stored points.
- **Independent amplitudes:** If every interval has its own chosen amplitude, those 6,000 values must be stored or otherwise generated. The current 32-keyframe format cannot represent an arbitrary 6,000-value pattern.

| Representation | Entry count | Approximate array data |
| --- | ---: | ---: |
| Compact amplitude bytes; fixed 10 ms interval implied | 6,000 samples | 6,000 bytes, about 5.86 KiB |
| Current timestamped keyframe structures, including both 0 ms and 60,000 ms endpoints | 6,001 points | 24,004 bytes, about 23.44 KiB, plus block data |
| Separate 10 ms pulse blocks, each with two points | 6,000 blocks and 12,000 points | 96,000 bytes, about 93.75 KiB |

A compact sample format would apply sample 0 during `[0, 10)` ms and sample 5,999 during `[59,990, 60,000)` ms, then stop. No extra endpoint sample is needed for that convention. Timestamped keyframes instead pin a point at the final boundary, which explains the extra entry.

The separate-block estimate describes a hypothetical expanded format. Current firmware cannot load those block or point counts; its counts and offsets are also only eight bits wide.

## Candidate format for dense patterns

For independently chosen amplitudes every 10 ms, a byte array with an implicit fixed interval is more compact than thousands of timestamped keyframes. Each byte can hold the current 0–100% amplitude range. A C++ export could store approximately 6 KB of sample data in flash and read it during playback, subject to target-specific storage placement.

Live device loading would require a new or extended format, validation, capability reporting, and transfer handling. The current request line limit is 8,192 bytes. A plain JSON array of 6,000 numeric amplitudes exceeds that limit even when every value is a single digit, because separators alone nearly double the byte count. A 6 KB binary array is therefore not equivalent to a 6 KB JSON request.

Neither the 100 Hz update rate nor the 6 KB figure proves actual playback timing. Firmware loop work and I²C latency still require hardware measurement.

## Hardware duration remains separate

A representable 60-second timeline is not a validated 60-second continuous-drive rating. Actuator voltage, resistance, permitted duty cycle, thermal behavior, and the actual amplitude envelope determine that limit. Firmware checks driver overcurrent and overtemperature status, but those checks do not establish the actuator's permitted continuous operating time.

The [TI DRV2605L datasheet](https://www.ti.com/lit/ds/symlink/drv2605l.pdf) describes effect-library and host-controlled real-time playback. Actuator-specific documentation and hardware testing are still needed before establishing a supported continuous-drive duration.

## Relevant implementation files

- [`../src/main.cpp`](../src/main.cpp): timestamp types, signature arrays, validation, 10 ms pulse updates, and playback cutoff.
- [`../../webapp/src/lib/signature.ts`](../../webapp/src/lib/signature.ts): app duration, block, and keyframe limits.
- [`../../webapp/src/lib/export.ts`](../../webapp/src/lib/export.ts): generated structures, arrays, and playback loop.
- [`../../webapp/src/lib/timeline.ts`](../../webapp/src/lib/timeline.ts): 40 ms editor grid.
- [`../README.md`](../README.md): protocol, hardware profile, and current request limits.
