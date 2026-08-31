import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X } from "lucide-react";
import useIsMobile from "./hooks/useIsMobile";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/blog/articles", label: "Blog" },
  { href: "/feedback", label: "Feedback" },
];

export default function Header() {
  const isTablet = useIsMobile(1440);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, closeMenu]);

  const handleToggleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        e.preventDefault();
        closeMenu();
      }
    },
    [menuOpen, closeMenu],
  );

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    },
    [closeMenu],
  );

  return (
    <div
      ref={menuRef}
      className="shrink-0 rounded-3xl bg-white border border-zinc-200 px-8 py-4 flex items-center justify-between gap-4 relative"
    >
      <a className="flex items-center" href="/">
        <img src="/favicon.png" alt="" className="w-11 h-11" />
        <h1 className="text-zinc-900 text-xl font-semibold">EtymoMap</h1>
      </a>
      {isTablet ? (
        <>
          <button
            ref={toggleRef}
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={handleToggleKeyDown}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="nav-menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {menuOpen && (
            <div
              role="menu"
              id="nav-menu"
              onKeyDown={handleMenuKeyDown}
              className="absolute top-full right-0 mt-2 w-48 rounded-2xl bg-white border border-zinc-200 shadow-lg p-2 flex flex-col z-50"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className="px-4 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
                  onClick={() => closeMenu()}
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
