"use client";

import Link from "next/link";
import { CurrencyToggle } from "./currency-toggle";

const NAV_LINKS = [
  { href: "/import", label: "Import" },
  { href: "/awards", label: "Awards" },
  { href: "/releases", label: "Releases" },
  { href: "/sales", label: "Sales" },
];

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <nav className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold hover:text-foreground">ESS Calcs</Link>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
      <CurrencyToggle />
    </header>
  );
}
