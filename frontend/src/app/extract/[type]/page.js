"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOOL_META = {
  invoice: {
    name: "Invoice Extractor",
    icon: "🧾",
    desc: "Upload invoices or bills. Extracts invoice number, date, totals, and more.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
    fields: [
      { key: "vendor_name",    label: "Vendor Name" },
      { key: "invoice_number", label: "Invoice / Bill No." },
      { key: "date",           label: "Date" },
      { key: "tax_amount",     label: "Tax / GST Amount" },
      { key: "total_amount",   label: "Total Amount" },
    ],
  },
  business_card: {
    name: "Business Card Reader",
    icon: "📇",
    desc: "Upload business card images. Extracts name, company, email, phone, and website.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
    fields: [
      { key: "name",         label: "Name" },
      { key: "company_name", label: "Company" },
      { key: "email",        label: "Email" },
      { key: "phone_number", label: "Phone" },
      { key: "website",      label: "Website" },
    ],
  },
  table: {
    name: "Table Structure Extractor",
    icon: "📊",
    desc: "Upload documents containing tables or grids. Outputs detected headers and rows.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
    fields: [
      { key: "total_rows", label: "Rows Detected" },
    ],
  },
  aadhaar: {
    name: "Aadhaar Card Extractor",
    icon: "🆔",
    desc: "Upload Aadhaar card images. Extracts Aadhaar number, name, DOB, and gender.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
    fields: [
      { key: "aadhaar_number", label: "Aadhaar Number" },
      { key: "full_name",      label: "Full Name" },
      { key: "date_of_birth",  label: "Date of Birth" },
      { key: "gender",         label: "Gender" },
      { key: "phone_linked",   label: "Phone (if visible)" },
    ],
  },
  pan: {
    name: "PAN Card Extractor",
    icon: "💳",
    desc: "Upload PAN card images. Extracts PAN number, name, father's name, and DOB.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
    fields: [
      { key: "pan_number",   label: "PAN Number" },
      { key: "full_name",    label: "Full Name" },
      { key: "fathers_name", label: "Father's Name" },
      { key: "date_of_birth",label: "Date of Birth" },
    ],
  },
  general: {
    name: "General Document Extractor",
    icon: "📄",
    desc: "Upload any document. Extracts all text and detects key-value pairs automatically.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
    fields: [
      { key: "total_lines", label: "Lines Detected" },
    ],
  },
};

// ─── Structured data renderer ────────────────────────────────────────────────

