import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Preview and export generated videos",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
