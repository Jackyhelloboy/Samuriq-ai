import type { Metadata } from "next";
import "./globals.css";
import "./workspace-v7.css";
import "./workspace-controls.css";
import "./android.css";
import "./getting-started.css";
import "./professional.css";
import "./recruitment-design.css";
import "./light-theme.css";

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