function StructuredView({ type, struct }) {
  if (!struct) return null;

  if (struct.error) {
    return (
      <div style={{
        padding: "16px 20px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "var(--radius-md)",
        color: "#dc2626",
        fontSize: "14px",
      }}>
        ⚠ {struct.error}
      </div>
    );
  }

  const tool = TOOL_META[type];

  const Field = ({ label, value, mono, highlight }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="meta-row">
        <span className="meta-label">{label}</span>
        <span
          className="meta-val"
          style={{
            fontFamily: mono ? "var(--font-mono)" : undefined,
            fontSize: mono ? "16px" : undefined,
            letterSpacing: mono ? "2px" : undefined,
            color: highlight ? "var(--primary-dark)" : undefined,
            fontWeight: highlight ? 800 : undefined,
          }}
        >
          {String(value)}
        </span>
      </div>
    );
  };

  // ── Aadhaar ──
  if (type === "aadhaar") {
    return (
      <div style={{ maxWidth: "540px" }}>
        <div className="meta-card">
          <div className="meta-card-title">🆔 Aadhaar Card Details</div>
          {struct.aadhaar_number && (
            <div className="meta-row" style={{ padding: "14px 0" }}>
              <span className="meta-label">Aadhaar Number</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "3px",
                color: "var(--primary-dark)",
              }}>
                {struct.aadhaar_number}
              </span>
            </div>
          )}
          <Field label="Full Name"     value={struct.full_name} />
          <Field label="Date of Birth" value={struct.date_of_birth} />
          <Field label="Gender"        value={struct.gender} />
          <Field label="Phone Linked"  value={struct.phone_linked} />
        </div>
        <OCRLines lines={struct.all_text_lines} />
      </div>
    );
  }

  // ── PAN ──
  if (type === "pan") {
    return (
      <div style={{ maxWidth: "540px" }}>
        <div className="meta-card">
          <div className="meta-card-title">💳 PAN Card Details</div>
          {struct.pan_number && (
            <div className="meta-row" style={{ padding: "14px 0" }}>
              <span className="meta-label">PAN Number</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "4px",
                color: "var(--primary-dark)",
              }}>
                {struct.pan_number}
              </span>
            </div>
          )}
          <Field label="Full Name"     value={struct.full_name} />
          <Field label="Father's Name" value={struct.fathers_name} />
          <Field label="Date of Birth" value={struct.date_of_birth} />
        </div>
        <OCRLines lines={struct.all_text_lines} />
      </div>
    );
  }

  // ── Business Card ──
  if (type === "business_card") {
    return (
      <div style={{ maxWidth: "540px" }}>
        <div className="meta-card">
          <div className="meta-card-title">📇 Contact Details</div>
          <Field label="Name"         value={struct.name} />
          <Field label="Company"      value={struct.company_name} />
          <Field label="Email"        value={struct.email} />
          <Field label="Phone"        value={struct.phone_number} />
          <Field label="Website"      value={struct.website} />
        </div>
        <OCRLines lines={struct.all_text_lines} />
      </div>
    );
  }

  // ── Invoice ──
  if (type === "invoice") {
    return (
      <div>
        <div className="meta-grid">
          <div className="meta-card">
            <div className="meta-card-title">🧾 Invoice Info</div>
            <Field label="Vendor / Supplier" value={struct.vendor_name} />
            <Field label="Invoice Number"    value={struct.invoice_number} mono />
            <Field label="Date"              value={struct.date} />
            <Field label="Tax / GST"         value={struct.tax_amount} />
            <Field label="Total Amount" value={struct.total_amount} highlight />
          </div>
        </div>
        <OCRLines lines={struct.all_text_lines} />
      </div>
    );
  }

  // ── Table ──
  if (type === "table") {
    const headers = struct.detected_headers || [];
    const rows    = struct.detected_rows || [];
    return (
      <div>
        {headers.length > 0 ? (
          <div className="data-table-wrap" style={{ marginBottom: "20px" }}>
            <table className="data-table">
              <thead>
                <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", marginBottom: "16px", fontSize: "14px" }}>
            No clear table structure detected. View raw text for all content.
          </div>
        )}
        <OCRLines lines={struct.all_text_lines} />
      </div>
    );
  }

  // ── General ──
  return (
    <div>
      {struct.extracted_key_values && struct.extracted_key_values.length > 0 && (
        <div className="meta-card" style={{ marginBottom: "16px" }}>
          <div className="meta-card-title">📌 Detected Key–Value Pairs</div>
          {struct.extracted_key_values.map((kv, i) => (
            <div className="meta-row" key={i}>
              <span className="meta-label">{kv.key}</span>
              <span className="meta-val">{kv.value}</span>
            </div>
          ))}
        </div>
      )}
      <OCRLines lines={struct.all_text_lines} />
    </div>
  );
}

