import Link from "next/link";

export const metadata = {
  title: "About Us",
  description:
    "Learn about OCR extraction — a free AI-powered document extractor built to help individuals and businesses extract structured data from any document instantly.",
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">About us</p>
          <h1 className="page-hero-title">Built to Make Data Extraction Simple</h1>
          <p className="page-hero-desc">
            OCR extraction is a free tool for extracting structured data from documents — powered by AI.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="prose">
            <h2>What is OCR extraction?</h2>
            <p>
              OCR extraction is a free, AI-powered web application that lets you instantly extract structured data
              from any document — invoices, Indian ID documents (Aadhaar, PAN), business cards, tables, and general
              text documents.
            </p>
            <p>
              Simply upload an image or PDF, select the document type, and our system uses advanced OCR technology
              combined with a Large Language Model (LLM) to intelligently parse and structure the data into clean,
              downloadable output.
            </p>

            <h2>How it works</h2>
            <p>
              We use a two-step pipeline:
            </p>
            <ul>
              <li>
                <strong>PaddleOCR</strong> — an industry-leading open-source OCR engine that reads text from your
                uploaded image or PDF with high accuracy.
              </li>
              <li>
                <strong>Groq + Llama 3</strong> — a state-of-the-art LLM (Large Language Model) that understands
                the extracted raw text and structures it into clean, typed JSON based on the document type.
              </li>
            </ul>
            <p>
              This combination ensures that even imperfect scans or handwritten labels are handled with
              contextual intelligence.
            </p>

            <h2>Privacy &amp; Data Handling</h2>
            <p>
              We take your privacy seriously. Files you upload are processed entirely in memory and are
              <strong> never saved, stored, or shared</strong> on our servers. Once extraction is complete,
              the file data is discarded. We do not collect any personally identifiable information.
            </p>
            <p>
              See our <Link href="/privacy" style={{ color: "var(--primary)" }}>Privacy Policy</Link> for full details.
            </p>

            <h2>Supported Document Types</h2>
            <ul>
              <li>🧾 Invoices and Bills</li>
              <li>📇 Business Cards</li>
              <li>📊 Table / Grid Documents</li>
              <li>🆔 Indian Aadhaar Card</li>
              <li>💳 Indian PAN Card</li>
              <li>📄 General Documents</li>
            </ul>

            <h2>Who is this for?</h2>
            <p>
              OCR extraction is useful for:
            </p>
            <ul>
              <li>Accountants digitizing paper invoices</li>
              <li>HR teams reading resumes or business cards in bulk</li>
              <li>Researchers extracting data from printed tables</li>
              <li>Individuals verifying or archiving their ID documents</li>
              <li>Developers testing OCR + LLM pipelines</li>
            </ul>

            <h2>Contact</h2>
            <p>
              Have questions, feedback, or want to report an issue? Visit our{" "}
              <Link href="/contact" style={{ color: "var(--primary)" }}>Contact page</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
