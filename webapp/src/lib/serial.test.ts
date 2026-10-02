import { describe, expect, it } from "vitest";
import { StudioSerial } from "./serial";
import type { Signature } from "./signature";

const signature: Signature = {
  schemaVersion: 1,
  blocks: [{ id: "click", type: "effect", startMs: 0, effectId: 1 }],
};

describe("preview transaction", () => {
  it("sends one LOAD and PREVIEW when invoked twice before first LOAD completes", async () => {
    const serial = new StudioSerial();
    const sent: string[] = [];
    let releaseLoad: (() => void) | undefined;
    const holdLoad = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    serial.load = async () => {
      sent.push("LOAD");
      await holdLoad;
      return { protocolVersion: 1, requestId: 1, type: "LOADED" };
    };
    serial.preview = async () => {
      sent.push("PREVIEW");
      return { protocolVersion: 1, requestId: 2, type: "PLAYING" };
    };

    const first = serial.play(signature);
    const second = serial.play(signature);
    expect(await second).toBe(false);
    releaseLoad?.();
    expect(await first).toBe(true);
    expect(sent).toEqual(["LOAD", "PREVIEW"]);
  });
});
