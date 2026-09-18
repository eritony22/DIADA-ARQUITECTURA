import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

// Every admin screen reads and writes the live JSON data store — never
// serve a cached/static snapshot here.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full bg-bone-dim">{children}</div>;
}
