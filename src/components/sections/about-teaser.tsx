import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import type { AboutContent } from "@/types/content";

export default function AboutTeaser({ about }: { about: AboutContent }) {
  return (
    <section className="bg-bone py-24 md:py-32">
      <div className="container-diada grid gap-12 md:grid-cols-2 md:items-center md:gap-20">
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

        <Reveal delay={0.15} className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px]">
            <Image
              src="/images/projects/piscina-campestre/board-02-nocturna.webp"
              alt="Proyecto DIADA — Piscina Campestre, vista nocturna"
              fill
              sizes="(min-width: 768px) 45vw, 92vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
