"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, open mail client. Replace with a form service (Formspree, EmailJS, etc.)
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    const subject = encodeURIComponent(form.subject || "Contact from OCR extraction");
    window.open(`mailto:contact@ocrextraction.com?subject=${subject}&body=${body}`);
    setSubmitted(true);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Get in touch</p>
          <h1 className="page-hero-title">Contact Us</h1>
          <p className="page-hero-desc">
            Have a question, feedback, or found a bug? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "60px",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            {/* Left: Info */}
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>
                We&apos;re here to help
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  {
                    icon: "💬",
                    title: "General Inquiries",
                    desc: "Questions about features, use cases, or how the tool works.",
                  },
                  {
                    icon: "🐛",
                    title: "Bug Reports",
                    desc: "Found an issue or an inaccuracy in extraction? Let us know.",
                  },
                  {
                    icon: "🤝",
                    title: "Partnerships",
                    desc: "Interested in integrating our OCR pipeline into your product? Reach out.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      display: "flex",
                      gap: "16px",
                      padding: "20px",
                      background: "var(--bg-muted)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: "24px" }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-heading)", marginBottom: "4px" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <div>
              {submitted ? (
                <div
                  style={{
                    background: "var(--primary-subtle)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "var(--radius-lg)",
                    padding: "48px 32px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-heading)", marginBottom: "8px" }}>
                    Message Opened!
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                    Your email client should have opened. Send the message from there.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: "24px" }}
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">Your Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="form-input"
                      placeholder="Raj Kumar"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="raj@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="subject">Subject</label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      className="form-input"
                      placeholder="Question about invoice extractor"
                      value={form.subject}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      className="form-textarea"
                      placeholder="Tell us what's on your mind..."
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    Send Message →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
