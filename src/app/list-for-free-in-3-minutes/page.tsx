import type { Metadata } from "next";
import { ListQuickForm } from "@/components/list-quick-form";

export const metadata: Metadata = {
  title: "List for free in 3 minutes",
  description:
    "Add a Muslim-owned Singapore business to muslimowned.sg without signing in first. Confirm by email, then an admin screens the listing.",
  alternates: { canonical: "/list-for-free-in-3-minutes" },
};

export default function ListQuickPage() {
  return <ListQuickForm />;
}
