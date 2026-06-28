"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOOL_META = {
  invoice: {
    name: "Invoice Extractor",
    icon: "🧾",
    desc: "Upload invoices or bills. Extracts vendor, line items, tax, and total amount details.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
  },
  business_card: {
    name: "Business Card Reader",
    icon: "📇",
    desc: "Upload business card images. Extracts contact name, job title, company, email, website, and phone.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
  },
  table: {
    name: "Table Structure Extractor",
    icon: "📊",
    desc: "Upload documents containing tables or grids. Outputs detected headers and rows.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
  },
  aadhaar: {
    name: "Aadhaar Card Extractor",
    icon: "🆔",
    desc: "Upload Aadhaar card images. Extracts Aadhaar number, name, DOB, gender, and address.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
  },
  pan: {
    name: "PAN Card Extractor",
    icon: "💳",
    desc: "Upload PAN card images. Extracts PAN number, full name, father's name, and DOB.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
  },
  general: {
    name: "General Document Extractor",
    icon: "📄",
    desc: "Upload any document. Extracts summary, key properties, sections, and structured outline.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
  },
};

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

  const Field = ({ label, value, mono, highlight }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="meta-row">
        <span className="meta-label">{label}</span>
        <span
          className="meta-val"
          style={{
            fontFamily: mono ? "var(--font-mono)" : undefined,
            fontSize: mono ? "15px" : undefined,
            letterSpacing: mono ? "1px" : undefined,
            color: highlight ? "var(--primary-dark)" : undefined,
            fontWeight: highlight ? 800 : undefined,
          }}
        >
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    );
  };

  // ── Aadhaar Card ──
  if (type === "aadhaar") {
    const address = struct.address || {};
    const formattedAddress = typeof address === 'string' 
      ? address 
      : [address.house, address.street, address.locality, address.district, address.state, address.pincode]
          .filter(Boolean)
          .join(", ");

    return (
      <div style={{ maxWidth: "600px" }}>
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
          <Field label="Year of Birth" value={struct.year_of_birth} />
          <Field label="Gender"        value={struct.gender} />
          <Field label="Phone Linked"  value={struct.phone_linked} />
          <Field label="Address"       value={formattedAddress} />
          <Field label="VID"           value={struct.vid} mono />
        </div>
      </div>
    );
  }

  // ── PAN Card ──
  if (type === "pan") {
    return (
      <div style={{ maxWidth: "600px" }}>
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
          <Field label="Full Name"         value={struct.full_name} />
          <Field label="Father's Name"     value={struct.fathers_name} />
          <Field label="Date of Birth"     value={struct.date_of_birth} />
          <Field label="Issuing Authority" value={struct.issuing_authority} />
          <Field label="Signature Present" value={struct.signature_present !== null ? (struct.signature_present ? "Yes" : "No") : null} />
        </div>
      </div>
    );
  }

  // ── Business Card ──
  if (type === "business_card") {
    return (
      <div style={{ maxWidth: "600px" }}>
        <div className="meta-card">
          <div className="meta-card-title">📇 Contact Details</div>
          <Field label="Name"            value={struct.full_name || struct.name} />
          <Field label="Job Title"        value={struct.job_title} />
          <Field label="Department"       value={struct.department} />
          <Field label="Company Name"     value={struct.company_name} />
          <Field label="Email"            value={struct.email} />
          <Field label="Primary Phone"    value={struct.phone_primary || struct.phone_number} />
          <Field label="Secondary Phone"  value={struct.phone_secondary} />
          <Field label="Website"          value={struct.website} />
          <Field label="Address"          value={struct.address} />
          <Field label="LinkedIn"         value={struct.linkedin} />
          <Field label="Other Social"     value={struct.other_social} />
        </div>
      </div>
    );
  }

  // ── Invoice / Bill ──
  if (type === "invoice") {
    return (
      <div>
        <div className="meta-grid">
          <div className="meta-card">
            <div className="meta-card-title">🧾 Invoice Details</div>
            <Field label="Document Type"   value={struct.document_type} />
            <Field label="Invoice Number"  value={struct.invoice_number} mono />
            <Field label="Invoice Date"    value={struct.date} />
            <Field label="Due Date"        value={struct.due_date} />
            <Field label="Payment Terms"   value={struct.payment_terms} />
            <Field label="Currency"        value={struct.currency} />
          </div>
          <div className="meta-card">
            <div className="meta-card-title">🏢 Vendor & Customer</div>
            <Field label="Vendor Name"     value={struct.vendor_name} />
            <Field label="Vendor Address"  value={struct.vendor_address} />
            <Field label="Vendor GSTIN"    value={struct.vendor_gstin} mono />
            <Field label="Customer Name"   value={struct.customer_name} />
            <Field label="Customer Address" value={struct.customer_address} />
            <Field label="Customer GSTIN"  value={struct.customer_gstin} mono />
          </div>
          <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
            <div className="meta-card-title">💰 Summary & Totals</div>
            <div className="meta-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "10px" }}>
              <div>
                <Field label="Subtotal"        value={struct.subtotal} />
                <Field label="Discount"        value={struct.discount} />
              </div>
              <div>
                <Field label="Tax Percentage"  value={struct.tax_percentage} />
                <Field label="Tax Amount"      value={struct.tax_amount} />
                <Field label="Total Amount"    value={struct.total_amount} highlight />
              </div>
            </div>
            <Field label="Amount in Words" value={struct.amount_in_words} />
            <Field label="Bank Details"    value={struct.bank_details} />
            <Field label="Notes"           value={struct.notes} />
          </div>
        </div>

        {struct.line_items && struct.line_items.length > 0 && (
          <div className="meta-card" style={{ marginTop: "16px" }}>
            <div className="meta-card-title">📦 Line Items</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {struct.line_items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description || "—"}</td>
                      <td>{item.quantity || "—"}</td>
                      <td>{item.unit_price || "—"}</td>
                      <td>{item.total_price || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Table Structure ──
  if (type === "table") {
    return (
      <div>
        {struct.tables && struct.tables.length > 0 ? (
          struct.tables.map((t, idx) => (
            <div key={idx} className="meta-card" style={{ marginBottom: "20px" }}>
              <div className="meta-card-title">
                📊 Table {t.table_index || idx + 1} {t.table_title ? `— ${t.table_title}` : ''}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  {t.headers && t.headers.length > 0 && (
                    <thead>
                      <tr>
                        {t.headers.map((h, i) => <th key={i}>{h}</th>)}
                      </tr>
                    </thead>
                  )}
                  {t.rows && t.rows.length > 0 && (
                    <tbody>
                      {t.rows.map((row, ri) => (
                        <tr key={ri}>
                          {Array.isArray(row) ? row.map((cell, ci) => <td key={ci}>{cell}</td>) : <td>{String(row)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No clear tables detected.</div>
        )}
        <Field label="Summary" value={struct.summary} />
      </div>
    );
  }

  // ── General Document ──
  return (
    <div>
      <div className="meta-grid">
        <div className="meta-card">
          <div className="meta-card-title">📄 Document Overview</div>
          <Field label="Document Type"       value={struct.document_type} />
          <Field label="Document Title"      value={struct.document_title} />
          <Field label="Issuing Authority"   value={struct.issuing_authority} />
          <Field label="Date"                value={struct.date} />
          <Field label="Reference Number"    value={struct.reference_number} mono />
          <Field label="Action Required"     value={struct.action_required} />
        </div>

        {struct.summary && (
          <div className="meta-card">
            <div className="meta-card-title">📝 Summary</div>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-body)" }}>{struct.summary}</p>
          </div>
        )}
      </div>

      {struct.key_fields && struct.key_fields.length > 0 && (
        <div className="meta-card" style={{ marginTop: "16px" }}>
          <div className="meta-card-title">📌 Key Properties</div>
          {struct.key_fields.map((kf, i) => (
            <Field key={i} label={kf.label} value={kf.value} />
          ))}
        </div>
      )}

      {struct.sections && struct.sections.length > 0 && (
        <div className="meta-card" style={{ marginTop: "16px" }}>
          <div className="meta-card-title">📑 Document Outline</div>
          {struct.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "14px", borderBottom: i < struct.sections.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", paddingBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", color: "var(--text-heading)" }}>
                {s.heading}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-body)", lineHeight: "1.6" }}>{s.content}</div>
            </div>
          ))}
        </div>
      )}

      {struct.important_numbers && struct.important_numbers.length > 0 && (
        <div className="meta-card" style={{ marginTop: "16px" }}>
          <div className="meta-card-title">🔢 Important Numbers</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {struct.important_numbers.map((num, i) => (
              <span key={i} className="badge badge-gray" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OCRLines({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        color: "var(--text-muted)",
        marginBottom: "10px",
      }}>
        Detected OCR Lines ({lines.length})
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

  const addFiles = (fileList) => setSelectedFiles(prev => [...prev, ...Array.from(fileList)]);

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
      setLoadingMsg("Structuring extracted data with Groq Llama 3...");
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

      <section style={{ background: "var(--bg-muted)", padding: "36px 0 60px" }}>
        <div className="container">
          <div className="workspace-layout">

            {/* LEFT PANEL */}
            <div className="card" style={{ position: "relative" }}>
              {loading && (
                <div className="loading-overlay active">
                  <div className="spinner" />
                  <div className="loading-text">Processing…</div>
                  <div className="loading-sub">{loadingMsg}</div>
                </div>
              )}

              <div className="card-title"><span>📤</span> Upload Files</div>

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
                {loading ? "Processing…" : `Extract with PaddleOCR + Groq →`}
              </button>
            </div>

            {/* RIGHT PANEL */}
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
                      Upload a file and click &quot;Extract with PaddleOCR + Groq&quot; to begin.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeTab === "structured" && (
                      <div>
                        {results.map((res) => (
                          <div key={res.id} className="result-section">
                            <div className="result-filename">
                              <span>📄 {res.filename}</span>
                              <span className="badge badge-green">{res.document_type}</span>
                            </div>
                            <StructuredView type={type} struct={res.structured_data} />
                            {res.structured_data && res.structured_data.all_text_lines && (
                              <OCRLines lines={res.structured_data.all_text_lines} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "raw-text" && (
                      <div className="code-viewer">
                        <button className="code-copy-btn" onClick={() => copyText(rawText)}>
                          Copy
                        </button>
                        {rawText || "No text extracted."}
                      </div>
                    )}

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
