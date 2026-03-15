import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "阿森蔬果訂購",
  description: "阿森蔬果訂購網頁",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased font-sans text-stone-800">{children}</body>
    </html>
  );
}
