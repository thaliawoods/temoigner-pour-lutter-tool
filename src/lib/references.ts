import data from "@/data/references.v0.json";
import type { TPLSchema, TPLReference } from "@/lib/schema";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSchema(v: unknown): v is TPLSchema {
  if (!isObject(v)) return false;
  return Array.isArray(v.references) && typeof v.project === "string";
}

export function getSchema(): TPLSchema {
  const raw: unknown = data;
  if (!isSchema(raw)) {
    // fallback safe (évite crash)
    return {
      schemaVersion: "0.0",
      project: "unknown",
      generatedAt: new Date().toISOString(),
      types: [],
      references: [],
    };
  }
  return raw;
}

export function getAllReferences(): TPLReference[] {
  return getSchema().references;
}

export function getReferenceById(id: string): TPLReference | undefined {
  return getAllReferences().find((r) => r.id === id);
}
