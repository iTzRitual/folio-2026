import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folio 2026",
  description: "My personal portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
