import type { Metadata } from "next";
import { Spectral, Caveat } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin", "vietnamese"],   // nên thêm "vietnamese"
  weight: ["400", "600"],             // CHÍNH: thêm weight cần dùng
  variable: "--font-spectral",        // vẫn OK dùng CSS var
});

const caveat = Caveat({
  subsets: ["latin"],   // Caveat có hỗ trợ VI, thêm cho chắc
  weight: ["400"],                    // chọn trọng lượng bạn dùng
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Gốm Nghê – Hoằng pháp Mỵ Châu",
  description: "Vẻ đẹp của Gốm nằm trong sự khiếm khuyết và ngô nghê của nó.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${spectral.variable} ${caveat.variable}`}>
      <body className="min-h-screen body-handmade text-stone-900">
        {children}
      </body>
    </html>
  );
}
