"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/decks", label: "Decks", icon: BookOpen },
  { href: "/study", label: "Study", icon: GraduationCap },
  { href: "/account", label: "Account", icon: User },
];

export function NavBar() {
  const pathname = usePathname();

  // Don't show nav on landing, auth pages
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) return null;

  return (
    <nav className="border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          SuperAnki
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
