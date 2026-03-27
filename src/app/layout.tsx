import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folio 2026",
  description: "My personal portfolio",
};

const karla = localFont({
  src: [
    {
      path: "../../public/fonts/Karla-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/Karla-Light.ttf",
      weight: "300",
      style: "normal",
    },
  ],
  variable: "--font-karla",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${karla.variable}`}>
        {children}
      </body>
    </html>
  );
}
