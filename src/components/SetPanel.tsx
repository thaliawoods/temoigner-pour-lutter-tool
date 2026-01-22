"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReferenceItem } from "@/lib/types";
import { loadSet, removeFromSet, clearSet, type SetItem } from "@/lib/setStore";

export default function SetPanel({ refs }: { refs: ReferenceItem[] }) {
  const [items, setItems] = useState<SetItem[]>(() => loadSet());

  useEffect(() => {
    const onStorage = () => {
      // décale pour satisfaire la règle ESLint
      queueMicrotask(() => setItems(loadSet()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resolved = useMemo(() => {
    const map = new Map(refs.map((r) => [r.id, r]));
    return items.map((x) => ({ ...x, ref: map.get(x.id) })).filter((x) => x.ref);
  }, [items, refs]);

  return (
    <aside className="rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">set actif</div>
        <button
          className="text-xs underline opacity-70"
          onClick={() => {
            clearSet();
            setItems(loadSet());
          }}
        >
          vider
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {resolved.length === 0 ? (
          <div className="text-sm opacity-70">aucun élément pour l’instant.</div>
        ) : (
          resolved.map((x) => (
            <div key={x.id} className="flex items-start justify-between gap-2 rounded-xl border p-2">
              <div className="text-sm">
                <div className="font-medium">{x.ref!.titre}</div>
                <div className="text-xs opacity-70">{x.ref!.type}</div>
              </div>
              <button
                className="text-xs underline opacity-70"
                onClick={() => {
                  removeFromSet(x.id);
                  setItems(loadSet());
                }}
              >
                retirer
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
