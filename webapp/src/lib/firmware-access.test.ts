import { describe, expect, it } from "vitest";
import { FirmwareAccess } from "./firmware-access.svelte";

const expected = "LRA-v2-170Hz-GPIO4-5-R50-C79-D24";
const changed = "LRA-v2-170Hz-GPIO4-5-R83-C141-D24";

describe("hardware firmware access", () => {
  it("allows a matching full identity without acknowledgment", () => {
    const access = new FirmwareAccess();
    expect(access.allowed(expected, expected, "config-a")).toBe(true);
  });
  it("never allows a known mismatch, even if acknowledgment is attempted", () => {
    const access = new FirmwareAccess();
    access.acknowledge(changed, expected, "config-a");
    expect(access.allowed(changed, expected, "config-a")).toBe(false);
    expect(access.status(changed, expected)).toBe("mismatch");
  });
  it.each([null, "LRA-170Hz-GPIO4-5", "unrecognized"])("requires acknowledgment for %s", (reported) => {
    const access = new FirmwareAccess();
    expect(access.allowed(reported, expected, "config-a")).toBe(false);
    access.acknowledge(reported, expected, "config-a");
    expect(access.allowed(reported, expected, "config-a")).toBe(true);
    expect(access.allowed(reported, expected, "config-b")).toBe(false);
    access.reset();
    expect(access.allowed(reported, expected, "config-a")).toBe(false);
  });
  it("requires acknowledgment when current settings cannot establish an expected identity", () => {
    const access = new FirmwareAccess();
    expect(access.allowed(expected, null, "empty")).toBe(false);
    access.acknowledge(expected, null, "empty");
    expect(access.allowed(expected, null, "empty")).toBe(true);
    expect(access.allowed(expected, changed, "new")).toBe(false);
  });
});
