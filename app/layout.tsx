import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono, Bangers } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const comic = Bangers({
  subsets: ["latin"],
  variable: "--font-comic",
  weight: "400",
});

export const metadata: Metadata = {
  title: "cultbid.in",
  description: "The rankings only move when the money does.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} ${comic.variable}`}
    >
      <body className="bg-void text-white font-body antialiased selection:bg-neon/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
