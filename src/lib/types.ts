export type ReferenceType = "audio" | "texte" | "image" | "video";

export type Rights =
  | "libre"
  | "autorisation_obtenue"
  | "extrait_uniquement"
  | "consultation_privee"
  | "performance_uniquement";

export type Intensity = "faible" | "moyenne" | "forte";

export type ContextTag = "public" | "numerique" | "mediatic" | "institutionnel";

export type ReferenceItem = {
  id: string;
  titre: string;
  type: ReferenceType;

  auteur?: string;
  source?: string; // nom de la source
  url?: string;    // lien externe (optionnel)
  annee?: number;
  date?: string;   // ISO "YYYY-MM-DD" si besoin
  langue?: string;
  dureeSec?: number;

  description?: string;
  contexte?: ContextTag[];
  tags?: string[];

  droits?: Rights;
  restrictions?: string[];

  // médias locaux (recommandé pour perf)
  media?: {
    audioSrc?: string; // ex: "/media/audio/xxx.mp3"
    videoSrc?: string;
    imageSrc?: string;
    texte?: string;    // pour citations/lectures
  };

  perf?: {
    modes?: Array<"oneShot" | "loop">;
    intensite?: Intensity;
    notes?: string;
    compatAvec?: string[];   // ids
    eviterAvec?: string[];   // ids
  };
};
