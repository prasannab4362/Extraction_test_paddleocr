export default function sitemap() {
  const baseUrl = "https://ocrextraction.vercel.app";

  const tools = [
    "invoice",
    "business_card",
    "table",
    "aadhaar",
    "pan",
    "general",
  ];

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/extract`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const toolRoutes = tools.map((t) => ({
    url: `${baseUrl}/extract/${t}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...toolRoutes];
}
