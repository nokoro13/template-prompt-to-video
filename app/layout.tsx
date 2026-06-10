import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-appearance";
import { AppShell } from "@/components/layout/AppShell";
import { SyncUser } from "@/components/auth/SyncUser";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Clipng",
  description: "Create and manage AI-generated story videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        signIn: clerkAuthAppearance,
        signUp: clerkAuthAppearance,
      }}
    >
      <html lang="en" className={cn("font-sans", geist.variable)}>
        <body className="h-svh overflow-hidden">
          <SyncUser />
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
