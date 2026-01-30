// src/app/collective/page.tsx
import Link from "next/link";

const TIMELINE_2025 = [
  {
    date: "Mars 2025",
    label:
      "Représentation à l’ESADSE lors du séminaire sur les actes politiques autour du numérique (association Process)",
  },
  {
    date: "Avril / Mai 2025",
    label: "Résidence de recherche et création (2 semaines), Aléatronome, Saint-Étienne",
  },
  {
    date: "Juillet 2025",
    label: "Représentation au festival Picardiscount, Richecourt",
  },
  {
    date: "Juillet 2025",
    label: "Résidence de recherche et création (2 semaines), DROP, Saint-Étienne",
  },
  {
    date: "Octobre / Novembre 2025",
    label:
      "Résidence de recherche et création Sonarea (2 semaines), AADN & GRAME CNCM, Villeurbanne",
  },
  {
    date: "Novembre 2025",
    label: "Représentation au festival Desmadre, Paris",
  },
];

export default function CollectivePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          collective
        </div>

        <h1 className="mt-3 text-3xl font-semibold">Ely &amp; Marion Collective</h1>

        <div className="mt-8 grid gap-10 md:grid-cols-3">
          {/* LEFT (main text) */}
          <div className="md:col-span-2 space-y-8 text-[15px] leading-relaxed text-zinc-800">
            <p>
              Le duo <span className="font-medium">Ely &amp; Marion</span> est né
              avec l’intention de créer un outil de diffusion des luttes
              féministes. La collective est composée de deux jeunes artistes,
              <span className="font-medium"> Elyette Gauthier</span> et{" "}
              <span className="font-medium">Marion Serclérat</span>, récemment
              diplômées du DNSEP Art contemporain – Design contemporain,
              mention Espace, à l’École d’Art et de Design de Saint-Étienne.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-zinc-200 p-4">
                <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                  Elyette Gauthier
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-800">
                  Artiste pluridisciplinaire (sculpture, graphisme, édition,
                  estampe, performance, son). Elle explore la création sonore
                  via le montage live d’échantillons, l’enregistrement audio et
                  le mix, avec l’objectif de concevoir des espaces inclusifs au
                  sein d’environnements immersifs. Son travail interroge aussi
                  la représentation des corps sexisés dans l’espace public et
                  les dynamiques de domination / appropriation des lieux.
                </p>
              </div>

              <div className="border border-zinc-200 p-4">
                <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                  Marion Serclérat
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-800">
                  Professeure et artiste numérique. Sa recherche porte sur les
                  communautés en ligne, notamment la manosphère, qu’elle analyse
                  avec un regard critique cyberféministe. Elle crée des objets
                  numériques (jeux vidéo, courts métrages) et développe aussi
                  des formes dans l’espace physique via l’édition et l’affiche.
                </p>
              </div>
            </div>

            <div className="border border-zinc-200 p-4">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                Témoigner pour lutter
              </div>

              <p className="mt-3 text-[14px] leading-relaxed text-zinc-800">
                <span className="font-medium">Performance live audiovisuelle</span>{" "}
                composée en duo — Marion à l’image, Elyette au son. Une tentative
                de subvertir des espaces saturés par la violence et les codes
                patriarcaux, en les envahissant avec des codes et références
                féministes, et de créer des liens entre l’espace public de la
                ville et celui du numérique (violences patriarcales, coloniales,
                capitalistes).
              </p>

              <p className="mt-3 text-[14px] leading-relaxed text-zinc-800">
                Le dispositif met en relation une bibliothèque de références : extraits
                sonores (podcasts, musique, lectures performées) et bibliothèque
                visuelle (image textuelle, photographie, extraits vidéo / films),
                joués en simultané et en direct. La performance est aussi pensée
                comme un processus de diffusion et un outil de dialogue.
              </p>

              <p className="mt-3 text-[14px] leading-relaxed text-zinc-800">
                L’intégralité de la bibliothèque rassemblée est matérialisée par
                une affiche (crédits) généralement partagée au public, pour que
                les sources puissent être découvertes, gardées et archivées à
                leur tour.
              </p>

              <div className="mt-4 text-sm text-zinc-700">
                <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                  navigation
                </span>{" "}
                —{" "}
                <Link className="underline" href="/archives">
                  Archives
                </Link>{" "}
                pour explorer la bibliothèque ·{" "}
                <Link className="underline" href="/live">
                  Live
                </Link>{" "}
                pour activer en performance.
              </div>
            </div>
          </div>

          {/* RIGHT (contacts + timeline) */}
          <aside className="space-y-8">
            <div className="border border-zinc-200 p-4">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                contact
              </div>

              <div className="mt-3 space-y-2 text-sm text-zinc-800">
                <div>
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    email
                  </span>
                  <div className="mt-1">
                    <a
                      className="underline"
                      href="mailto:elymarioncollective@gmail.com"
                    >
                      elymarioncollective@gmail.com
                    </a>
                  </div>
                </div>

                <div>
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    instagram
                  </span>
                  <div className="mt-1">
                    <a
                      className="underline"
                      href="https://www.instagram.com/ely.marion.collective/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      @ely.marion.collective
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    phones
                  </span>
                  <div className="mt-1">Ely : 06 32 33 71 02</div>
                  <div>Marion : 06 27 62 41 43</div>
                </div>
              </div>
            </div>

            <div className="border border-zinc-200 p-4">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                2025
              </div>

              <ul className="mt-3 space-y-3 text-sm text-zinc-800">
                {TIMELINE_2025.map((it) => (
                  <li key={it.date} className="border-b border-zinc-100 pb-3">
                    <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                      {it.date}
                    </div>
                    <div className="mt-1 leading-relaxed">{it.label}</div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
