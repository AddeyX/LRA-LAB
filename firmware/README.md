# ESP32-C3 Haptic Studio firmware

Build: `~/.platformio/penv/bin/pio run` from this directory. Upload: `~/.platformio/penv/bin/pio run --target upload` after choosing your board port. Uses 115200 baud USB CDC, GPIO4 SDA, GPIO5 SCL, DRV2605L library 6, 170 Hz LRA profile. Check actuator voltage rating before upload: rated register `0x32`, clamp `0x4F`.

Protocol and app instructions: [webapp README](../webapp/README.md). Firmware validates whole signatures before replacing loaded RAM state. Playback uses 10 ms RTP samples and stops at 5000 ms even if USB disconnects. Calibration must pass before preview. Hardware behavior still needs bench verification after flashing.
