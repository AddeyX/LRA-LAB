import { CATALOG_VERSION, PROTOCOL_VERSION, durationOf, type Signature } from "./signature";

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};
type SerialApi = { requestPort(): Promise<SerialPortLike> };
export type DeviceMessage = {
  protocolVersion: number;
  requestId: number;
  type: string;
  [key: string]: unknown;
};
export class StudioSerial {
  port: SerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private requestId = 0;
  private previewPending = false;
  private playbackGeneration = 0;
  private completion: {
    requestId: number;
    started: boolean;
    resolve: (success: boolean) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private pending = new Map<
    number,
    {
      resolve: (value: DeviceMessage) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  onMessage: (message: DeviceMessage) => void = () => {};
  onDisconnect: (reason: string) => void = () => {};
  static supported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }
  async connect(): Promise<DeviceMessage> {
    if (!StudioSerial.supported())
      throw new Error("Web Serial needs desktop Chrome or Edge on HTTPS or localhost.");
    try {
      this.port = await (
        navigator as Navigator & { serial: SerialApi }
      ).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      if (!this.port.writable || !this.port.readable)
        throw new Error("Serial port unavailable.");
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      void this.readLoop();
      const ready = await this.request("HELLO", {}, 3000);
      if (
        ready.type !== "READY" ||
        ready.protocolVersion !== PROTOCOL_VERSION ||
        ready.catalogVersion !== CATALOG_VERSION
      ) {
        throw new Error(
          "Firmware protocol or effect catalog mismatch. Flash matching firmware.",
        );
      }
      if (ready.ready !== true) {
        throw new Error("DRV2605L unavailable. Check SDA/SCL wiring and power.");
      }
      return ready;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }
  async request(
    type: string,
    data: Record<string, unknown> = {},
    timeoutMs = 4000,
  ): Promise<DeviceMessage> {
    if (!this.writer) throw new Error("Connect board first.");
    const requestId = ++this.requestId;
    const response = new Promise<DeviceMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`${type} timed out. Check board connection.`));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
    });
    try {
      void this.writer.write(
        new TextEncoder().encode(
          JSON.stringify({
            protocolVersion: PROTOCOL_VERSION,
            requestId,
            type,
            ...data,
          }) + "\n",
        ),
      ).catch((error) => this.rejectPending(
        error instanceof Error ? error.message : "Serial write failed.",
      ));
    } catch (error) {
      this.rejectPending(
        error instanceof Error ? error.message : "Serial write failed.",
      );
    }
    return response;
  }
  async load(signature: Signature) {
    return this.request("LOAD", { signature }, 5000);
  }
  async preview() {
    return this.request("PREVIEW");
  }
  async play(
    signature: Signature,
    options: { waitForDone?: boolean; onPlaying?: () => void } = {},
  ): Promise<boolean> {
    if (this.previewPending) return false;
    this.previewPending = true;
    const generation = ++this.playbackGeneration;
    try {
      await this.load(signature);
      if (generation !== this.playbackGeneration) return false;
      // Subscribe before PREVIEW: PLAYING and DONE can arrive in one read.
      const finished = options.waitForDone ? new Promise<boolean>((resolve) => {
        this.completion = {
          requestId: this.requestId + 1,
          started: false,
          resolve,
          timer: setTimeout(() => this.finishCompletion(false), durationOf(signature) + 4000),
        };
      }) : null;
      await this.preview();
      if (generation !== this.playbackGeneration) return false;
      options.onPlaying?.();
      return finished ? await finished : true;
    } finally {
      this.finishCompletion(false);
      this.previewPending = false;
    }
  }
  private finishCompletion(success: boolean) {
    const completion = this.completion;
    this.completion = null;
    if (completion) {
      clearTimeout(completion.timer);
      completion.resolve(success);
    }
  }
  private cancelPlayback() {
    this.playbackGeneration++;
    this.finishCompletion(false);
  }
  async stop() {
    this.cancelPlayback();
    return this.request("STOP");
  }
  async calibrate() {
    return this.request("CALIBRATE", {}, 5000);
  }
  async disconnect() {
    const reader = this.reader,
      writer = this.writer,
      port = this.port;
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.rejectPending("Board disconnected.");
    try {
      await reader?.cancel();
    } catch {
      /* port already gone */
    }
    try {
      reader?.releaseLock();
    } catch {
      /* read loop may own lock */
    }
    try {
      writer?.releaseLock();
    } catch {
      /* port already gone */
    }
    try {
      await port?.close();
    } catch {
      /* port already gone */
    }
  }
  private rejectPending(reason: string) {
    this.cancelPlayback();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }
  private async readLoop() {
    const reader = this.reader;
    const port = this.port;
    let buffer = "";
    try {
      while (reader && this.reader === reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value, { stream: true });
        if (buffer.length > 16384)
          throw new Error("Device response too large.");
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          let message: DeviceMessage;
          try {
            message = JSON.parse(line);
          } catch {
            continue;
          }
          if (message.protocolVersion !== PROTOCOL_VERSION) continue;
          const completion = this.completion;
          if (completion?.requestId === message.requestId) {
            if (message.type === "PLAYING") completion.started = true;
            if (message.type === "DONE" && completion.started) this.finishCompletion(true);
            if (message.type === "ERROR") this.finishCompletion(false);
          }
          if (message.type === "STOPPED") this.cancelPlayback();
          this.onMessage(message);
          const pending = this.pending.get(message.requestId);
          if (
            pending &&
            message.type !== "PLAYING" &&
            message.type !== "DONE"
          ) {
            clearTimeout(pending.timer);
            this.pending.delete(message.requestId);
            if (message.type === "ERROR")
              pending.reject(
                new Error(
                  String(
                    message.message ||
                      message.code ||
                      "Board rejected request.",
                  ),
                ),
              );
            else pending.resolve(message);
          } else if (pending && message.type === "PLAYING") {
            clearTimeout(pending.timer);
            this.pending.delete(message.requestId);
            pending.resolve(message);
          }
        }
      }
    } catch (error) {
      if (this.reader === reader)
        this.onDisconnect(
          error instanceof Error ? error.message : "Serial connection lost.",
        );
    } finally {
      if (this.reader === reader) {
        this.rejectPending("Board disconnected.");
        this.reader = null;
        this.port = null;
        try {
          reader?.releaseLock();
        } catch {
          /* port gone */
        }
        try {
          this.writer?.releaseLock();
        } catch {
          /* port gone */
        }
        this.writer = null;
        try {
          await port?.close();
        } catch {
          /* port gone */
        }
        this.onDisconnect("Board disconnected.");
      }
    }
  }
}
