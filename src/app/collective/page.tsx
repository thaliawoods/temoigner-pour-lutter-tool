import SiteFooter from "@/components/SiteFooter";

export default function CollectivePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          collective
        </div>

        <h1 className="mt-3 text-3xl font-semibold">Ely & Marion Collective</h1>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 text-base leading-relaxed text-zinc-800">
            Ely et Marion sont deux artistes etc.
            <br />
            <br />
            archives, voix, images, luttes, performance.
          </div>

          <div className="border border-zinc-300 p-4">
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              links
            </div>
            <div className="mt-3 text-sm">
              <div>• instagram: https://www.instagram.com/ely.marion.collective/</div>
              <div>• contact: elymarioncollective@gmail.com </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
