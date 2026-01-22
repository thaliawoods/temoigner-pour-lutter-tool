"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/archives", label: "archive" },
  { href: "/live", label: "live" },
  { href: "/about", label: "about" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 z-50 flex gap-2 text-sm">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`border border-zinc-300 px-3 py-2 ${
              active ? "bg-black text-white" : "bg-white"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
