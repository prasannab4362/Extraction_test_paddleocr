"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOOL_META = {
  invoice: {
    name: "Invoice Extractor",
    icon: "🧾",
    desc: "Upload invoices or bills. Extracts vendor, line items, totals, and payment info.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
  },
  business_card: {
    name: "Business Card Reader",
    icon: "📇",
    desc: "Upload business card images. Extracts contact name, company, email, and phone.",
    acceptedFiles: "Images (JPG, PNG, WEBP)",
  },
  table: {
    name: "Table Structure Extractor",
    icon: "📊",
    desc: "Upload documents with tables or grids. Outputs structured rows and headers.",
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
    desc: "Upload any document. Extracts summary, key properties, and structured sections.",
    acceptedFiles: "Images (JPG, PNG, WEBP) or PDF",
  },
};

function renderStructured(activeTile, struct) {
  if (!struct) return null;
  if (struct.error) {
    return (
      <div style={{ color: "var(--accent-red)", padding: "16px", background: "#fef2f2", borderRadius: "var(--radius-md)", border: "1px solid #fecaca" }}>
        ⚠ {struct.error}
      </div>
    );
  }

  const Row = ({ label, value }) => (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-val">{value || "N/A"}</span>
    </div>
  );

  if (activeTile === "invoice") {
    return (
      <div className="meta-grid">
        <div className="meta-card">
          <div className="meta-card-title">Invoice Info</div>
          <Row label="Invoice #" value={struct.invoice_or_bill_number} />
          <Row label="Vendor" value={struct.vendor_name} />
          <Row label="Date" value={struct.date} />
          <Row label="Due Date" value={struct.due_date} />
          <Row label="Subtotal" value={struct.subtotal} />
          <Row label="Tax" value={struct.tax} />
          <Row
            label="Total Amount"
            value={
              struct.total_amount ? (
                <strong style={{ color: "var(--primary-dark)" }}>
                  {struct.currency || ""} {struct.total_amount}
                </strong>
              ) : null
            }
          />
        </div>
        <div className="meta-card">
          <div className="meta-card-title">Customer Info</div>
          <Row label="Customer Name" value={struct.customer_name} />
          <Row label="Address" value={struct.customer_address} />
          <Row label="Vendor Address" value={struct.vendor_address} />
        </div>
        {struct.line_items && struct.line_items.length > 0 && (
          <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
            <div className="meta-card-title">Line Items</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
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

  if (activeTile === "business_card") {
    return (
      <div className="meta-card" style={{ maxWidth: "480px" }}>
        <div className="meta-card-title">Contact Details</div>
        <Row label="Name" value={struct.name} />
        <Row label="Job Title" value={struct.job_title} />
        <Row label="Company" value={struct.company_name} />
        <Row label="Email" value={struct.email} />
        <Row label="Phone" value={struct.phone_number} />
        <Row label="Website" value={struct.website} />
        <Row label="Address" value={struct.address} />
      </div>
    );
  }

  if (activeTile === "aadhaar") {
    return (
      <div className="meta-card" style={{ maxWidth: "480px" }}>
        <div className="meta-card-title">Aadhaar Card Details</div>
        <div className="meta-row" style={{ padding: "12px 0" }}>
          <span className="meta-label">Aadhaar Number</span>
          <span
            className="meta-val"
            style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--primary-dark)" }}
          >
            {struct.aadhaar_number || "N/A"}
          </span>
        </div>
        <Row label="Full Name" value={struct.full_name} />
        <Row label="Date of Birth" value={struct.date_of_birth} />
        <Row label="Gender" value={struct.gender} />
        <Row label="Address" value={struct.address} />
      </div>
    );
  }

  if (activeTile === "pan") {
    return (
      <div className="meta-card" style={{ maxWidth: "480px" }}>
        <div className="meta-card-title">PAN Card Details</div>
        <div className="meta-row" style={{ padding: "12px 0" }}>
          <span className="meta-label">PAN Number</span>
          <span
            className="meta-val"
            style={{ fontFamily: "var(--font-mono)", fontSize: "18px", letterSpacing: "2px", color: "var(--primary-dark)" }}
          >
            {struct.pan_number || "N/A"}
          </span>
        </div>
        <Row label="Full Name" value={struct.full_name} />
        <Row label="Father's Name" value={struct.fathers_name} />
        <Row label="Date of Birth" value={struct.date_of_birth} />
      </div>
    );
  }

  if (activeTile === "table") {
    return (
      <div>
        {struct.tables && struct.tables.length > 0 ? (
          struct.tables.map((t, i) => (
            <div key={i} style={{ marginBottom: "28px" }}>
              {t.table_title && (
                <div style={{ fontWeight: 700, marginBottom: "10px", color: "var(--text-heading)" }}>
                  {t.table_title}
                </div>
              )}
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>{t.headers?.map((h, hi) => <th key={hi}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows?.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No tables found in the document.</p>
        )}
      </div>
    );
  }

  // General
  return (
    <div>
      {struct.summary && (
        <div className="meta-card" style={{ marginBottom: "16px" }}>
          <div className="meta-card-title">Document Summary</div>
          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-body)" }}>{struct.summary}</p>
        </div>
      )}
      <div className="meta-grid">
        {struct.key_metadata && struct.key_metadata.length > 0 && (
          <div className="meta-card">
            <div className="meta-card-title">Key Properties</div>
            {struct.key_metadata.map((m, i) => (
              <Row key={i} label={m.key} value={m.value} />
            ))}
          </div>
        )}
        {struct.structured_sections && struct.structured_sections.length > 0 && (
          <div className="meta-card">
            <div className="meta-card-title">Document Outline</div>
            {struct.structured_sections.map((s, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", color: "var(--text-heading)" }}>
                  {s.heading}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>{s.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExtractorWorkspace() {
  const { type } = useParams();
  const router = useRouter();
  const tool = TOOL_META[type];

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [mode, setMode] = useState("merge");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState("structured");

  if (!tool) {
    return (
      <div className="container section text-center">
        <h2 className="heading-md" style={{ marginBottom: "16px" }}>Tool not found</h2>
        <button className="btn btn-primary" onClick={() => router.push("/extract")}>
          Back to Tools
        </button>
      </div>
    );
  }

  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); };
  const handleDragLeave = (e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files) setSelectedFiles(Array.from(e.dataTransfer.files));
  };

  const runExtraction = async () => {
    if (!selectedFiles.length) return;
    setLoading(true);
    setLoadingStatus("Running PaddleOCR on your document...");
    setResults([]);

    const fd = new FormData();
    selectedFiles.forEach((f) => fd.append("files", f));
    fd.append("mode", mode);
    fd.append("doc_type", type);

    try {
      setLoadingStatus("Calling AI model to structure results...");
      const res = await fetch(`${API_URL}/api/extract`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Extraction failed");
      }
      const data = await res.json();
      setResults(data);
      setActiveTab("structured");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const downloadSpreadsheet = async () => {
    try {
      const res = await fetch(`${API_URL}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_extracted.csv`;
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export error: " + err.message);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  const rawText = results.map((r) => r.raw_text).join("\n\n---\n\n");
  const rawJson = JSON.stringify(results, null, 2);

  return (
    <>
      {/* Tool page header */}
      <section className="page-hero" style={{ padding: "48px 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
            <div style={{ fontSize: "40px" }}>{tool.icon}</div>
            <div style={{ textAlign: "left" }}>
              <h1 className="page-hero-title" style={{ fontSize: "32px", marginBottom: "6px" }}>
                {tool.name}
              </h1>
              <p style={{ color: "#64748b", fontSize: "15px" }}>{tool.desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section className="section" style={{ paddingTop: "40px", background: "var(--bg-muted)" }}>
        <div className="container">
          <div className="workspace-layout">
            {/* LEFT: Upload Panel */}
            <div className="card" style={{ position: "relative" }}>
              {loading && (
                <div className="loading-overlay active">
                  <div className="spinner" />
                  <div className="loading-text">Processing...</div>
                  <div className="loading-sub">{loadingStatus}</div>
                </div>
              )}

              <div className="card-title">
                <span>📤</span> Upload Files
              </div>

              {/* Drop zone */}
              <div
                className="dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input-ws").click()}
              >
                <div className="dropzone-icon">📥</div>
                <div className="dropzone-title">Click or drag files here</div>
                <div className="dropzone-hint">{tool.acceptedFiles}</div>
                <input
                  id="file-input-ws"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                />
              </div>

              {/* File list */}
              {selectedFiles.length > 0 && (
                <div className="file-list" style={{ marginTop: "16px" }}>
                  {selectedFiles.map((f, i) => (
                    <div className="file-item" key={i}>
                      <span className="file-icon">📎</span>
                      <span className="file-name">{f.name}</span>
                      <span className="file-size">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode toggle */}
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
                    ? "🔗 Merge: Treat all uploaded images as one long document (e.g., a multi-page bill)."
                    : "📦 Batch: Process each image as a separate document (e.g., 5 different business cards)."}
                </div>
              </div>

              <button
                className="btn-extract"
                disabled={selectedFiles.length === 0 || loading}
                onClick={runExtraction}
              >
                {loading ? "Processing..." : `Run ${tool.name} →`}
              </button>
            </div>

            {/* RIGHT: Results Panel */}
            <div className="results-card">
              <div className="results-header">
                <div className="tabs-group">
                  {["structured", "raw-text", "json"].map((tab) => (
                    <button
                      key={tab}
                      className={`result-tab ${activeTab === tab ? "active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === "structured" ? "Structured Data" : tab === "raw-text" ? "Raw Text" : "Raw JSON"}
                    </button>
                  ))}
                </div>
                {results.length > 0 && (
                  <button className="btn-download" onClick={downloadSpreadsheet}>
                    📥 Download Spreadsheet
                  </button>
                )}
              </div>

              <div className="results-body">
                {results.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">{tool.icon}</div>
                    <p style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                      No results yet
                    </p>
                    <p className="empty-text">Upload a file and click &quot;Run Extraction&quot; to begin.</p>
                  </div>
                ) : (
                  <>
                    {/* Structured Data Tab */}
                    {activeTab === "structured" && (
                      <div>
                        {results.map((res) => (
                          <div key={res.id} className="result-section">
                            <div className="result-filename">
                              <span>📄 {res.filename}</span>
                              <span className="badge badge-green">{res.document_type}</span>
                            </div>
                            {renderStructured(type, res.structured_data)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw Text Tab */}
                    {activeTab === "raw-text" && (
                      <div className="code-viewer">
                        <button className="code-copy-btn" onClick={() => copyText(rawText)}>Copy</button>
                        {rawText || "No text extracted."}
                      </div>
                    )}

                    {/* JSON Tab */}
                    {activeTab === "json" && (
                      <div className="code-viewer">
                        <button className="code-copy-btn" onClick={() => copyText(rawJson)}>Copy</button>
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
