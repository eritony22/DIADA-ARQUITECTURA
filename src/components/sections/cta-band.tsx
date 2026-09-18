import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import type { CompanyInfo } from "@/types/content";

export default function CtaBand({ company }: { company: CompanyInfo }) {
  return (
    <section className="bg-clay py-20 text-ink md:py-28">
      <div className="container-diada flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
        <Reveal>
          <p className="kicker text-ink/60">Empecemos tu proyecto</p>
          <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-bold leading-[1.05] md:text-5xl">
            Cuéntanos qué quieres construir en San Martín
          </h2>
        </Reveal>

        <Reveal delay={0.12} className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/contacto"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-bone transition-colors hover:bg-ink-soft"
          >
            Escríbenos
            <ArrowUpRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
          <a
            href={`tel:+51${company.phones[0].replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/30 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            <Phone size={16} />
            {company.phones[0]}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
