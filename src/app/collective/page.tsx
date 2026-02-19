"use client";

import React from "react";
import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-8">
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 md:col-span-3">
            <div className="mono text-[13px] md:text-[15px] uppercase tracking-[0.28em] text-black/70">
              {title}
            </div>
          </div>

          <div className="col-span-12 md:col-span-9">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 gap-6 py-3">
      <div className="col-span-12 md:col-span-3">
        <div className="mono text-[11px] uppercase tracking-widest text-black/55">
          {label}
        </div>
      </div>
      <div className="col-span-12 md:col-span-9">
        <div className="text-[14px] leading-6 text-black/90">{children}</div>
      </div>
    </div>
  );
}

/**
 * CONTACT en haut à droite, mais plus bas (centré verticalement)
 * + contenu au milieu (pas collé en haut)
 */
function ContactBlock() {
  return (
    <div className="w-full md:max-w-[420px]">
      <div className="border-t border-black/10 divide-y divide-black/10">
        {/* padding vertical plus grand pour descendre le bloc */}
        <div className="grid grid-cols-12 gap-6 py-10">
          <div className="col-span-12 md:col-span-4 flex items-center">
            <div className="mono text-[13px] md:text-[15px] uppercase tracking-[0.28em] text-black/70">
              contact
            </div>
          </div>

          {/* on centre le contenu verticalement aussi */}
          <div className="col-span-12 md:col-span-8 flex items-center">
            <div className="w-full divide-y divide-black/10">
              <div className="grid grid-cols-12 gap-6 py-3">
                <div className="col-span-12 md:col-span-4">
                  <div className="mono text-[11px] uppercase tracking-widest text-black/55">
                    email
                  </div>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className="text-[14px] leading-6 text-black/90">
                    <a
                      className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                      href="mailto:elymarioncollective@gmail.com"
                    >
                      elymarioncollective@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 py-3">
                <div className="col-span-12 md:col-span-4">
                  <div className="mono text-[11px] uppercase tracking-widest text-black/55">
                    instagram
                  </div>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className="text-[14px] leading-6 text-black/90">
                    <a
                      className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                      href="https://instagram.com/ely.marion.collective"
                      target="_blank"
                      rel="noreferrer"
                    >
                      @ely.marion.collective
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 py-3">
                <div className="col-span-12 md:col-span-4">
                  <div className="mono text-[11px] uppercase tracking-widest text-black/55">
                    phones
                  </div>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className="text-[14px] leading-6 text-black/90">
                    Ely : 06 32 33 71 02
                    <br />
                    Marion : 06 27 62 41 43
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-2" />
      </div>
    </div>
  );
}

export default function CollectivePage() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-6">
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 md:col-span-7">
            <div className="mono text-[11px] uppercase tracking-widest text-black/60">
              collective
            </div>

            <h1 className="mt-3 font-sans text-[56px] leading-[1.02] tracking-[-0.02em]">
              Ely &amp; Marion Collective
            </h1>

            <p className="mt-5 max-w-[64ch] text-[14px] leading-6 text-black/85">
              Le duo Ely &amp; Marion est né avec l’intention de créer un outil
              de diffusion des luttes féministes. La collective est composée de
              deux jeunes artistes, Elyette Gauthier et Marion Serclérat,
              récemment diplômées du DNSEP Art contemporain — Design contemporain,
              mention Espace, à l’École d’Art et de Design de Saint-Étienne.
            </p>
          </div>

          {/* CONTACT : plus bas / centré */}
          <div className="col-span-12 md:col-span-5 md:justify-self-end md:self-center">
            <ContactBlock />
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 divide-y divide-black/10">
        <Section id="a-propos" title="à propos">
          <div className="divide-y divide-black/10">
            <Row label="mission">
              Créer un outil de diffusion des luttes féministes.
            </Row>
            <Row label="composition">Elyette Gauthier · Marion Serclérat</Row>
            <Row label="formation">
              DNSEP Art contemporain — Design contemporain, mention Espace
              (ESADSE).
            </Row>
          </div>
        </Section>

        <Section id="artistes" title="artistes">
          <div className="divide-y divide-black/10">
            <Row label="elyette gauthier">
              Artiste pluridisciplinaire (sculpture, graphisme, édition,
              estampe, performance, son). Elle explore la création sonore via le
              montage live d’échantillons, l’enregistrement audio et le mix,
              avec l’objectif de concevoir des espaces inclusifs au sein
              d’environnements immersifs. Son travail interroge aussi la
              représentation des corps sexisés dans l’espace public et les
              dynamiques de domination / appropriation des lieux.
            </Row>

            <Row label="marion serclérat">
              Professeure et artiste numérique. Sa recherche porte sur les
              communautés en ligne, notamment la manosphère, qu’elle analyse
              avec un regard critique cyberféministe. Elle crée des objets
              numériques (jeux vidéo, courts métrages) et développe aussi des
              formes dans l’espace physique via l’édition et l’affiche.
            </Row>
          </div>
        </Section>

        <Section id="temoigner" title="témoigner pour lutter">
          <div className="divide-y divide-black/10">
            <Row label="performance">
              Performance live audiovisuelle composée en duo — Marion à l’image,
              Elyette au son. Une tentative de subvertir des espaces saturés par
              la violence et les codes patriarcaux, en les envahissant avec des
              codes et références féministes, et de créer des liens entre
              l’espace public de la ville et celui du numérique (violences
              patriarcales, coloniales, capitalistes).
            </Row>

            <Row label="dispositif">
              Le dispositif met en relation une bibliothèque de références :
              extraits sonores (podcasts, musique, lectures performées) et
              bibliothèque visuelle (image textuelle, photographie, extraits vidéo
              / films), joués en simultané et en direct. La performance est aussi
              pensée comme un processus de diffusion et un outil de dialogue.
            </Row>

            <Row label="navigation">
              <span className="inline-flex gap-3">
                <Link
                  className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                  href="/archives"
                >
                  Archives
                </Link>
                <span className="text-black/40">·</span>
                <Link
                  className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                  href="/diy"
                >
                  Do It Yourself
                </Link>
                <span className="text-black/40">·</span>

                <Link
                  className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                  href="/performances"
                >
                  Performances
                </Link>
              </span>
            </Row>
          </div>
        </Section>

        <Section id="2025" title="2025">
          <div className="divide-y divide-black/10">
            <Row label="mars 2025">
              Représentation à l’ESADSE lors du séminaire sur les actes
              politiques autour du numérique (association Process)
            </Row>
            <Row label="avril / mai 2025">
              Résidence de recherche et création (2 semaines), Aléatronome,
              Saint-Étienne
            </Row>
            <Row label="juillet 2025">
              Représentation au festival Picardiscount, Richecourt
            </Row>
            <Row label="juillet 2025">
              Résidence de recherche et création (2 semaines), DROP,
              Saint-Étienne
            </Row>
            <Row label="octobre / novembre 2025">
              Résidence de recherche et création Sonarea (2 semaines), AADN
              &amp; GRAME CNCM, Villeurbanne
            </Row>
            <Row label="novembre 2025">
              Représentation au festival Desmadre, Paris
            </Row>
          </div>
        </Section>
      </div>
    </main>
  );
}
