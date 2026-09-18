import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import IntroLoader from "@/components/brand/intro-loader";

// Content (projects, settings) is edited live from /admin and stored in
// JSON files, not baked in at build time — every page here must be
// rendered per-request so edits show up immediately without a rebuild.
export const dynamic = "force-dynamic";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <IntroLoader />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
