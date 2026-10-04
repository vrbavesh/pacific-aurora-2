import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/src/components/SmoothScrollProvider";
import AuroraBackground from "@/src/components/AuroraBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Pacific Aurora — A Scratchpad for Worlds That Want to Breathe",
  description:
    "A serene, private writing and worldbuilding sanctuary. Draft books, lay out worlds, and trace the people in them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased bg-[#040911] text-[#e8f4f1] selection:bg-accent selection:text-[#040911] overflow-x-hidden min-h-screen`}
      >
        <SmoothScrollProvider />
        {/* Active Theory: Persistent 3D Aurora Canvas across the entire application */}
        <AuroraBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
