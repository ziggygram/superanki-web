import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuperAnki - The Smartest Way to Learn Anything",
  description:
    "Master any subject with spaced repetition powered by the FSRS algorithm and an AI study coach. Import from Anki, quiz yourself, and organize your knowledge.",
  openGraph: {
    title: "SuperAnki - The Smartest Way to Learn Anything",
    description:
      "Master any subject with spaced repetition powered by the FSRS algorithm and an AI study coach.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
