// src/components/SiteFooter.tsx
import Link from "next/link";
import { getSchema } from "@/lib/references";

export default function SiteFooter() {
  const schema = getSchema();

  const instagramUrl = "https://www.instagram.com/ely.marion.collective/";
  const igLabel = schema.credits?.contact.instagram; // si tu l’as dans ton schema (sinon on affiche juste le lien)
  const email = schema.credits?.contact.email;

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* CONTACT */}
          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              contact
            </div>

            <div className="mt-3 text-sm text-zinc-900 space-y-1">
              <div>
                <a
                  className="underline"
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {igLabel ?? "instagram"}
                </a>
              </div>

              {email ? <div>{email}</div> : null}
            </div>
          </div>

          {/* PAGES */}
          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              pages
            </div>

            <div className="mt-3 text-sm space-y-1">
              <div>
                <Link className="underline" href="/diy">
                  Do It Yourself
                </Link>
              </div>
              <div>
                <Link className="underline" href="/archives">
                  Archives
                </Link>
              </div>
              <div>
                <Link className="underline" href="/performances">
                  Performances
                </Link>
              </div>
              <div>
                <Link className="underline" href="/collective">
                  Collective
                </Link>
              </div>
            </div>
          </div>

          {/* CREDIT */}
          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              credits
            </div>

            <div className="mt-3 text-sm text-zinc-700">
              Ely &amp; Marion Collective
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
