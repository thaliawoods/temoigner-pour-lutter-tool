"use client";

import React from "react";
import Link from "next/link";

function SectionDivider() {
  return <div className="border-t border-dashed border-black/20 mx-auto w-full max-w-[860px] px-6" />;
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-14">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-3">
          <div className="mono text-[11px] uppercase tracking-[0.22em] pt-1">
            {label}
          </div>
        </div>
        <div className="col-span-12 md:col-span-9">{children}</div>
      </div>
    </div>
  );
}

export default function CollectivePage() {
  return (
    <main className="w-full pb-24">
      {/* ——— Hero ——— */}
      <div className="mx-auto w-full max-w-[860px] px-6 pt-16 pb-14">
        <div className="mono text-[11px] uppercase tracking-[0.22em] mb-6">
          collective
        </div>

        <h1 className="gertrude text-[36px] sm:text-[52px] md:text-[72px] leading-[1.05] tracking-[-0.01em] text-black mb-10">
          Ely &amp; Marion
          <br />
          Collective
        </h1>

        <p className="gertrude text-[16px] sm:text-[19px] md:text-[21px] leading-[1.6] text-black/80 max-w-[52ch]">
          Le duo Ely &amp; Marion est né avec l'intention de créer un outil
          de diffusion des luttes féministes. La collective est composée de
          deux jeunes artistes, Elyette Gauthier et Marion Serclérat,
          récemment diplômées du DNSEP Art contemporain — Design contemporain,
          mention Espace, à l'École d'Art et de Design de Saint-Étienne.
        </p>
      </div>

      <SectionDivider />

      {/* ——— À propos ——— */}
      <Section label="à propos">
        <p className="gertrude text-[17px] leading-[1.7] text-black/80">
          Créer un outil de diffusion des luttes féministes — voilà la mission
          que se donne la collective. Composée d'Elyette Gauthier et Marion
          Serclérat, toutes deux diplômées du DNSEP Art contemporain — Design
          contemporain, mention Espace (ESADSE).
        </p>
      </Section>

      <SectionDivider />

      {/* ——— Artistes ——— */}
      <Section label="artistes">
        <div className="space-y-10">
          <div>
            <div className="gertrude text-[22px] leading-snug text-black mb-3">
              Elyette Gauthier
            </div>
            <p className="gertrude text-[17px] leading-[1.7] text-black/75">
              Artiste pluridisciplinaire (sculpture, graphisme, édition,
              estampe, performance, son). Elle explore la création sonore via le
              montage live d'échantillons, l'enregistrement audio et le mix,
              avec l'objectif de concevoir des espaces inclusifs au sein
              d'environnements immersifs. Son travail interroge aussi la
              représentation des corps sexisés dans l'espace public et les
              dynamiques de domination / appropriation des lieux.
            </p>
          </div>

          <div className="border-t border-dashed border-black/15 pt-10">
            <div className="gertrude text-[22px] leading-snug text-black mb-3">
              Marion Serclérat
            </div>
            <p className="gertrude text-[17px] leading-[1.7] text-black/75">
              Professeure et artiste numérique. Sa recherche porte sur les
              communautés en ligne, notamment la manosphère, qu'elle analyse
              avec un regard critique cyberféministe. Elle crée des objets
              numériques (jeux vidéo, courts métrages) et développe aussi des
              formes dans l'espace physique via l'édition et l'affiche.
            </p>
          </div>
        </div>
      </Section>

      <SectionDivider />

      {/* ——— Témoigner pour lutter ——— */}
      <Section label="témoigner pour lutter">
        <div className="space-y-6">
          <p className="gertrude text-[17px] leading-[1.7] text-black/80">
            Performance live audiovisuelle composée en duo — Marion à l'image,
            Elyette au son. Une tentative de subvertir des espaces saturés par
            la violence et les codes patriarcaux, en les envahissant avec des
            codes et références féministes, et de créer des liens entre
            l'espace public de la ville et celui du numérique (violences
            patriarcales, coloniales, capitalistes).
          </p>

          <p className="gertrude text-[17px] leading-[1.7] text-black/80">
            Le dispositif met en relation une bibliothèque de références :
            extraits sonores (podcasts, musique, lectures performées) et
            bibliothèque visuelle (image textuelle, photographie, extraits vidéo
            / films), joués en simultané et en direct. La performance est aussi
            pensée comme un processus de diffusion et un outil de dialogue.
          </p>

          <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2">
            {[
              { href: "/archives", label: "Archives" },
              { href: "/performances", label: "Performances" },
              { href: "/diy", label: "Do It Yourself" },
              { href: "/creations", label: "Vos Créations" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="mono text-[11px] uppercase tracking-[0.22em] text-black/50 border-b border-dashed border-black/30 pb-0.5 hover:text-black hover:border-black transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </Section>

      <SectionDivider />

      {/* ——— Agenda 2025 ——— */}
      <Section label="2025">
        <div className="space-y-0">
          {[
            {
              date: "Novembre 2025",
              event: "Représentation au festival Desmadre, Paris",
            },
            {
              date: "Octobre / Novembre 2025",
              event:
                "Résidence de recherche et création Sonarea (2 semaines), AADN & GRAME CNCM, Villeurbanne",
            },
            {
              date: "Juillet 2025",
              event:
                "Résidence de recherche et création (2 semaines), DROP, Saint-Étienne",
            },
            {
              date: "Juillet 2025",
              event:
                "Représentation au festival Picardiscount, Richecourt",
            },
            {
              date: "Avril / Mai 2025",
              event:
                "Résidence de recherche et création (2 semaines), Aléatronome, Saint-Étienne",
            },
            {
              date: "Mars 2025",
              event:
                "Représentation à l'ESADSE lors du séminaire sur les actes politiques autour du numérique (association Process)",
            },
          ].map(({ date, event }, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 py-5 border-b border-dashed border-black/15 last:border-b-0"
            >
              <div className="col-span-12 md:col-span-4">
                <div className="mono text-[11px] uppercase tracking-[0.18em] text-black/45">
                  {date}
                </div>
              </div>
              <div className="col-span-12 md:col-span-8">
                <div className="gertrude text-[16px] leading-[1.6] text-black/80">
                  {event}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <SectionDivider />

      {/* ——— Contact ——— */}
      <Section label="contact">
        <div className="space-y-0">
          {[
            {
              label: "email",
              content: (
                <a
                  href="mailto:elymarioncollective@gmail.com"
                  className="gertrude text-[17px] text-black/80 border-b border-dashed border-black/30 hover:text-black hover:border-black transition-colors"
                >
                  elymarioncollective@gmail.com
                </a>
              ),
            },
            {
              label: "instagram",
              content: (
                <a
                  href="https://instagram.com/ely.marion.collective"
                  target="_blank"
                  rel="noreferrer"
                  className="gertrude text-[17px] text-black/80 border-b border-dashed border-black/30 hover:text-black hover:border-black transition-colors"
                >
                  @ely.marion.collective
                </a>
              ),
            },
            {
              label: "téléphone",
              content: (
                <div className="gertrude text-[17px] leading-[1.8] text-black/80">
                  Ely : 06 32 33 71 02
                  <br />
                  Marion : 06 27 62 41 43
                </div>
              ),
            },
          ].map(({ label, content }, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 py-5 border-b border-dashed border-black/15 last:border-b-0"
            >
              <div className="col-span-12 md:col-span-3">
                <div className="mono text-[11px] uppercase tracking-[0.18em] pt-1">
                  {label}
                </div>
              </div>
              <div className="col-span-12 md:col-span-9">{content}</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
