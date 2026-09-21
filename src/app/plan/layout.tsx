import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Tell us what you need. We’ll suggest a listing, or a few that work together.",
  alternates: { canonical: "/plan" },
};

export default function PlanLayout({ children }: { children: ReactNode }) {
  return children;
}
