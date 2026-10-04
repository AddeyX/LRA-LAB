import { afterEach, describe, expect, it, vi } from "vitest";
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


function mockBoard() {
  let incoming: ReadableStreamDefaultController<Uint8Array>;
  let opened = false;
  const sent: { type: string; requestId: number }[] = [];
  let hello: "silent" | "ready" | "error" = "ready";
  let failWrite = false;
  const reply = (message: Record<string, unknown>) => incoming.enqueue(
    new TextEncoder().encode(JSON.stringify({ protocolVersion: 1, ...message }) + "\n"),
  );
  const port = {
    readable: null as ReadableStream<Uint8Array> | null,
    writable: null as WritableStream<Uint8Array> | null,
    async open() {
      if (opened) throw new Error("Port already open");
      opened = true;
      this.readable = new ReadableStream({ start(controller) { incoming = controller; } });
      this.writable = new WritableStream({ write(bytes) {
        if (failWrite) throw new Error("USB write failed");
        const request = JSON.parse(new TextDecoder().decode(bytes));
        sent.push(request);
        if (request.type === "HELLO" && hello !== "silent") reply(hello === "error"
          ? { requestId: request.requestId, type: "ERROR", message: "Handshake rejected" }
          : { requestId: request.requestId, type: "READY", catalogVersion: 1, ready: true, calibrated: true });
      } });
    },
    async close() { opened = false; },
  };
  vi.stubGlobal("navigator", { serial: { requestPort: async () => port } });
  return { port, reply, sent, get opened() { return opened; },
    set hello(value: typeof hello) { hello = value; },
    set failWrite(value: boolean) { failWrite = value; } };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("failed connection cleanup", () => {
  it.each(["silent", "error"] as const)("closes and unlocks the port after %s HELLO and permits retry", async (hello) => {
    vi.useFakeTimers();
    const board = mockBoard();
    board.hello = hello;
    const serial = new StudioSerial();
    const result = serial.connect().catch(error => error);
    if (hello === "silent") await vi.advanceTimersByTimeAsync(3001);
    expect(await result).toBeInstanceOf(Error);
    try {
      expect(board.opened).toBe(false);
      expect(board.port.readable!.locked).toBe(false);
      expect(board.port.writable!.locked).toBe(false);
      expect(serial.port).toBeNull();
      board.hello = "ready";
      expect((await serial.connect()).type).toBe("READY");
    } finally { await serial.disconnect(); }
  });
  it("closes partially initialized ports", async () => {
    const board = mockBoard();
    const open = board.port.open.bind(board.port);
    board.port.open = async () => { await open(); board.port.readable = null; };
    const serial = new StudioSerial();
    await expect(serial.connect()).rejects.toThrow("Serial port unavailable");
    try { expect(board.opened).toBe(false); }
    finally { await serial.disconnect(); }
  });
  it("rejects a failed write without an orphaned response rejection", async () => {
    const board = mockBoard();
    board.failWrite = true;
    const serial = new StudioSerial();
    await expect(serial.connect()).rejects.toThrow("USB write failed");
    try { expect(board.opened).toBe(false); }
    finally { await serial.disconnect(); }
  });
});
