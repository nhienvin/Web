import type { Metadata } from "next";
import { Spectral, Caveat } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-spectral",
});

const caveat = Caveat({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Gốm Nghệ – Hành trình Gốm Việt",
  description: "Bản đồ cảm xúc & tri thức của gốm Việt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${spectral.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-stone-100 text-stone-900">
        {children}
      </body>
    </html>
  );
}
