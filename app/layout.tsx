import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "PoioAI",
  description: "Create and manage AI-generated story videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="h-svh overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
