import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teach Together",
  description: "Classroom decision simulations for case-based courses."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
