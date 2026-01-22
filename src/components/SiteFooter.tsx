import Link from "next/link";
import { getSchema } from "@/lib/references";

export default function SiteFooter() {
  const schema = getSchema();
  const ig = schema.credits?.contact.instagram;
  const email = schema.credits?.contact.email;

  return (
    <footer className="border-t border-zinc-300 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              Contact
            </div>
            <div className="mt-3 text-sm text-zinc-900">
              {ig ? <div>{ig}</div> : null}
              {email ? <div>{email}</div> : null}
            </div>
          </div>

          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              Pages
            </div>
            <div className="mt-3 text-sm">
              <div><Link className="underline" href="/">Home</Link></div>
              <div><Link className="underline" href="/archives">Archives</Link></div>
              <div><Link className="underline" href="/live">Live</Link></div>
              <div><Link className="underline" href="/collective">Collective</Link></div>
            </div>
          </div>

          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              Notes
            </div>
            <div className="mt-3 text-sm text-zinc-700">
              live performance + archive tool (mvp)
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
