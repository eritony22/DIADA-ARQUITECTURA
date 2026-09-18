import Hero from "@/components/sections/hero";
import MarqueeStrip from "@/components/sections/marquee-strip";
import StatsBar from "@/components/sections/stats-bar";
import FeaturedProjects from "@/components/sections/featured-projects";
import AboutTeaser from "@/components/sections/about-teaser";
import ServicesGrid from "@/components/sections/services-grid";
import CtaBand from "@/components/sections/cta-band";
import { getSettings } from "@/lib/settings";
import { getFeaturedProjects } from "@/lib/projects";

export default async function HomePage() {
  const [settings, featuredProjects] = await Promise.all([
    getSettings(),
    getFeaturedProjects(3),
  ]);

  return (
    <>
      <Hero content={settings.hero} />
      <MarqueeStrip />
      <StatsBar stats={settings.stats} />
      <FeaturedProjects projects={featuredProjects} />
      <AboutTeaser about={settings.about} />
      <ServicesGrid services={settings.services} />
      <CtaBand company={settings.company} />
    </>
  );
}
