import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoRA Studio - Next.js",
  description: "AI Image Generation with LoRA Training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
