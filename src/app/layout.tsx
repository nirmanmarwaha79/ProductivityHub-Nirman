import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Productivity Hub",
  description: "A personal space to organise tasks, projects and deadlines."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
