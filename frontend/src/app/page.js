"use client";

import React, { useState } from "react";

export default function Home() {
  const [activeTile, setActiveTile] = useState(null); // null means show grid, otherwise show specific upload
  const [activeTab, setActiveTab] = useState("structured");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentMode, setCurrentMode] = useState("merge");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Queued");
  const [results, setResults] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const runExtraction = async () => {
    setLoading(true);
    setLoadingStatus("Running PaddleOCR on pages...");

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("mode", currentMode);
    formData.append("doc_type", activeTile);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Extraction failed");
      }

      setLoadingStatus("Formatting results...");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      alert("Error during extraction: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  const resetWorkspace = () => {
    setActiveTile(null);
    setSelectedFiles([]);
    setResults([]);
    setActiveTab("structured");
  };

  // Extraction Cards metadata
  const tiles = [
    { id: "invoice", name: "Invoice Extractor", icon: "🧾", desc: "Extract totals, vendor details, tax, and line items." },
    { id: "business_card", name: "Business Card Reader", icon: "📇", desc: "Extract contact info, email, company, and address." },
    { id: "table", name: "Table Structure Extractor", icon: "📊", desc: "Extract grids and tabular structure documents." },
    { id: "aadhaar", name: "Aadhaar Card Extractor", icon: "🆔", desc: "Extract Aadhaar number, name, DOB, and gender." },
    { id: "pan", name: "PAN Card Extractor", icon: "💳", desc: "Extract PAN number, full name, and father's name." },
    { id: "general", name: "General Document Extractor", icon: "📄", desc: "Extract unstructured articles, text sheets, and summaries." }
  ];

  return (
    <>
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="brand" onClick={resetWorkspace} style={{ cursor: "pointer" }}>
          <div className="brand-logo">O</div>
          <div className="brand-name">OCR extraction</div>
        </div>
        <ul className="nav-list">
          <li className="nav-item active" onClick={resetWorkspace}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </li>
        </ul>
      </div>

      {/* Main Workspace Content */}
      <div className="workspace">
        <div className="header">
          <div className="header-title">
            {activeTile 
              ? `${tiles.find(t => t.id === activeTile)?.name}` 
              : "Dashboard"}
          </div>
          {activeTile && (
            <button 
              onClick={resetWorkspace}
              style={{
                background: "transparent",
                border: "1px solid var(--primary)",
                color: "var(--primary)",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px"
              }}
            >
              ← Back to Options
            </button>
          )}
        </div>

        <div className="main-content">
          
          {/* Main Grid View */}
          {!activeTile && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
              {tiles.map((tile) => (
                <div 
                  key={tile.id} 
                  className="card" 
                  onClick={() => setActiveTile(tile.id)}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    height: "100%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(16, 185, 129, 0.1)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.03)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <div style={{ fontSize: "36px" }}>{tile.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-main)", fontFamily: "var(--font-display)" }}>
                    {tile.name}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    {tile.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload & Result Panel */}
          {activeTile && (
            <div className="panel active">
              <div className="dashboard-grid">
                {/* Left column: Upload Card */}
                <div className="card" style={{ height: "fit-content" }}>
                  {loading && (
                    <div className="loading-overlay active">
                      <div className="spinner"></div>
                      <div style={{ fontWeight: 600 }}>Processing PaddleOCR & Groq LLM...</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{loadingStatus}</div>
                    </div>
                  )}

                  <div
                    className="dropzone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input").click()}
                  >
                    <div className="dropzone-icon">📥</div>
                    <div className="dropzone-title">Upload files here</div>
                    <div className="dropzone-muted">Drag and drop images or PDFs</div>
                    <input
                      type="file"
                      id="file-input"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div style={{ marginTop: "16px", fontSize: "13px", color: "var(--text-muted)" }}>
                      <strong>Selected files ({selectedFiles.length}):</strong>
                      <br />
                      {selectedFiles.map((f) => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`).join("<br>")}
                    </div>
                  )}

                  <div className="mode-container">
                    <div>
                      <div className="mode-label">Document Queue Mode</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Merge pages vs separate documents
                      </div>
                    </div>
                    <div
                      className={`toggle-switch ${currentMode === "batch" ? "batch" : ""}`}
                      onClick={() => setCurrentMode(currentMode === "merge" ? "batch" : "merge")}
                    >
                      <div className="toggle-slider"></div>
                      <div className="toggle-options">
                        <div className={`toggle-option ${currentMode === "merge" ? "active" : ""}`}>Merge Pages</div>
                        <div className={`toggle-option ${currentMode === "batch" ? "active" : ""}`}>Batch Mode</div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-extract"
                    disabled={selectedFiles.length === 0 || loading}
                    onClick={runExtraction}
                  >
                    Run Extraction
                  </button>
                </div>

                {/* Right column: Results Viewer */}
                <div className="results-container">
                  <div className="tabs">
                    <div
                      className={`tab ${activeTab === "structured" ? "active" : ""}`}
                      onClick={() => setActiveTab("structured")}
                    >
                      Structured Data
                    </div>
                    <div
                      className={`tab ${activeTab === "raw-text" ? "active" : ""}`}
                      onClick={() => setActiveTab("raw-text")}
                    >
                      Raw Text
                    </div>
                    <div
                      className={`tab ${activeTab === "json" ? "active" : ""}`}
                      onClick={() => setActiveTab("json")}
                    >
                      Raw JSON
                    </div>
                  </div>

                  {/* Tab: Structured Data */}
                  <div className={`tab-content ${activeTab === "structured" ? "active" : ""}`}>
                    {results.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "100px" }}>
                        Run extraction on a document to visualize structured results.
                      </div>
                    ) : (
                      <div>
                        {results.map((res) => {
                          const struct = res.structured_data;
                          const docType = res.document_type || activeTile;

                          return (
                            <div key={res.id} style={{ marginBottom: "24px" }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "15px",
                                  marginBottom: "12px",
                                  color: "var(--text-main)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>File: {res.filename}</span>
                                <span className="badge badge-type">{docType}</span>
                              </div>
                              
                              <div className="structured-grid">
                                
                                {/* Invoice / Bill Schema View */}
                                {activeTile === "invoice" && (
                                  <>
                                    <div className="meta-card">
                                      <div className="meta-title">Invoice Details</div>
                                      <div className="meta-row"><span class="meta-label">Vendor:</span><span class="meta-val">{struct.vendor_name || "N/A"}</span></div>
                                      <div className="meta-row"><span class="meta-label">Number:</span><span class="meta-val">{struct.invoice_or_bill_number || "N/A"}</span></div>
                                      <div className="meta-row"><span class="meta-label">Date:</span><span class="meta-val">{struct.date || "N/A"}</span></div>
                                      <div className="meta-row"><span class="meta-label">Due Date:</span><span class="meta-val">{struct.due_date || "N/A"}</span></div>
                                      <div className="meta-row" style={{ fontWeight: 700, color: "var(--secondary)" }}>
                                        <span class="meta-label" style={{ color: "var(--secondary)" }}>Total Amount:</span>
                                        <span class="meta-val">{struct.total_amount || "N/A"}</span>
                                      </div>
                                    </div>
                                    <div className="meta-card">
                                      <div className="meta-title">Customer Info</div>
                                      <div className="meta-row"><span class="meta-label">Name:</span><span class="meta-val">{struct.customer_name || "N/A"}</span></div>
                                      <div className="meta-row"><span class="meta-label">Address:</span><span class="meta-val" style={{ textAlign: "right", maxWidth: "150px" }}>{struct.customer_address || "N/A"}</span></div>
                                    </div>
                                  </>
                                )}

                                {/* Business Card Schema View */}
                                {activeTile === "business_card" && (
                                  <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
                                    <div className="meta-title">Contact Card</div>
                                    <div className="meta-row"><span class="meta-label">Name:</span><span class="meta-val">{struct.name || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Job Title:</span><span class="meta-val">{struct.job_title || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Company:</span><span class="meta-val">{struct.company_name || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Email:</span><span class="meta-val">{struct.email || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Phone:</span><span class="meta-val">{struct.phone_number || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Website:</span><span class="meta-val">{struct.website || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Address:</span><span class="meta-val">{struct.address || "N/A"}</span></div>
                                  </div>
                                )}

                                {/* Aadhaar Card Schema View */}
                                {activeTile === "aadhaar" && (
                                  <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
                                    <div className="meta-title">Aadhaar Card details</div>
                                    <div className="meta-row" style={{ fontSize: "16px", fontWeight: "700" }}>
                                      <span class="meta-label">Aadhaar Number:</span>
                                      <span class="meta-val" style={{ color: "var(--secondary)" }}>{struct.aadhaar_number || "N/A"}</span>
                                    </div>
                                    <div className="meta-row"><span class="meta-label">Full Name:</span><span class="meta-val">{struct.full_name || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Date of Birth:</span><span class="meta-val">{struct.date_of_birth || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Gender:</span><span class="meta-val">{struct.gender || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Address:</span><span class="meta-val">{struct.address || "N/A"}</span></div>
                                  </div>
                                )}

                                {/* PAN Card Schema View */}
                                {activeTile === "pan" && (
                                  <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
                                    <div className="meta-title">PAN Card details</div>
                                    <div className="meta-row" style={{ fontSize: "16px", fontWeight: "700" }}>
                                      <span class="meta-label">PAN Number:</span>
                                      <span class="meta-val" style={{ color: "var(--secondary)" }}>{struct.pan_number || "N/A"}</span>
                                    </div>
                                    <div className="meta-row"><span class="meta-label">Full Name:</span><span class="meta-val">{struct.full_name || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Father's Name:</span><span class="meta-val">{struct.fathers_name || "N/A"}</span></div>
                                    <div className="meta-row"><span class="meta-label">Date of Birth:</span><span class="meta-val">{struct.date_of_birth || "N/A"}</span></div>
                                  </div>
                                )}

                                {/* Tables Schema View */}
                                {activeTile === "table" && (
                                  <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
                                    <div className="meta-title">Table Datasets</div>
                                    {struct.tables && struct.tables.map((table, tIdx) => (
                                      <div key={tIdx} style={{ marginBottom: "20px" }}>
                                        {table.table_title && <div style={{ fontWeight: 600, marginBottom: "8px" }}>{table.table_title}</div>}
                                        <div className="table-container">
                                          <table className="data-table">
                                            <thead>
                                              <tr>
                                                {table.headers && table.headers.map((h, hIdx) => <th key={hIdx}>{h}</th>)}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {table.rows && table.rows.map((row, rIdx) => (
                                                <tr key={rIdx}>
                                                  {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* General / Unstructured Schema View */}
                                {activeTile === "general" && (
                                  <>
                                    <div className="meta-card" style={{ gridColumn: "1 / -1" }}>
                                      <div className="meta-title">Document Summary</div>
                                      <div style={{ lineHeight: "1.6", color: "var(--text-main)" }}>
                                        {struct.summary || "No summary provided."}
                                      </div>
                                    </div>
                                    <div className="meta-card">
                                      <div className="meta-title">Key Properties</div>
                                      {struct.key_metadata && struct.key_metadata.map((meta, mIdx) => (
                                        <div key={mIdx} className="meta-row">
                                          <span class="meta-label">{meta.key || "Property"}:</span>
                                          <span class="meta-val">{meta.value || "N/A"}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="meta-card">
                                      <div className="meta-title">Document Outline</div>
                                      {struct.structured_sections && struct.structured_sections.map((sect, sIdx) => (
                                        <div key={sIdx} style={{ marginBottom: "12px" }}>
                                          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{sect.heading}</div>
                                          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{sect.text}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tab: Raw Text */}
                  <div className={`tab-content ${activeTab === "raw-text" ? "active" : ""}`}>
                    <div className="text-viewer" id="raw-text-viewer">
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(results.map((r) => r.raw_text).join("\n\n"))}
                      >
                        Copy
                      </button>
                      <span>
                        {results.length === 0
                          ? "No data extracted yet."
                          : results.map((r) => r.raw_text).join("\n\n")}
                      </span>
                    </div>
                  </div>

                  {/* Tab: JSON */}
                  <div className={`tab-content ${activeTab === "json" ? "active" : ""}`}>
                    <div className="text-viewer" id="json-viewer">
                      <button className="copy-btn" onClick={() => copyToClipboard(JSON.stringify(results, null, 2))}>
                        Copy
                      </button>
                      <span>
                        {results.length === 0 ? "No data extracted yet." : JSON.stringify(results, null, 2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
