"use client";

import React, { useState, useEffect } from "react";

export default function Home() {
  const [activePanel, setActivePanel] = useState("extractor");
  const [activeTab, setActiveTab] = useState("structured");
  const [groqKey, setGroqKey] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentMode, setCurrentMode] = useState("merge");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Queued");
  const [results, setResults] = useState([]);
  const [documentsDatabase, setDocumentsDatabase] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Initialize and load saved state from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("groq_api_key");
    if (savedKey) {
      setGroqKey(savedKey);
    }
    loadDocumentsFromDb();
  }, []);

  const handleApiKeyChange = (e) => {
    const key = e.target.value.trim();
    setGroqKey(key);
    localStorage.setItem("groq_api_key", key);
  };

  const loadDocumentsFromDb = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocumentsDatabase(data);
      }
    } catch (err) {
      console.error("Failed to load documents from database:", err);
    }
  };

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
    if (!groqKey) {
      alert("Please enter your Groq API Key in the sidebar first!");
      return;
    }

    setLoading(true);
    setLoadingStatus("Running PaddleOCR on pages...");

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("mode", currentMode);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/extract", {
        method: "POST",
        headers: {
          "X-Groq-API-Key": groqKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Extraction failed");
      }

      setLoadingStatus("Formatting results...");
      const data = await response.json();
      setResults(data);
      loadDocumentsFromDb(); // Refresh the databases
    } catch (err) {
      alert("Error during extraction: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDoc = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        loadDocumentsFromDb();
      }
    } catch (err) {
      alert("Failed to delete document: " + err.message);
    }
  };

  const checkExpiry = (expiryDateStr) => {
    if (!expiryDateStr || expiryDateStr === "N/A" || expiryDateStr.toLowerCase() === "lifetime") return false;
    try {
      const expiryDate = new Date(expiryDateStr);
      if (isNaN(expiryDate.getTime())) return false;
      return expiryDate < new Date();
    } catch {
      return false;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  // Filtered lists for trackers
  const filteredInvoices = documentsDatabase
    .filter((d) => d.document_type.toLowerCase() === "invoice" || d.document_type.toLowerCase() === "bill")
    .filter((d) => {
      const s = invoiceSearch.toLowerCase();
      const struct = d.structured_data;
      return (
        (struct.vendor_name || "").toLowerCase().includes(s) ||
        (struct.invoice_or_bill_number || "").toLowerCase().includes(s) ||
        (struct.date || "").toLowerCase().includes(s)
      );
    });

  const filteredWarranties = documentsDatabase
    .filter((d) => d.document_type.toLowerCase() === "warranty")
    .filter((d) => {
      const s = warrantySearch.toLowerCase();
      const struct = d.structured_data;
      return (
        (struct.product_name || "").toLowerCase().includes(s) ||
        (struct.provider_name || "").toLowerCase().includes(s) ||
        (struct.serial_number || "").toLowerCase().includes(s)
      );
    });

  return (
    <>
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="brand">
          <div className="brand-logo">D</div>
          <div className="brand-name">DocuMind</div>
        </div>
        <ul className="nav-list">
          <li
            className={`nav-item ${activePanel === "extractor" ? "active" : ""}`}
            onClick={() => setActivePanel("extractor")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Document Extractor
          </li>
          <li
            className={`nav-item ${activePanel === "invoice-tracker" ? "active" : ""}`}
            onClick={() => setActivePanel("invoice-tracker")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            Invoice Tracker
          </li>
          <li
            className={`nav-item ${activePanel === "warranty-tracker" ? "active" : ""}`}
            onClick={() => setActivePanel("warranty-tracker")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Warranty Tracker
          </li>
        </ul>
        <div className="settings-section">
          <div className="settings-label">Groq API Key</div>
          <input
            type="password"
            className="api-input"
            placeholder="gsk_..."
            value={groqKey}
            onChange={handleApiKeyChange}
          />
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="workspace">
        <div className="header">
          <div className="header-title">
            {activePanel === "extractor"
              ? "Document Extractor"
              : activePanel === "invoice-tracker"
              ? "Invoice & Bill Tracker"
              : "Warranty Tracker"}
          </div>
        </div>

        <div className="main-content">
          {/* PANEL: Extractor */}
          {activePanel === "extractor" && (
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
                    <div className="dropzone-title">Drag & drop files here</div>
                    <div className="dropzone-muted">Supports invoices, bills, and warranties (Images or PDFs)</div>
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
                        Merge split pages vs separate documents
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
                          const docType = struct.document_type || "Unknown";

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
                                {(docType.toLowerCase() === "invoice" || docType.toLowerCase() === "bill") && (
                                  <>
                                    <div className="meta-card">
                                      <div className="meta-title">Invoice / Billing Info</div>
                                      <div className="meta-row">
                                        <span className="meta-label">Vendor:</span>
                                        <span className="meta-val">{struct.vendor_name || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Number:</span>
                                        <span className="meta-val">{struct.invoice_or_bill_number || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Date:</span>
                                        <span className="meta-val">{struct.date || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Due Date:</span>
                                        <span className="meta-val">{struct.due_date || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Currency:</span>
                                        <span className="meta-val">{struct.currency || "N/A"}</span>
                                      </div>
                                      <div className="meta-row" style={{ fontWeight: 700, color: "var(--secondary)" }}>
                                        <span className="meta-label" style={{ color: "var(--secondary)" }}>
                                          Total Amount:
                                        </span>
                                        <span className="meta-val">{struct.total_amount || "N/A"}</span>
                                      </div>
                                    </div>
                                    <div className="meta-card">
                                      <div className="meta-title">Customer Info</div>
                                      <div className="meta-row">
                                        <span className="meta-label">Client Name:</span>
                                        <span className="meta-val">{struct.customer_name || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Address:</span>
                                        <span
                                          className="meta-val"
                                          style={{ textAlign: "right", maxWidth: "150px", overflowWrap: "break-word" }}
                                        >
                                          {struct.customer_address || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                                {docType.toLowerCase() === "warranty" && (
                                  <>
                                    <div className="meta-card">
                                      <div className="meta-title">Warranty Coverage</div>
                                      <div className="meta-row">
                                        <span className="meta-label">Product Name:</span>
                                        <span className="meta-val">{struct.product_name || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Brand / Provider:</span>
                                        <span className="meta-val">{struct.provider_name || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Model No:</span>
                                        <span className="meta-val">{struct.model_number || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Serial No:</span>
                                        <span className="meta-val">{struct.serial_number || "N/A"}</span>
                                      </div>
                                    </div>
                                    <div className="meta-card">
                                      <div className="meta-title">Timeline</div>
                                      <div className="meta-row">
                                        <span className="meta-label">Purchase Date:</span>
                                        <span className="meta-val">{struct.purchase_date || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Duration:</span>
                                        <span className="meta-val">{struct.warranty_period || "N/A"}</span>
                                      </div>
                                      <div className="meta-row">
                                        <span className="meta-label">Expires On:</span>
                                        <span className="meta-val">{struct.warranty_expiry_date || "N/A"}</span>
                                      </div>
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

          {/* PANEL: Invoice Tracker */}
          {activePanel === "invoice-tracker" && (
            <div className="panel active">
              <div className="tracker-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by vendor, date, or billing info..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Vendor</th>
                      <th>Billing Date</th>
                      <th>Due Date</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((doc) => {
                      const struct = doc.structured_data;
                      return (
                        <tr key={doc.id}>
                          <td style={{ fontWeight: 600, color: "var(--secondary)" }}>
                            {struct.invoice_or_bill_number || "N/A"}
                          </td>
                          <td>{struct.vendor_name || "N/A"}</td>
                          <td>{struct.date || "N/A"}</td>
                          <td>{struct.due_date || "N/A"}</td>
                          <td style={{ fontWeight: 600 }}>{struct.total_amount || "N/A"}</td>
                          <td>
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              style={{
                                background: "var(--primary)",
                                border: "none",
                                color: "#fff",
                                padding: "6px 12px",
                                border-radius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                                marginRight: "8px",
                              }}
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => deleteDoc(doc.id)}
                              style={{
                                background: "transparent",
                                border: "1px solid var(--accent-red)",
                                color: "var(--accent-red)",
                                padding: "5px 12px",
                                border-radius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL: Warranty Tracker */}
          {activePanel === "warranty-tracker" && (
            <div className="panel active">
              <div className="tracker-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by product, provider, or serial number..."
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                />
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Provider / Brand</th>
                      <th>Purchase Date</th>
                      <th>Warranty Period</th>
                      <th>Expiry Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarranties.map((doc) => {
                      const struct = doc.structured_data;
                      const isExpired = checkExpiry(struct.warranty_expiry_date);

                      return (
                        <tr key={doc.id}>
                          <td style={{ fontWeight: 600, color: "var(--secondary)" }}>
                            {struct.product_name || "N/A"}
                          </td>
                          <td>{struct.provider_name || "N/A"}</td>
                          <td>{struct.purchase_date || "N/A"}</td>
                          <td>{struct.warranty_period || "N/A"}</td>
                          <td>
                            {isExpired ? (
                              <span className="badge badge-expired">Expired</span>
                            ) : (
                              <span className="badge badge-active">Active</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              style={{
                                background: "var(--primary)",
                                border: "none",
                                color: "#fff",
                                padding: "6px 12px",
                                border-radius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                                marginRight: "8px",
                              }}
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => deleteDoc(doc.id)}
                              style={{
                                background: "transparent",
                                border: "1px solid var(--accent-red)",
                                color: "var(--accent-red)",
                                padding: "5px 12px",
                                border-radius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT DETAILS MODAL */}
      {selectedDoc && (
        <div className="modal active">
          <div className="modal-content">
            <span className="modal-close" onClick={() => setSelectedDoc(null)}>
              &times;
            </span>
            <h2 style={{ marginBottom: "24px", fontFamily: "var(--font-display)" }}>
              Document Details - {selectedDoc.filename}
            </h2>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                <div
                  className="meta-card"
                  style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <strong>Document Type:</strong>{" "}
                    <span className="badge badge-type">{selectedDoc.document_type}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    <strong>Processed On:</strong> {new Date(selectedDoc.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: "12px" }}>Full Extracted JSON Data:</div>
              <div className="text-viewer" id="modal-json-view" style={{ maxHeight: "350px" }}>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(JSON.stringify(selectedDoc.structured_data, null, 2))}
                >
                  Copy
                </button>
                <span>{JSON.stringify(selectedDoc.structured_data, null, 2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
