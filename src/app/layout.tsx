import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vayu | Cloud Infrastructure Management System",
  description:
    "AI-Powered Cloud Infrastructure Digital Twin — Monitor, simulate, and manage global data center operations.",
  keywords: ["cloud infrastructure", "data center", "digital twin", "AI operations"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-text-primary antialiased selection:bg-accent-light selection:text-accent overflow-hidden">
        {children}
      </body>
    </html>
  );
}
