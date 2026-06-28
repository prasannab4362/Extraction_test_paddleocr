import Link from "next/link";

export const metadata = {
  title: "Extract Documents",
  description:
    "Choose from 6 AI-powered extraction tools — invoices, Aadhaar, PAN cards, business cards, tables, and general documents. Free and instant.",
};

const tools = [
  {
    id: "invoice",
    name: "Invoice Extractor",
    icon: "🧾",
    desc: "Vendor, line items, tax, totals, due dates from invoices and bills.",
    color: "#10b981",
  },
  {
    id: "business_card",
    name: "Business Card Reader",
    icon: "📇",
    desc: "Name, job title, company, phone, email, and address from business cards.",
    color: "#3b82f6",
  },
  {
    id: "table",
    name: "Table Structure Extractor",
    icon: "📊",
    desc: "Detect and export grid data from reports, forms, and spreadsheets.",
    color: "#8b5cf6",
  },
  {
    id: "aadhaar",
    name: "Aadhaar Card Extractor",
    icon: "🆔",
    desc: "Aadhaar number, full name, DOB, gender, and address from Indian ID cards.",
    color: "#f59e0b",
  },
  {
    id: "pan",
    name: "PAN Card Extractor",
    icon: "💳",
    desc: "PAN number, full name, father's name, and date of birth from PAN cards.",
    color: "#ef4444",
  },
  {
    id: "general",
    name: "General Document Extractor",
    icon: "📄",
    desc: "Summaries, key fields, and section structure from any unstructured document.",
    color: "#64748b",
  },
];

export default function ExtractPage() {
  return (
    <>
      {/* Page Hero */}
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Choose your tool</p>
          <h1 className="page-hero-title">What would you like to extract?</h1>
          <p className="page-hero-desc">
            Select a document type below. Each tool is specifically tuned for that document's structure and fields.
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="tools-grid">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={`/extract/${tool.id}`}
                style={{ textDecoration: "none" }}
              >
                <div className="tool-card" style={{ height: "100%" }}>
                  <div className="tool-icon" style={{ background: `${tool.color}15` }}>
                    {tool.icon}
                  </div>
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-desc">{tool.desc}</div>
                  <div
                    className="tool-arrow"
                    style={{ color: tool.color, opacity: 1, transform: "none" }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
