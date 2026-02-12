"use client";

import { useMemo, useState } from "react";
import type { TPLReference, TPLType } from "@/lib/schema";
import ReferenceCard from "@/components/ReferenceCard";

type IntensityOrAll = "all" | "faible" | "moyenne" | "forte"; 

export default function ReferenceList({
  data,
  onAdd
}: {
  data: TPLReference[];
  onAdd: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TPLType | "all">("all");
  const [intensity] = useState<IntensityOrAll>("all"); 

  const parseType = (v: string): TPLType | "all" => {
    if (
      v === "collectif" ||
      v === "film" ||
      v === "jeu_video" ||
      v === "texte" ||
      v === "musique" ||
      v === "oeuvre_picturale" ||
      v === "performance" ||
      v === "podcast" ||
      v === "video"
    )
      return v;
    return "all";
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return data.filter((r) => {
      if (type !== "all" && r.type !== type) return false;

      if (intensity !== "all") {
      }

      if (!needle) return true;

      const hay = [
        r.title,
        r.creator ?? "",
        r.notes ?? "",
        (r.tags || []).join(" "),
        r.location ?? ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [data, q, type, intensity]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="recherche…"
          className="rounded-xl border px-3 py-2 text-sm w-full md:w-80"
        />

        <select
          value={type}
          onChange={(e) => setType(parseType(e.target.value))}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="all">tous</option>
          <option value="collectif">collectifs</option>
          <option value="film">films</option>
          <option value="jeu_video">jeux vidéo</option>
          <option value="texte">textes</option>
          <option value="musique">musique</option>
          <option value="oeuvre_picturale">œuvres picturales</option>
          <option value="performance">performances</option>
          <option value="podcast">podcasts</option>
          <option value="video">vidéos</option>
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.map((r) => (
          <ReferenceCard key={r.id} item={r} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}