function OCRLines({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        color: "var(--text-muted)",
        marginBottom: "10px",
      }}>
        All OCR Lines ({lines.length})
      </div>
      <div style={{
        background: "var(--bg-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        maxHeight: "260px",
        overflowY: "auto",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: "flex",
            gap: "12px",
            padding: "5px 0",
            borderBottom: "1px solid rgba(0,0,0,0.04)",
            fontSize: "13px",
          }}>
            <span style={{ color: "#cbd5e1", flexShrink: 0, width: "24px", textAlign: "right" }}>
              {i + 1}
            </span>
            <span style={{ color: "var(--text-body)" }}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExtractorWorkspace() {
  const { type } = useParams();
  const router   = useRouter();
  const tool     = TOOL_META[type];

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [mode,          setMode]          = useState("merge");
  const [loading,       setLoading]       = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState("");
  const [results,       setResults]       = useState([]);
  const [activeTab,     setActiveTab]     = useState("structured");

  if (!tool) {
    return (
      <div className="container section text-center">
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
        <h2 className="heading-md" style={{ marginBottom: "8px" }}>Tool not found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          The extractor &quot;{type}&quot; does not exist.
        </p>
        <Link href="/extract" className="btn btn-primary">← Back to Tools</Link>
      </div>
    );
  }

  // ── Event handlers ──
  const addFiles = (fileList) => setSelectedFiles(Array.from(fileList));

  const handleDragOver  = (e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); };
  const handleDragLeave = (e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); };
  const handleDrop      = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const runExtraction = async () => {
    if (!selectedFiles.length) return;
    setLoading(true);
    setLoadingMsg("Running PaddleOCR on your document…");
    setResults([]);

    const fd = new FormData();
    selectedFiles.forEach((f) => fd.append("files", f));
    fd.append("mode",     mode);
    fd.append("doc_type", type);

    try {
      setLoadingMsg("Extracting structured fields…");
      const res = await fetch(`${API_URL}/api/extract`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
      setActiveTab("structured");
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const downloadCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), { href: url, download: `${type}_extracted.csv` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export error: " + err.message);
    }
  };

  const copyText = (t) => navigator.clipboard.writeText(t).catch(() => {});

  const rawText = results.map((r) => r.raw_text).join("\n\n---\n\n");
  const rawJson = JSON.stringify(results, null, 2);

  return (
    <>
      {/* ─── Page Header ─── */}
      <section className="page-hero" style={{ padding: "44px 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
            <div style={{ fontSize: "44px" }}>{tool.icon}</div>
            <div style={{ textAlign: "left" }}>
              <h1 className="page-hero-title" style={{ fontSize: "28px", marginBottom: "4px" }}>
                {tool.name}
              </h1>
              <p style={{ color: "#64748b", fontSize: "14px" }}>{tool.desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Workspace ─── */}
      <section style={{ background: "var(--bg-muted)", padding: "36px 0 60px" }}>
        <div className="container">
          <div className="workspace-layout">

            {/* ═══ LEFT PANEL ═══ */}
            <div className="card" style={{ position: "relative" }}>

              {/* Loading overlay */}
              {loading && (
                <div className="loading-overlay active">
                  <div className="spinner" />
                  <div className="loading-text">Processing…</div>
                  <div className="loading-sub">{loadingMsg}</div>
                </div>
              )}

              <div className="card-title"><span>📤</span> Upload Files</div>

              {/* Drop zone */}
              <div
                className="dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("ws-file-input").click()}
              >
                <div className="dropzone-icon">📥</div>
                <div className="dropzone-title">Click or drag files here</div>
                <div className="dropzone-hint">{tool.acceptedFiles}</div>
                <input
                  id="ws-file-input"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {selectedFiles.length > 0 && (
                <div className="file-list">
                  {selectedFiles.map((f, i) => (
                    <div className="file-item" key={i}>
                      <span className="file-icon">
                        {f.type === "application/pdf" ? "📄" : "🖼️"}
                      </span>
                      <span className="file-name">{f.name}</span>
                      <span className="file-size">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setSelectedFiles([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "4px 0",
                      textDecoration: "underline",
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Queue mode */}
              <div className="mode-toggle-wrapper">
                <div className="mode-toggle-label">Queue Mode</div>
                <div className="mode-tabs">
                  <button
                    className={`mode-tab ${mode === "merge" ? "active" : ""}`}
                    onClick={() => setMode("merge")}
                  >
                    Merge Pages
                  </button>
                  <button
                    className={`mode-tab ${mode === "batch" ? "active" : ""}`}
                    onClick={() => setMode("batch")}
                  >
                    Batch (Separate)
                  </button>
                </div>
                <div className="mode-hint">
                  {mode === "merge"
                    ? "🔗 Merge: Treat all files as one long document — e.g. a 4-page bill."
                    : "📦 Batch: Each file is a separate document — e.g. 10 business cards."}
                </div>
              </div>

              <button
                className="btn-extract"
                disabled={!selectedFiles.length || loading}
                onClick={runExtraction}
              >
                {loading ? "Processing…" : `Extract with PaddleOCR →`}
              </button>
            </div>

            {/* ═══ RIGHT PANEL ═══ */}
            <div className="results-card">
              <div className="results-header">
                <div className="tabs-group">
                  {[
                    { id: "structured", label: "Structured Data" },
                    { id: "raw-text",   label: "Raw OCR Text" },
                    { id: "json",       label: "JSON" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`result-tab ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {results.length > 0 && (
                  <button className="btn-download" onClick={downloadCSV}>
                    📥 Download Spreadsheet
                  </button>
                )}
              </div>

              <div className="results-body">
                {results.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">{tool.icon}</div>
                    <p style={{ fontWeight: 600, color: "var(--text-heading)" }}>No results yet</p>
                    <p className="empty-text">
                      Upload a file and click &quot;Extract with PaddleOCR&quot; to begin.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Structured ── */}
                    {activeTab === "structured" && (
                      <div>
                        {results.map((res) => (
                          <div key={res.id} className="result-section">
                            <div className="result-filename">
                              <span>📄 {res.filename}</span>
                              <span className="badge badge-green">{res.document_type}</span>
                            </div>
                            <StructuredView type={type} struct={res.structured_data} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Raw Text ── */}
                    {activeTab === "raw-text" && (
                      <div className="code-viewer">
                        <button className="code-copy-btn" onClick={() => copyText(rawText)}>
                          Copy
                        </button>
                        {rawText || "No text extracted."}
                      </div>
                    )}

                    {/* ── JSON ── */}
                    {activeTab === "json" && (
                      <div className="code-viewer">
                        <button className="code-copy-btn" onClick={() => copyText(rawJson)}>
                          Copy
                        </button>
                        {rawJson}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
