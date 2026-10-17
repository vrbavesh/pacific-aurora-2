import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("pacific_aurora_theme");if(t==="light"){document.documentElement.dataset.theme="light";document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light"}else{document.documentElement.style.colorScheme="dark"}}catch(e){document.documentElement.style.colorScheme="dark"}` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased bg-background text-foreground overflow-x-hidden min-h-screen`}
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
