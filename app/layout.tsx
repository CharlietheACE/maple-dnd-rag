import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "艾尔达百科",
    template: "%s | 艾尔达百科",
  },
  description: "一部以《艾尔达之书》为唯一知识来源、答案可追溯的中文设定百科。",
  applicationName: "艾尔达百科",
  keywords: ["艾尔达之书", "Erda Book", "D&D 5e", "设定百科", "RAG"],
  authors: [{ name: "Erda Book" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "艾尔达百科",
    title: "艾尔达百科 · 有据可循的冒险知识",
    description: "查阅《艾尔达之书》，让每个答案都回到原始篇章。",
  },
  twitter: {
    card: "summary",
    title: "艾尔达百科",
    description: "查阅《艾尔达之书》，让每个答案都回到原始篇章。",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#111c2b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
