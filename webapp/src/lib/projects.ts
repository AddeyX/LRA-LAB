import { validateSignature, type Signature } from "./signature";

export const PROJECTS_KEY = "lra-studio-projects-v1";

export type SavedProject = {
  id: string;
  name: string;
  signature: Signature;
  updatedAt: string;
};

export function validProjectSignature(value: unknown): value is Signature {
  if (validateSignature(value) === null) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Signature>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.blocks) &&
    candidate.blocks.length === 0
  );
}

export function readProjects(
  storage: Pick<Storage, "getItem">,
): SavedProject[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(PROJECTS_KEY) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item): item is SavedProject =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        !!item.id &&
        typeof item.name === "string" &&
        !!item.name.trim() &&
        typeof item.updatedAt === "string" &&
        validProjectSignature(item.signature),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function putProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  project: SavedProject,
): SavedProject[] {
  if (!validProjectSignature(project.signature))
    throw new Error("Project signature is invalid.");
  const projects = readProjects(storage).filter(
    (item) => item.id !== project.id,
  );
  projects.unshift(project);
  storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects;
}

export function parseProjectFile(raw: string): Signature {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (!validProjectSignature(value))
    throw new Error("File is not a valid Haptic Studio signature.");
  return value;
}

export function fileStem(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "haptic-signature"
  );
}
