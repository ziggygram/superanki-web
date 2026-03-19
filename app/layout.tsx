import type { Metadata } from "next";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperAnki - The Smartest Way to Learn Anything",
  description: "Spaced repetition powered by FSRS, AI study coach, and full Anki compatibility. Import your decks, study smarter, master any subject.",
  openGraph: {
    title: "SuperAnki - The Smartest Way to Learn Anything",
    description: "Spaced repetition powered by FSRS, AI study coach, and full Anki compatibility.",
    url: "https://superanki.app",
    siteName: "SuperAnki",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperAnki - The Smartest Way to Learn Anything",
    description: "Spaced repetition powered by FSRS, AI study coach, and full Anki compatibility.",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
