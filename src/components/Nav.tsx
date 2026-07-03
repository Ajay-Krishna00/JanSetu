"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/submit", label: "Submit a request" },
  { href: "/dashboard", label: "MP Dashboard" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm text-white">
            ज
          </span>
          <span>
            JanSetu{" "}
            <span className="text-xs font-normal text-ink-muted">· Suryagiri Constituency</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const primary = link.href === "/dashboard";
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  primary
                    ? `rounded-lg px-3 py-1.5 font-medium text-white ${
                        active ? "bg-brand-strong" : "bg-brand hover:bg-brand-strong"
                      }`
                    : `rounded-lg px-3 py-1.5 ${
                        active
                          ? "bg-background font-medium text-brand"
                          : "hover:bg-background"
                      }`
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
