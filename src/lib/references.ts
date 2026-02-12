import data from "@/data/references.v0.json";
import type { TPLSchema, TPLReference } from "@/lib/schema";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSchema(v: unknown): v is TPLSchema {
  if (!isObject(v)) return false;

  const refs = v["references"];
  const project = v["project"];

  return Array.isArray(refs) && typeof project === "string";
}

export function getSchema(): TPLSchema {
  const raw: unknown = data;

  if (!isSchema(raw)) {
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
  const refs = getAllReferences();

  const decoded = safeDecode(id);

  const direct = refs.find((r) => r.id === decoded);
  if (direct) return direct;

  const norm = normalizeId(decoded);
  return refs.find((r) => normalizeId(r.id) === norm);
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeId(v: string) {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[’']/g, "-") 
    .replace(/[^a-z0-9-]/g, "-") 
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
