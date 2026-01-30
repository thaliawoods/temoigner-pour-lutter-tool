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

  const isActive = (href: string) => path === href;

  // ===== Overlay (home) =====
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
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
              <NavItem
                href="/diy"
                label="Do It Yourself"
                align="center"
                active={isActive("/diy")}
                className="text-white whitespace-nowrap"
              />
              <NavItem
                href="/archives"
                label="Archives"
                align="center"
                active={isActive("/archives")}
                className="text-white whitespace-nowrap"
              />
              <NavItem
                href="/performances"
                label="Performances"
                align="center"
                active={isActive("/performances")}
                className="text-white whitespace-nowrap"
              />
              <NavItem
                href="/collective"
                label="Collective"
                align="center"
                active={isActive("/collective")}
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
                active={isActive("/collective")}
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
                  href="/diy"
                  label="Do It Yourself"
                  align="right"
                  active={isActive("/diy")}
                  className="text-white whitespace-nowrap"
                />
                <NavItem
                  href="/archives"
                  label="Archives"
                  align="right"
                  active={isActive("/archives")}
                  className="text-white whitespace-nowrap"
                />
                <NavItem
                  href="/performances"
                  label="Performances"
                  align="right"
                  active={isActive("/performances")}
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
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <NavItem
              href="/diy"
              label="Do It Yourself"
              align="center"
              active={isActive("/diy")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/archives"
              label="Archives"
              align="center"
              active={isActive("/archives")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/performances"
              label="Performances"
              align="center"
              active={isActive("/performances")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/collective"
              label="Collective"
              align="center"
              active={isActive("/collective")}
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
              href="/diy"
              label="do it yourself"
              align="center"
              active={isActive("/diy")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/archives"
              label="archives"
              align="center"
              active={isActive("/archives")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/performances"
              label="performances"
              align="center"
              active={isActive("/performances")}
              className="whitespace-nowrap"
            />
            <NavItem
              href="/collective"
              label="collective"
              align="center"
              active={isActive("/collective")}
              className="whitespace-nowrap"
            />
          </div>

          <div className="flex justify-end" />
        </div>
      </div>
    </header>
  );
}
