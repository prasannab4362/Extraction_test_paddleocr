import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-display", subsets: ["latin"] });

export const metadata = {
  title: {
    default: "OCR extraction — Extract Text from Any Document Free",
    template: "%s | OCR extraction",
  },
  description:
    "Extract structured data from invoices, Aadhaar cards, PAN cards, business cards, tables, and more. Free AI-powered OCR extraction tool. No sign-up required.",
  keywords: [
    "OCR", "document extraction", "invoice extractor", "aadhaar card reader",
    "PAN card extractor", "business card reader", "AI OCR", "free OCR tool", "PaddleOCR"
  ],
  authors: [{ name: "OCR extraction" }],
  openGraph: {
    type: "website",
    title: "OCR extraction — Extract Text from Any Document Free",
    description:
      "AI-powered document extractor. Extract invoices, ID cards, business cards, and more. Free and instant.",
    siteName: "OCR extraction",
  },
  twitter: {
    card: "summary_large_image",
    title: "OCR extraction — Free AI Document Extractor",
    description: "Extract structured data from any document instantly using AI and OCR.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        {/* Google AdSense — Replace ca-pub-XXXXXXXXXX with your publisher ID */}
        {/* 
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          crossOrigin="anonymous"
        />
        */}
      </head>
      <body>
        <Navbar />
        <main style={{ flexGrow: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
