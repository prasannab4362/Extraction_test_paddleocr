"use client";

import Link from "next/link";
import { useState } from "react";

const tools = [
  {
    id: "invoice",
    name: "Invoice Extractor",
    icon: "🧾",
    desc: "Extract vendor details, line items, tax, totals, and due dates from any invoice or bill.",
    tags: ["PDF", "Image"],
  },
  {
    id: "business_card",
    name: "Business Card Reader",
    icon: "📇",
    desc: "Parse contact name, job title, company, phone, email, and address from business cards.",
    tags: ["Image", "Batch"],
  },
  {
    id: "table",
    name: "Table Structure Extractor",
    icon: "📊",
    desc: "Detect and extract tabular data grids from spreadsheets, reports, and structured forms.",
    tags: ["PDF", "Image"],
  },
  {
    id: "aadhaar",
    name: "Aadhaar Card Extractor",
    icon: "🆔",
    desc: "Extract Aadhaar number, full name, DOB, gender, and address from Indian ID cards.",
    tags: ["Image", "Batch"],
  },
  {
    id: "pan",
    name: "PAN Card Extractor",
    icon: "💳",
    desc: "Extract PAN number, full name, father's name, and date of birth from PAN cards.",
    tags: ["Image", "Batch"],
  },
  {
    id: "general",
    name: "General Document Extractor",
    icon: "📄",
    desc: "Extract summaries, key fields, and section structure from any unstructured document.",
    tags: ["PDF", "Image"],
  },
];

const steps = [
  {
    n: "1",
    title: "Choose a Tool",
    desc: "Select the type of document you want to extract — invoice, ID card, table, or any document.",
  },
  {
    n: "2",
    title: "Upload Your Files",
    desc: "Drag and drop images or PDFs. Upload a single file or batch-process multiple at once.",
  },
  {
    n: "3",
    title: "Download Results",
    desc: "Instantly get structured data in clean JSON, raw text, or export directly to a spreadsheet.",
  },
];

const faqs = [
  {
    q: "Is OCR extraction free to use?",
    a: "Yes, OCR extraction is completely free. You can upload and process documents without any sign-up or payment.",
  },
  {
    q: "Are my uploaded files stored or shared?",
    a: "No. Your files are processed in memory and are never stored on our servers. We do not retain, share, or log your documents.",
  },
  {
    q: "What file formats are supported?",
    a: "We support common image formats (JPG, PNG, WEBP, TIFF) and PDF files. Multi-page PDFs are handled automatically.",
  },
  {
    q: "Can I process multiple documents at once?",
    a: "Yes! Use Batch Mode to upload multiple images and extract data from each one independently. Perfect for processing stacks of business cards or ID cards.",
  },
  {
    q: "Can it read Hindi or other Indic languages?",
    a: "The current version is optimized for English. Multi-language support including Hindi, Tamil, and Telugu is on our roadmap.",
  },
  {
    q: "How accurate is the extraction?",
    a: "Accuracy depends on document quality. Clear, high-resolution scans yield 95%+ accuracy. The AI model intelligently corrects minor OCR errors.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="container">
          <div
            style={{
              maxWidth: "700px",
              animation: "fadeUp 0.6s ease-out both",
            }}
          >
            <div className="hero-badge">
              <span>🚀</span>
              <span>Free · No sign-up · Instant results</span>
            </div>

            <h1 className="hero-title">
              Extract Any Document <br />
              <span className="gradient-text">in Seconds with AI</span>
            </h1>

            <p className="hero-desc">
              Upload invoices, Aadhaar cards, PAN cards, business cards, or any document.
              Our AI reads, understands, and structures the data — ready to download.
            </p>

            <div className="hero-actions">
              <Link href="/extract" className="btn btn-primary btn-lg">
                Start Extracting Free →
              </Link>
              <Link href="/about" className="btn btn-lg" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" }}>
                Learn More
              </Link>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">6+</div>
                <div className="stat-label">Document Types</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Free to Use</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">Sign-ups Required</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">AI</div>
                <div className="stat-label">Powered by Llama 3</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TOOLS GRID ===== */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "56px" }}>
            <div className="section-label">What can you extract?</div>
            <h2 className="heading-lg">
              6 Specialized Extraction Tools
            </h2>
            <p style={{ fontSize: "17px", color: "var(--text-muted)", maxWidth: "540px", margin: "16px auto 0" }}>
              Each tool is powered by a dedicated AI prompt, tuned to the specific structure
              and fields of that document type.
            </p>
          </div>

          <div className="tools-grid">
            {tools.map((tool) => (
              <Link href={`/extract/${tool.id}`} key={tool.id} style={{ textDecoration: "none" }}>
                <div className="tool-card">
                  <div className="tool-icon">{tool.icon}</div>
                  <div>
                    <div className="tool-name">{tool.name}</div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                      {tool.tags.map((t) => (
                        <span key={t} className="badge badge-gray">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="tool-desc">{tool.desc}</div>
                  <div className="tool-arrow">→</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" style={{ background: "var(--bg-muted)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "56px" }}>
            <div className="section-label">How it works</div>
            <h2 className="heading-lg">3 Simple Steps</h2>
            <p style={{ fontSize: "17px", color: "var(--text-muted)", maxWidth: "460px", margin: "16px auto 0" }}>
              No account, no configuration. Just upload and extract.
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((step) => (
              <div className="step-item" key={step.n}>
                <div className="step-number">{step.n}</div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <div className="section-label">FAQ</div>
            <h2 className="heading-lg">Frequently Asked Questions</h2>
          </div>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${openFaq === i ? "open" : ""}`}
              >
                <button
                  className="faq-trigger"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  <div className="faq-icon">+</div>
                </button>
                <div className="faq-body">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="container" style={{ position: "relative" }}>
          <h2 className="cta-title">Ready to Extract Your First Document?</h2>
          <p className="cta-desc">
            No account needed. Just upload and get structured data instantly.
          </p>
          <div className="cta-actions">
            <Link href="/extract" className="btn btn-lg btn-white">
              Extract Now — It&apos;s Free →
            </Link>
            <Link href="/about" className="btn btn-lg btn-outline-white">
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
