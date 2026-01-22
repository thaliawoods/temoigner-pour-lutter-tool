import type { ReferenceItem } from "@/lib/types";

const KEY = "tpl_set_v1";

export type SetItem = {
  id: string;
  addedAt: number;
};

export function loadSet(): SetItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SetItem[]) : [];
  } catch {
    return [];
  }
}

export function saveSet(items: SetItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToSet(id: string) {
  const current = loadSet();
  if (current.some((x) => x.id === id)) return current;
  const next = [...current, { id, addedAt: Date.now() }];
  saveSet(next);
  return next;
}

export function removeFromSet(id: string) {
  const next = loadSet().filter((x) => x.id !== id);
  saveSet(next);
  return next;
}

export function clearSet() {
  saveSet([]);
}
