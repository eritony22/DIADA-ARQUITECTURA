import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import BrandMark from "@/components/brand/brand-mark";
import type { AboutContent } from "@/types/content";

export default function AboutTeaser({ about }: { about: AboutContent }) {
  return (
    <section className="bg-bone py-24 md:py-32">
      <div className="container-diada grid gap-12 md:grid-cols-2 md:gap-20">
        <Reveal>
          <Kicker>{about.kicker}</Kicker>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.05] text-ink md:text-5xl">
            Diseño y obra bajo una misma mirada
          </h2>
          <p className="mt-6 max-w-lg text-balance leading-relaxed text-stone">
            {about.intro}
          </p>
          <Link
            href="/nosotros"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink"
          >
            Conoce el estudio
            <ArrowUpRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </Reveal>

        <Reveal delay={0.15} className="relative flex items-center justify-center">
          <div className="relative aspect-square w-full max-w-sm rounded-[32px] bg-ink p-10 text-clay">
            <BrandMark className="h-full w-full" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
