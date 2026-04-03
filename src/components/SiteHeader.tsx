"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type HeaderVariant = "overlay" | "bar";

const navLinks = [
  { href: "/archives", label: "Archives" },
  { href: "/performances", label: "Performances" },
  { href: "/diy", label: "Do It Yourself" },
  { href: "/creations", label: "Vos Créations" },
  { href: "/collective", label: "Collective" },
];

function NavItem({
  href,
  label,
  active,
  className = "",
}: {
  href: string;
  label: string;
  active?: boolean;
  className?: string;
}) {
  const base =
    "gertrude uppercase transition-opacity hover:opacity-70 " +
    "text-[10px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.22em]";

  return (
    <Link
      href={href}
      className={`${base} ${className}`}
      style={
        active
          ? {
              borderBottom: "1.5px solid black",
              paddingBottom: "3px",
            }
          : undefined
      }
    >
      {label}
    </Link>
  );
}

export default function SiteHeader({
  variant = "bar",
}: {
  variant?: HeaderVariant;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = path === "/";
  const isActive = (href: string) => path === href;

  const isOverlay = variant === "overlay";
  const headerClass = isOverlay
    ? "absolute inset-x-0 top-0 z-50 text-white"
    : "w-full border-b border-zinc-200 bg-white text-black";

  const innerClass = isOverlay
    ? "mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6"
    : "mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4";

  const linkColorClass = isOverlay ? "text-white" : "text-black";
  const buttonColorClass = isOverlay
    ? "text-white border-white/30"
    : "text-black border-zinc-300";

  return (
    <header className={headerClass}>
      <div className={innerClass}>
        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-4">
            <NavItem
              href="/"
              label="Témoigner pour lutter"
              active={isHome}
              className={`${linkColorClass} leading-tight max-w-[75%]`}
            />

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className={`shrink-0 rounded border px-3 py-2 text-[10px] uppercase tracking-[0.2em] ${buttonColorClass}`}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>

          {menuOpen && (
            <nav className="mt-4 flex flex-col gap-3 pb-2">
              {navLinks.map((item) => (
                <span key={item.href} onClick={() => setMenuOpen(false)}>
                  <NavItem
                    href={item.href}
                    label={item.label}
                    active={isActive(item.href)}
                    className={`${linkColorClass} block w-fit`}
                  />
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <NavItem
            href="/"
            label="Témoigner pour lutter"
            active={isHome}
            className={`${linkColorClass} block w-fit shrink-0`}
          />

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {navLinks.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(item.href)}
                className={`${linkColorClass}`}
              />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}