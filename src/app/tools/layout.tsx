import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools",
  robots: { index: false, follow: false },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 max-w-full overflow-x-clip">{children}</div>;
}
