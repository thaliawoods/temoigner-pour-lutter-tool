"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type HeaderVariant = "overlay" | "bar";

function NavItem({
  href,
  label,
  align = "left",
  active,
  className = "",
}: {
  href: string;
  label: string;
  align?: "left" | "center" | "right";
  active?: boolean;
  className?: string;
}) {
  const base =
    "mono text-[11px] uppercase tracking-widest hover:opacity-70 transition-opacity";
  const underline = active ? "underline underline-offset-4" : "";
  const justify =
    align === "left"
      ? "justify-start"
      : align === "center"
      ? "justify-center"
      : "justify-end";

  return (
    <div className={`flex ${justify}`}>
      <Link href={href} className={`${base} ${underline} ${className}`}>
        {label}
      </Link>
    </div>
  );
}

export default function SiteHeader({ variant = "bar" }: { variant?: HeaderVariant }) {
  const path = usePathname();

  const isHome = path === "/";

  // ===== Overlay (home video) =====
  if (variant === "overlay") {
    return (
      <header className="absolute inset-x-0 top-0 z-50 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="grid grid-cols-3 items-start gap-4">
            <NavItem
              href="/collective"
              label="Ely & Marion Collective"
              align="left"
              active={path === "/collective"}
              className="text-white"
            />

            <NavItem
              href="/"
              label="Témoigner pour lutter"
              align="center"
              active={isHome}
              className="text-white"
            />

            <div className="flex justify-end gap-6">
              <NavItem
                href="/archives"
                label="Archives"
                align="right"
                active={path === "/archives"}
                className="text-white"
              />
              <NavItem
                href="/live"
                label="Live"
                align="right"
                active={path === "/live"}
                className="text-white"
              />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ===== Bar (all pages) =====
  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="grid grid-cols-3 items-center gap-4">
          <NavItem
            href="/"
            label="témoigner pour lutter"
            align="left"
            active={isHome}
          />

          <div className="flex justify-center gap-6">
            <NavItem
              href="/collective"
              label="collective"
              align="center"
              active={path === "/collective"}
            />
            <NavItem
              href="/archives"
              label="archives"
              align="center"
              active={path === "/archives"}
            />
            <NavItem
              href="/live"
              label="live"
              align="center"
              active={path === "/live"}
            />
          </div>

          <div className="flex justify-end">
            <span className="mono text-[11px] uppercase tracking-widest text-zinc-500">
              mvp
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
