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
  source?: string; 
  url?: string;  
  annee?: number;
  date?: string; 
  langue?: string;
  dureeSec?: number;

  description?: string;
  contexte?: ContextTag[];
  tags?: string[];

  droits?: Rights;
  restrictions?: string[];

  media?: {
    audioSrc?: string; 
    videoSrc?: string;
    imageSrc?: string;
    texte?: string;   
  };

  perf?: {
    modes?: Array<"oneShot" | "loop">;
    intensite?: Intensity;
    notes?: string;
    compatAvec?: string[];   
    eviterAvec?: string[];   
  };
};
