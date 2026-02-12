import type { TPLMedia } from "@/lib/schema";

/**
 * IMPORTANT
 * - Les strings sont les chemins EXACTS dans Supabase Storage
 * - Exemple: "audio/STUPID(E).mp3" = dossier "audio" + fichier "STUPID(E).mp3"
 * - On met 1 média principal par ref (ton UI affiche un seul MediaBlock).
 */
export const MEDIA_BY_REF_ID: Record<string, TPLMedia> = {
  // 🎵 musique
  "musique-yseult-stupid-e-2024": { kind: "audio", src: "audio/STUPID(E).mp3" },
  "musique-les-vaginistes-ta-gueule-2023": { kind: "audio", src: "audio/Ta Gueule.mp3" },

  // 🎬 films / trailers
  "film-the-sun-ladies-2017": { kind: "video", src: "video/The Sun Ladies Trailer.mp4" },
  "film-allison-swank-scum-boy-2021": { kind: "video", src: "video/Scum Boy by Allison Swank 43 Short Films.mp4" },
  "film-deep-and-cheap-media-suspendue-2023": { kind: "video", src: "video/SUSPENDUE - TEASER.mp4" },

  // 🎥 Tabita Rezaire
  "film-tabita-rezaire-deep-down-tidal-2017": { kind: "video", src: "video/TabitaRezaire_DEEPDOWNTIDAL_2017.mp4" },
  "video-tabita-rezaire-peaceful-warrior-2017": { kind: "video", src: "video/Tabita Rezaire peaceful warrior .mp4" },
  "video-tabita-rezaire-premium-connect-2016": { kind: "video", src: "video/Tabita Rezaire Prenium Conect .mp4" },
  "video-tabita-rezaire-ultra-wet-recapitulation-2016": { kind: "video", src: "video/tabita Rezaire ultra wet recapitulation.mp4" },

  // 🎥 Yosra / Plastisapiens / Witchpdx
  "video-yosra-mojtahedi-sexus-florus-2023": { kind: "video", src: "video/Yosra Mojtahedi sexus florus.mp4" },
  "jeu-jorisch-edith-chekhanovich-miri-plastisapiens-2022": { kind: "video", src: "video/plastisapiens 2.mp4" },
  "collectif-witchpdx": { kind: "video", src: "video/witchpdx_video_.mp4" },

  // 📻 podcasts (audio rippé)
  "podcast-victoire-tuaillon-des-villes-viriles-2018": { kind: "audio", src: "audio/villesviriles.mp3" },
  "video-francoise-verges-frustration-magazine-2024": { kind: "audio", src: "audio/verges.mp3" },

  // 🖼️ textes / images
  "texte-laboria-cuboniks-manifeste-xenofeministe-2019": { kind: "image", src: "image/xenofeminisme.jpg" },
  "texte-feminist-fighting-transphobia-declaration-pour-un-feminisme-et-un-womanisme-trans-inclusif-2015": { kind: "image", src: "image/TRANSPHOBIA.png" }
};
