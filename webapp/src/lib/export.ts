import { blockDuration, type Signature, validateSignature } from "./signature";

export function exportCpp(signature: Signature): string {
  const error = validateSignature(signature);
  if (error) throw new Error(error);
  const blocks = signature.blocks;
  const points = blocks.flatMap((block) =>
    block.type === "pulse" ? block.keyframes : [],
  );
  const rows = blocks
    .map(
      (block) =>
        `{${block.startMs}, ${blockDuration(block)}, ${block.type === "effect" ? block.effectId : 0}, ${block.type === "effect" ? 0 : pointsBefore(blocks, block.id)}, ${block.type === "effect" ? 0 : block.keyframes.length}}`,
    )
    .join(",\n  ");
  return `// Haptic Studio export. Requires initialized Adafruit_DRV2605 haptic,
// calibrated for your LRA. Call playSignature() from your firmware loop/task.
#include <Adafruit_DRV2605.h>
struct HapticPoint { uint16_t timeMs; uint8_t amplitude; };
struct HapticBlock { uint16_t startMs, durationMs; uint8_t effectId, pointOffset, pointCount; };
const HapticPoint signaturePoints[] = { ${points.length ? points.map((point) => `{${point.timeMs}, ${point.amplitudePercent}}`).join(", ") : "{0, 0}"} };
const HapticBlock signatureBlocks[] = {
  ${rows}
};
constexpr uint8_t signatureBlockCount = ${blocks.length};
constexpr uint16_t signatureEndMs = ${Math.max(...blocks.map((block) => block.startMs + blockDuration(block)))};
uint8_t signatureAmplitude(const HapticBlock& block, uint16_t elapsed) {
  const HapticPoint* p = signaturePoints + block.pointOffset;
  if (elapsed <= p[0].timeMs) return p[0].amplitude;
  for (uint8_t i = 1; i < block.pointCount; ++i) {
    if (elapsed <= p[i].timeMs) {
      const int32_t delta = int32_t(p[i].amplitude) - p[i-1].amplitude;
      const int32_t numerator = delta * (elapsed - p[i-1].timeMs);
      const int32_t denominator = p[i].timeMs - p[i-1].timeMs;
      const int32_t rounded = numerator >= 0 ? (numerator + denominator / 2) / denominator : -((-numerator + denominator / 2) / denominator);
      return uint8_t(int32_t(p[i-1].amplitude) + rounded);
    }
  }
  return p[block.pointCount - 1].amplitude;
}
void playSignature(Adafruit_DRV2605& haptic) {
  const uint32_t started = millis();
  int8_t active = -1;
  uint16_t lastTick = 0xFFFF;
  while (millis() - started < signatureEndMs && millis() - started < 5000) {
    uint16_t elapsed = uint16_t(millis() - started);
    int8_t next = -1;
    for (uint8_t i = 0; i < signatureBlockCount; ++i) {
      const HapticBlock& b = signatureBlocks[i];
      if (elapsed >= b.startMs && elapsed < b.startMs + b.durationMs) { next = i; break; }
    }
    if (next != active) {
      haptic.stop(); haptic.setRealtimeValue(0); active = next; lastTick = 0xFFFF;
      if (active >= 0) {
        const HapticBlock& b = signatureBlocks[active];
        if (b.effectId) {
          haptic.setMode(DRV2605_MODE_INTTRIG); haptic.selectLibrary(6);
          haptic.setWaveform(0, b.effectId); haptic.setWaveform(1, 0); haptic.go();
        } else haptic.setMode(DRV2605_MODE_REALTIME);
      }
    }
    if (active >= 0 && !signatureBlocks[active].effectId) {
      const HapticBlock& b = signatureBlocks[active];
      const uint16_t tick = (elapsed - b.startMs) / 10;
      if (tick != lastTick) {
        lastTick = tick;
        const uint8_t amplitude = signatureAmplitude(b, tick * 10);
        haptic.setRealtimeValue(uint8_t((uint16_t(amplitude) * 127 + 50) / 100));
      }
    }
    delay(1);
  }
  haptic.stop(); haptic.setRealtimeValue(0); haptic.setMode(DRV2605_MODE_INTTRIG);
}`;
}
function pointsBefore(blocks: Signature["blocks"], id: string): number {
  let count = 0;
  for (const block of blocks) {
    if (block.id === id) break;
    if (block.type === "pulse") count += block.keyframes.length;
  }
  return count;
}
