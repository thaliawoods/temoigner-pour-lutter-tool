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
    "mono uppercase transition-opacity hover:opacity-70 " +
    "text-[10px] sm:text-[11px] tracking-[0.22em] sm:tracking-widest";
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

export default function SiteHeader({
  variant = "bar",
}: {
  variant?: HeaderVariant;
}) {
  const path = usePathname();
  const isHome = path === "/";

  // ===== Overlay (home video) =====
  if (variant === "overlay") {
    return (
      <header className="absolute inset-x-0 top-0 z-50 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6">
          {/* Mobile */}
          <div className="sm:hidden">
            <div className="flex items-start justify-between gap-4">
              <NavItem
                href="/"
                label="Témoigner pour lutter"
                align="left"
                active={isHome}
                className="text-white leading-tight"
              />
              <span className="mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                mvp
              </span>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
              <NavItem
                href="/collective"
                label="Collective"
                align="center"
                active={path === "/collective"}
                className="text-white whitespace-nowrap"
              />
              <NavItem
                href="/archives"
                label="Archives"
                align="center"
                active={path === "/archives"}
                className="text-white whitespace-nowrap"
              />
              <NavItem
                href="/live"
                label="Live"
                align="center"
                active={path === "/live"}
                className="text-white whitespace-nowrap"
              />
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
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
                  className="text-white whitespace-nowrap"
                />
                <NavItem
                  href="/live"
                  label="Live"
                  align="right"
                  active={path === "/live"}
                  className="text-white whitespace-nowrap"
                />
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ===== Bar (all pages) =====
  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
        {/* Mobile */}
        <div className="sm:hidden">
          <div className="flex items-start justify-between gap-4">
            <NavItem
              href="/"
              label="Témoigner pour lutter"
              align="left"
              active={isHome}
              className="leading-tight"
            />
            <span className="mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 whitespace-nowrap">
              mvp
            </span>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <NavItem
              href="/collective"
              label="Collective"
              align="center"
              active={path === "/collective"}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/archives"
              label="Archives"
              align="center"
              active={path === "/archives"}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/live"
              label="Live"
              align="center"
              active={path === "/live"}
              className="whitespace-nowrap"
            />
          </div>
        </div>

        {/* Desktop (ton layout actuel) */}
        <div className="hidden sm:grid grid-cols-3 items-center gap-4">
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
              className="whitespace-nowrap"
            />
            <NavItem
              href="/archives"
              label="archives"
              align="center"
              active={path === "/archives"}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/live"
              label="live"
              align="center"
              active={path === "/live"}
              className="whitespace-nowrap"
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
