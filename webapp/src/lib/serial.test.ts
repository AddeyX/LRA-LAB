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
  let immediateDone = false;
  let holdLoad = false;
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
        if (request.type === "LOAD" && !holdLoad) reply({ requestId: request.requestId, type: "LOADED" });
        if (request.type === "PREVIEW") reply({ requestId: request.requestId, type: "PLAYING" });
        if (request.type === "PREVIEW" && immediateDone) reply({ requestId: request.requestId, type: "DONE" });
        if (request.type === "STOP") reply({ requestId: request.requestId, type: "STOPPED" });
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
    set immediateDone(value: boolean) { immediateDone = value; },
    set holdLoad(value: boolean) { holdLoad = value; },
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


describe("test playback completion", () => {
  it("waits for matching DONE rather than PLAYING or another request's DONE", async () => {
    const board = mockBoard();
    const serial = new StudioSerial();
    await serial.connect();
    let result: boolean | undefined;
    let started = false;
    const play = serial.play(signature, { waitForDone: true, onPlaying: () => { started = true; } })
      .then(value => { result = value; return value; });
    await vi.waitFor(() => expect(board.sent.some(q => q.type === "PREVIEW")).toBe(true));
    const id = board.sent.find(q => q.type === "PREVIEW")!.requestId;
    try {
      expect(started).toBe(true);
      expect(result).toBeUndefined();
      board.reply({ requestId: id + 1, type: "DONE" });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(result).toBeUndefined();
      board.reply({ requestId: id, type: "DONE" });
      expect(await play).toBe(true);
    } finally { await serial.disconnect(); }
  });

  it.each(["stop", "fault", "disconnect"])("does not mark success after %s", async (ending) => {
    const board = mockBoard();
    const serial = new StudioSerial();
    await serial.connect();
    const play = serial.play(signature, { waitForDone: true });
    await vi.waitFor(() => expect(board.sent.some(q => q.type === "PREVIEW")).toBe(true));
    const id = board.sent.find(q => q.type === "PREVIEW")!.requestId;
    if (ending === "stop") await serial.stop();
    else if (ending === "fault") board.reply({ requestId: id, type: "ERROR", message: "Playback fault" });
    else await serial.disconnect();
    try { expect(await play).toBe(false); }
    finally { await serial.disconnect(); }
  });
});


it("does not miss DONE delivered immediately after PLAYING", async () => {
  const board = mockBoard();
  board.immediateDone = true;
  const serial = new StudioSerial();
  await serial.connect();
  try { expect(await serial.play(signature, { waitForDone: true })).toBe(true); }
  finally { await serial.disconnect(); }
});

it("times out completion instead of hanging when DONE is missing", async () => {
  vi.useFakeTimers();
  const board = mockBoard();
  const serial = new StudioSerial();
  await serial.connect();
  const play = serial.play(signature, { waitForDone: true });
  await vi.advanceTimersByTimeAsync(0);
  expect(board.sent.some(q => q.type === "PREVIEW")).toBe(true);
  await vi.advanceTimersByTimeAsync(5000);
  try { expect(await play).toBe(false); }
  finally { await serial.disconnect(); }
});

it("does not send PREVIEW when stopped while LOAD is outstanding", async () => {
  const board = mockBoard();
  board.holdLoad = true;
  const serial = new StudioSerial();
  await serial.connect();
  const play = serial.play(signature, { waitForDone: true });
  await vi.waitFor(() => expect(board.sent.some(q => q.type === "LOAD")).toBe(true));
  await serial.stop();
  board.reply({ requestId: board.sent.find(q => q.type === "LOAD")!.requestId, type: "LOADED" });
  try {
    expect(await play).toBe(false);
    expect(board.sent.map(q => q.type)).toEqual(["HELLO", "LOAD", "STOP"]);
  } finally { await serial.disconnect(); }
});
