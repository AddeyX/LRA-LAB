#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_DRV2605.h>
#include <ArduinoJson.h>

namespace {
constexpr uint8_t SDA_PIN = 4;
constexpr uint8_t SCL_PIN = 5;
constexpr uint8_t RATED_VOLTAGE = 0x32;
constexpr uint8_t CLAMP_VOLTAGE = 0x4F;
constexpr uint8_t DRIVE_TIME = 0x18;
constexpr uint8_t PROTOCOL_VERSION = 1;
constexpr uint8_t CATALOG_VERSION = 1;
constexpr uint16_t MAX_DURATION_MS = 5000;
constexpr uint8_t MAX_BLOCKS = 32;
constexpr uint8_t MAX_POINTS = 32;
constexpr size_t MAX_LINE = 8192;
constexpr uint8_t EFFECT_IDS[] = {1,2,3,4,5,6,7,8,9,15,16};
constexpr uint16_t EFFECT_DURATIONS[] = {120,120,120,120,120,120,160,160,160,750,1000};
struct Point { uint16_t timeMs; uint8_t amplitude; };
struct Block { uint16_t startMs, durationMs; uint8_t effectId, pointOffset, pointCount; };
struct Signature { Block blocks[MAX_BLOCKS]; Point points[MAX_POINTS]; uint8_t blockCount = 0; uint8_t pointCount = 0; uint16_t endMs = 0; };
Adafruit_DRV2605 haptic;
Signature loaded;
bool ready = false;
bool calibrated = false;
bool hasLoaded = false;
bool playing = false;
uint32_t startedAt = 0;
uint32_t nextFaultCheck = 0;
int8_t activeBlock = -1;
uint16_t lastTick = UINT16_MAX;
uint32_t previewRequestId = 0;
char lineBuffer[MAX_LINE + 1];
size_t lineLength = 0;
bool lineOverflow = false;

void send(uint32_t requestId, const char* type, const char* code = nullptr, const char* message = nullptr) {
  JsonDocument doc;
  doc["protocolVersion"] = PROTOCOL_VERSION;
  doc["requestId"] = requestId;
  doc["type"] = type;
  if (code) doc["code"] = code;
  if (message) doc["message"] = message;
  if (!strcmp(type, "READY")) {
    doc["firmwareVersion"] = "1.0.0";
    doc["catalogVersion"] = CATALOG_VERSION;
    doc["ready"] = ready;
    doc["calibrated"] = calibrated;
    doc["profile"] = "LRA-170Hz-GPIO4-5";
    doc["maxDurationMs"] = MAX_DURATION_MS;
    doc["maxBlocks"] = MAX_BLOCKS;
    doc["maxKeyframes"] = MAX_POINTS;
  } else if (!strcmp(type, "CALIBRATED")) doc["calibrated"] = calibrated;
  serializeJson(doc, Serial);
  Serial.write('\n');
}
void error(uint32_t id, const char* code, const char* message) { send(id, "ERROR", code, message); }
void quiet() {
  if (!ready) return;
  haptic.stop();
  haptic.setRealtimeValue(0);
  haptic.setMode(DRV2605_MODE_INTTRIG);
  activeBlock = -1;
  lastTick = UINT16_MAX;
}
void finish(const char* reason = nullptr) {
  if (!playing) return;
  quiet(); playing = false;
  if (reason) error(previewRequestId, "PLAYBACK_FAULT", reason);
  else send(previewRequestId, "DONE");
}
int effectDuration(int id) {
  for (size_t i = 0; i < sizeof(EFFECT_IDS); ++i) if (EFFECT_IDS[i] == id) return EFFECT_DURATIONS[i];
  return -1;
}
bool integerIn(JsonVariantConst value, int min, int max, int& out) {
  if (!(value.is<int>() || value.is<unsigned int>() || value.is<long>() || value.is<unsigned long>())) return false;
  long number = value.as<long>();
  if (number < min || number > max) return false;
  out = int(number);
  return true;
}
bool parseSignature(JsonVariantConst value, Signature& candidate, const char*& reason) {
  if (!value.is<JsonObjectConst>()) { reason = "Missing signature object."; return false; }
  JsonObjectConst object = value.as<JsonObjectConst>();
  int schema;
  if (!integerIn(object["schemaVersion"], 1, 1, schema)) { reason = "Unsupported signature schema."; return false; }
  JsonArrayConst blocks = object["blocks"].as<JsonArrayConst>();
  if (blocks.isNull() || blocks.size() < 1 || blocks.size() > MAX_BLOCKS) { reason = "Use 1-32 blocks."; return false; }
  uint16_t previousEnd = 0;
  const char* seenIds[MAX_BLOCKS] = {};
  for (JsonVariantConst item : blocks) {
    if (!item.is<JsonObjectConst>()) { reason = "Invalid block."; return false; }
    JsonObjectConst source = item.as<JsonObjectConst>();
    const char* id = source["id"].as<const char*>();
    const char* type = source["type"].as<const char*>();
    int start;
    if (!id || !*id || !type || !integerIn(source["startMs"], 0, MAX_DURATION_MS, start) || start < previousEnd) { reason = "Blocks must be ordered and cannot overlap."; return false; }
    for (uint8_t i = 0; i < candidate.blockCount; ++i) {
      if (!strcmp(seenIds[i], id)) { reason = "Block IDs must be unique."; return false; }
    }
    seenIds[candidate.blockCount] = id;
    Block block{};
    block.startMs = uint16_t(start);
    if (!strcmp(type, "effect")) {
      int effect;
      if (!integerIn(source["effectId"], 1, 127, effect) || effectDuration(effect) < 0) { reason = "Unsupported effect ID."; return false; }
      block.effectId = uint8_t(effect);
      block.durationMs = uint16_t(effectDuration(effect));
    } else if (!strcmp(type, "pulse")) {
      int duration;
      if (!integerIn(source["durationMs"], 10, MAX_DURATION_MS, duration)) { reason = "Pulse duration must be 10-5000 ms."; return false; }
      block.durationMs = uint16_t(duration);
      JsonArrayConst points = source["keyframes"].as<JsonArrayConst>();
      if (points.isNull() || points.size() < 2 || candidate.pointCount + points.size() > MAX_POINTS) { reason = "Invalid pulse keyframe count."; return false; }
      block.pointOffset = candidate.pointCount;
      block.pointCount = points.size();
      int previousTime = -1;
      for (JsonVariantConst pointValue : points) {
        if (!pointValue.is<JsonObjectConst>()) { reason = "Invalid keyframe."; return false; }
        JsonObjectConst point = pointValue.as<JsonObjectConst>();
        int time, amplitude;
        if (!integerIn(point["timeMs"], 0, duration, time) || !integerIn(point["amplitudePercent"], 0, 100, amplitude) || time <= previousTime) { reason = "Keyframe time or amplitude invalid."; return false; }
        candidate.points[candidate.pointCount++] = {uint16_t(time), uint8_t(amplitude)};
        previousTime = time;
      }
      if (candidate.points[block.pointOffset].timeMs != 0 || previousTime != duration) { reason = "Pulse endpoints must match duration."; return false; }
    } else { reason = "Unknown block type."; return false; }
    const uint32_t end = uint32_t(start) + block.durationMs;
    if (end > MAX_DURATION_MS) { reason = "Signature exceeds 5 seconds."; return false; }
    previousEnd = uint16_t(end);
    candidate.blocks[candidate.blockCount++] = block;
  }
  candidate.endMs = previousEnd;
  return true;
}
uint8_t amplitudeAt(const Block& block, uint16_t elapsed) {
  const Point* points = loaded.points + block.pointOffset;
  if (elapsed <= points[0].timeMs) return points[0].amplitude;
  for (uint8_t i = 1; i < block.pointCount; ++i) {
    if (elapsed <= points[i].timeMs) {
      const Point& left = points[i - 1];
      const Point& right = points[i];
      const int32_t numerator = int32_t(right.amplitude - left.amplitude) * int32_t(elapsed - left.timeMs);
      const int32_t denominator = right.timeMs - left.timeMs;
      const int32_t rounded = numerator >= 0 ? (numerator + denominator / 2) / denominator : -((-numerator + denominator / 2) / denominator);
      return uint8_t(int32_t(left.amplitude) + rounded);
    }
  }
  return points[block.pointCount - 1].amplitude;
}
void updatePlayback() {
  if (!playing) return;
  const uint32_t elapsed = millis() - startedAt;
  if (elapsed >= MAX_DURATION_MS || elapsed >= loaded.endMs) { finish(); return; }
  if (millis() >= nextFaultCheck) {
    nextFaultCheck = millis() + 50;
    const uint8_t status = haptic.readRegister8(DRV2605_REG_STATUS);
    if (status & 0x01) { finish("DRV2605L overcurrent. Check actuator wiring."); return; }
    if (status & 0x02) { finish("DRV2605L overtemperature. Let board cool."); return; }
  }
  int8_t next = -1;
  for (uint8_t i = 0; i < loaded.blockCount; ++i) {
    const Block& block = loaded.blocks[i];
    if (elapsed >= block.startMs && elapsed < uint32_t(block.startMs) + block.durationMs) { next = int8_t(i); break; }
  }
  if (next != activeBlock) {
    quiet(); activeBlock = next;
    if (next >= 0) {
      const Block& block = loaded.blocks[next];
      if (block.effectId) {
        haptic.selectLibrary(6);
        haptic.setWaveform(0, block.effectId);
        haptic.setWaveform(1, 0);
        haptic.go();
      } else haptic.setMode(DRV2605_MODE_REALTIME);
    }
  }
  if (activeBlock >= 0) {
    const Block& block = loaded.blocks[activeBlock];
    if (!block.effectId) {
      const uint16_t tick = (elapsed - block.startMs) / 10;
      if (tick != lastTick) {
        lastTick = tick;
        const uint8_t amplitude = amplitudeAt(block, tick * 10);
        haptic.setRealtimeValue(uint8_t((uint16_t(amplitude) * 127 + 50) / 100));
      }
    }
  }
}
void calibrate(uint32_t id) {
  quiet(); calibrated = false;
  haptic.setMode(DRV2605_MODE_AUTOCAL);
  haptic.go();
  const uint32_t started = millis();
  while ((haptic.readRegister8(DRV2605_REG_GO) & 1) && millis() - started < 2500) delay(10);
  const bool timeout = (haptic.readRegister8(DRV2605_REG_GO) & 1) != 0;
  const uint8_t status = haptic.readRegister8(DRV2605_REG_STATUS);
  calibrated = !timeout && !(status & 0x0B);
  quiet();
  if (calibrated) send(id, "CALIBRATED");
  else error(id, "CALIBRATION_FAILED", timeout ? "Calibration timed out." : (status & 1) ? "Overcurrent. Check actuator wiring." : (status & 2) ? "Overtemperature. Let board cool." : "Calibration failed. Check LRA and wiring.");
}
void handleLine(const char* line) {
  JsonDocument request;
  if (deserializeJson(request, line)) { error(0, "MALFORMED_JSON", "Could not parse JSON line."); return; }
  JsonObjectConst object = request.as<JsonObjectConst>();
  int id = 0, version;
  if (object.isNull() || !integerIn(object["requestId"], 1, INT32_MAX, id)) { error(0, "INVALID_REQUEST", "Request ID required."); return; }
  if (!integerIn(object["protocolVersion"], 1, 1, version)) { error(id, "VERSION_MISMATCH", "Expected protocol version 1."); return; }
  const char* type = object["type"].as<const char*>();
  if (!type) { error(id, "INVALID_REQUEST", "Command type required."); return; }
  if (!strcmp(type, "HELLO")) { send(id, "READY"); return; }
  if (!ready) { error(id, "NO_DRIVER", "DRV2605L unavailable. Check wiring."); return; }
  if (!strcmp(type, "STOP")) { quiet(); playing = false; send(id, "STOPPED"); return; }
  if (playing) { error(id, "BUSY", "Stop playback before loading or calibrating."); return; }
  if (!strcmp(type, "CALIBRATE")) { calibrate(id); return; }
  if (!strcmp(type, "LOAD")) {
    Signature candidate;
    const char* reason = "Invalid signature.";
    if (!parseSignature(object["signature"], candidate, reason)) { error(id, "INVALID_SIGNATURE", reason); return; }
    loaded = candidate; hasLoaded = true; send(id, "LOADED"); return;
  }
  if (!strcmp(type, "PREVIEW")) {
    if (!calibrated) { error(id, "NOT_CALIBRATED", "Calibrate LRA before preview."); return; }
    if (!hasLoaded) { error(id, "NO_SIGNATURE", "Load signature before preview."); return; }
    quiet(); playing = true; startedAt = millis(); nextFaultCheck = startedAt; previewRequestId = id;
    send(id, "PLAYING"); return;
  }
  error(id, "UNKNOWN_COMMAND", "Unsupported command.");
}
void readSerial() {
  uint16_t budget = 256;
  while (Serial.available() && budget--) {
    const char value = char(Serial.read());
    if (value == '\n') {
      if (lineOverflow) error(0, "LINE_TOO_LONG", "JSON line exceeds 8192 bytes.");
      else { lineBuffer[lineLength] = '\0'; if (lineLength) handleLine(lineBuffer); }
      lineLength = 0; lineOverflow = false;
    } else if (value != '\r' && !lineOverflow) {
      if (lineLength < MAX_LINE) lineBuffer[lineLength++] = value;
      else lineOverflow = true;
    }
  }
}
}
void setup() {
  // USB CDC defaults to a 256-byte RX queue. A valid LOAD line can be 8 KB.
  // Size queue before begin() so USB bursts cannot discard JSON bytes.
  Serial.setRxBufferSize(MAX_LINE + 64);
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN, 100000);
  Wire.setTimeOut(50);
  ready = haptic.begin(&Wire);
  if (!ready) return;
  haptic.useLRA();
  haptic.selectLibrary(6);
  haptic.writeRegister8(DRV2605_REG_CONTROL1, DRIVE_TIME);
  haptic.writeRegister8(DRV2605_REG_CONTROL3, 0x80); // Closed loop, signed RTP.
  haptic.writeRegister8(DRV2605_REG_CONTROL4, 0x30);
  haptic.writeRegister8(DRV2605_REG_RATEDV, RATED_VOLTAGE);
  haptic.writeRegister8(DRV2605_REG_CLAMPV, CLAMP_VOLTAGE);
  haptic.setMode(DRV2605_MODE_INTTRIG);
}
void loop() { readSerial(); updatePlayback(); delay(1); }
