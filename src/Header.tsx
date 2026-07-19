import { useState } from "react";
import { Menu, X } from "lucide-react";
import useIsMobile from "./hooks/useIsMobile";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/blog/articles", label: "Blog" },
  { href: "/games", label: "Games" },
];

export default function Header() {
  const isTablet = useIsMobile(1440);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shrink-0 rounded-3xl bg-white border border-zinc-200 px-8 py-4 flex items-center justify-between gap-4 relative">
      <a className="flex items-center" href="/">
        <img src="/favicon.png" alt="" className="w-11 h-11" />
        <h1 className="text-zinc-900 text-xl font-semibold">EtymoMap</h1>
      </a>
      {isTablet ? (
        <>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl bg-white border border-zinc-200 shadow-lg p-2 flex flex-col z-50">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex gap-4">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
