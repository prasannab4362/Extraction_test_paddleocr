export const metadata = {
  title: "Privacy Policy",
  description:
    "OCR extraction privacy policy — how we handle uploaded documents, data processing, cookies, and your rights.",
};

export default function PrivacyPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1 className="page-hero-title">Privacy Policy</h1>
          <p className="page-hero-desc">
            Last updated: June 2025
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="prose">
            <h2>1. Introduction</h2>
            <p>
              Welcome to OCR extraction (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). This Privacy Policy explains how we handle
              information when you use our document extraction service at this website.
            </p>

            <h2>2. Information We Do NOT Collect</h2>
            <p>
              We are committed to your privacy. We do <strong>not</strong>:
            </p>
            <ul>
              <li>Store or retain any files you upload</li>
              <li>Save extracted text or structured data on our servers</li>
              <li>Require account registration or collect personal information</li>
              <li>Sell, rent, or share any data with third parties</li>
              <li>Track individual users across sessions</li>
            </ul>

            <h2>3. Document Processing</h2>
            <p>
              When you upload a document:
            </p>
            <ul>
              <li>Your file is transmitted securely to our processing server via HTTPS.</li>
              <li>The file is processed in memory using PaddleOCR and an AI language model.</li>
              <li>The file is <strong>deleted from memory</strong> immediately after processing.</li>
              <li>Extracted results are returned to your browser and never logged or stored.</li>
            </ul>
            <p>
              We strongly recommend that you do not upload documents containing sensitive personal
              data beyond what is required for extraction. Use with care for Aadhaar and PAN documents.
            </p>

            <h2>4. Third-Party AI Services</h2>
            <p>
              OCR text extraction is performed using <strong>PaddleOCR</strong> (running on our server).
              AI structuring is performed using the <strong>Google Gemini API</strong> (gemini-2.5-flash-lite model).
              When text is sent to Gemini for structuring, it is subject to{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                Google's Privacy Policy
              </a>.
              Google does not use this data for model training.
            </p>

            <h2>5. Analytics</h2>
            <p>
              We may use anonymized, aggregated analytics (such as page views and tool usage counts)
              to improve the service. No personally identifiable information is collected in analytics.
            </p>

            <h2>6. Advertising</h2>
            <p>
              This website may display advertisements served by Google AdSense or similar networks.
              These services may use cookies to serve personalized ads. You may opt out of
              personalized advertising via{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                Google Ad Settings
              </a>.
            </p>

            <h2>7. Cookies</h2>
            <p>
              Our website itself does not set cookies. However, third-party services (such as Google AdSense
              or analytics providers) may set cookies on your device. You can disable cookies in your browser
              settings.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              Our service is not directed at children under 13. We do not knowingly collect information
              from children.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be reflected on this
              page with an updated date.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please use our{" "}
              <a href="/contact" style={{ color: "var(--primary)" }}>Contact page</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
