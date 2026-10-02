import { describe, expect, it } from "vitest";
import {
  fileStem,
  parseProjectFile,
  putProject,
  readProjects,
  PROJECTS_KEY,
} from "./projects";
import type { Signature } from "./signature";

const signature: Signature = {
  schemaVersion: 1,
  blocks: [{ id: "click", type: "effect", startMs: 0, effectId: 1 }],
};
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("browser projects", () => {
  it("saves by ID and orders most recent first", () => {
    const storage = memoryStorage();
    putProject(storage, {
      id: "one",
      name: "First",
      signature,
      updatedAt: "2026-10-01T00:00:00Z",
    });
    putProject(storage, {
      id: "two",
      name: "Second",
      signature,
      updatedAt: "2026-10-02T00:00:00Z",
    });
    const updated = putProject(storage, {
      id: "one",
      name: "Renamed",
      signature,
      updatedAt: "2026-10-03T00:00:00Z",
    });
    expect(updated.map((item) => item.name)).toEqual(["Renamed", "Second"]);
    expect(JSON.parse(storage.getItem(PROJECTS_KEY) ?? "[]")).toHaveLength(2);
  });

  it("ignores corrupt entries without discarding valid projects", () => {
    const storage = memoryStorage();
    storage.setItem(
      PROJECTS_KEY,
      JSON.stringify([
        {
          id: "bad",
          name: "Bad",
          signature: { schemaVersion: 4, blocks: [] },
          updatedAt: "2026-10-03",
        },
        { id: "good", name: "Good", signature, updatedAt: "2026-10-02" },
      ]),
    );
    expect(readProjects(storage).map((item) => item.id)).toEqual(["good"]);
  });

  it("validates imported signatures and allows empty draft", () => {
    expect(parseProjectFile(JSON.stringify(signature))).toEqual(signature);
    expect(parseProjectFile('{"schemaVersion":1,"blocks":[]}').blocks).toEqual(
      [],
    );
    expect(() => parseProjectFile('{"schemaVersion":1,"blocks":[{}]}')).toThrow(
      "valid Haptic Studio",
    );
    expect(() => parseProjectFile("broken")).toThrow("valid JSON");
  });

  it("makes safe download names", () => {
    expect(fileStem(" My Pattern / 01 ")).toBe("My-Pattern-01");
  });
});
