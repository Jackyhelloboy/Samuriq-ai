import type { Metadata } from "next";
import "./globals.css";
import "./workspace-v7.css";
import "./monochrome.css";
import "./android.css";

export const metadata: Metadata = {
  title: "Samuriq AI | Human Data & Project Opportunities",
  description:
    "Human data operations for AI teams. Discover project opportunities, join approved teams and manage your contributions with Samuriq AI.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
