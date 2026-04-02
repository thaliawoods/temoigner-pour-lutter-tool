import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="mono text-[11px] uppercase tracking-widest text-zinc-500">
        404
      </p>
      <h1 className="mt-3 gertrude text-2xl font-medium">
        page introuvable
      </h1>
      <Link
        href="/"
        className="mt-6 mono text-xs underline underline-offset-4 hover:text-zinc-600"
      >
        retour à l&apos;accueil
      </Link>
    </main>
  );
}
