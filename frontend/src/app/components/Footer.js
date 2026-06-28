import Link from "next/link";

const tools = [
  { href: "/extract/invoice", label: "Invoice Extractor" },
  { href: "/extract/business_card", label: "Business Card Reader" },
  { href: "/extract/table", label: "Table Extractor" },
  { href: "/extract/aadhaar", label: "Aadhaar Card" },
  { href: "/extract/pan", label: "PAN Card" },
  { href: "/extract/general", label: "General Documents" },
];

const company = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="brand-icon">O</div>
            </div>
            <div className="footer-brand-name">OCR extraction</div>
            <p className="footer-tagline">
              Extract structured data from any document — invoices, ID cards, business cards,
              and more. Powered by PaddleOCR and Gemini AI.
            </p>
          </div>

          {/* Tools */}
          <div>
            <div className="footer-col-title">Tools</div>
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="footer-link">
                {t.label}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div className="footer-col-title">Company</div>
            {company.map((c) => (
              <Link key={c.href} href={c.href} className="footer-link">
                {c.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div className="footer-col-title">Info</div>
            <p className="footer-link" style={{ cursor: "default" }}>Free to use</p>
            <p className="footer-link" style={{ cursor: "default" }}>No sign-up required</p>
            <p className="footer-link" style={{ cursor: "default" }}>Files not stored</p>
            <p className="footer-link" style={{ cursor: "default" }}>Built for India 🇮🇳</p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} OCR extraction. All rights reserved.</span>
          <span style={{ display: "flex", gap: "20px" }}>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/contact" className="footer-link">Contact</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
