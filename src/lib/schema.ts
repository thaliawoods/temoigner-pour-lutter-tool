export type TPLType =
  | "collectif"
  | "film"
  | "jeu_video"
  | "texte"
  | "musique"
  | "oeuvre_picturale"
  | "performance"
  | "podcast"
  | "video";

export type YearRange = { start: number; end: number };

export type TPLMedia =
  | { kind: "image"; src: string; alt?: string }
  | { kind: "video"; src: string; poster?: string }
  | { kind: "audio"; src: string; title?: string };

export type TPLReference = {
  id: string;
  type: TPLType;
  title: string;
  creator: string | null;
  year: number | null;
  yearRange: YearRange | null;
  location: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  notes: string;
  tags: string[];
  media?: TPLMedia;
};

export type TPLCredits = {
  thanks: string[];
  typographies: string[];
  printedAt: string;
  contact: {
    instagram: string;
    email: string;
  };
};

export type TPLSchema = {
  schemaVersion: string;
  project: string;
  generatedAt: string;
  types: TPLType[];
  references: TPLReference[];
  credits?: TPLCredits;
  meta?: { notes?: string[] };
};
