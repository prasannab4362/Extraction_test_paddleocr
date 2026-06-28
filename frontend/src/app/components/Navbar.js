"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/extract", label: "Extract" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar" style={{ position: "relative" }}>
      <div className="container navbar-inner">
        <Link href="/" className="navbar-brand">
          <div className="brand-icon">O</div>
          <span>OCR extraction</span>
        </Link>

        <div className="navbar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-cta">
          <Link href="/extract" className="btn btn-primary btn-sm">
            Start Extracting →
          </Link>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen
              ? <path d="M18 6 6 18M6 6l12 12" />
              : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
      </div>

      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/extract"
          className="btn btn-primary"
          style={{ marginTop: "8px" }}
          onClick={() => setMobileOpen(false)}
        >
          Start Extracting →
        </Link>
      </div>
    </nav>
  );
}
