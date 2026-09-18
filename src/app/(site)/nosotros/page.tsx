import type { Metadata } from "next";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import BrandMark from "@/components/brand/brand-mark";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce DIADA Arquitectura y Construcción S.A.C., estudio de arquitectura, construcción y diseño de interiores con sede en Tarapoto, San Martín.",
};

export default async function NosotrosPage() {
  const { about, stats, company } = await getSettings();

  return (
    <div className="bg-bone">
      <section className="border-b border-line bg-ink pb-20 pt-36 text-bone md:pt-44">
        <div className="container-diada grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <Reveal>
            <Kicker>{about.kicker}</Kicker>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Un estudio nacido en la selva alta
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-md text-balance leading-relaxed text-bone/70">
              {about.intro}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-diada grid gap-14 md:grid-cols-[1fr_260px]">
          <Reveal className="space-y-6 text-balance text-lg leading-relaxed text-ink/80">
            {about.story.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </Reveal>

          <Reveal delay={0.15} className="text-clay">
            <div className="aspect-square w-full rounded-[28px] bg-ink p-8">
              <BrandMark className="h-full w-full" />
            </div>
          </Reveal>
        </div>

        <div className="container-diada mt-16 grid gap-px overflow-hidden rounded-[28px] border border-line bg-line sm:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.06} className="bg-paper p-7">
              <p className="font-display text-3xl font-extrabold text-ink">
                {stat.value}
                <span className="text-clay">{stat.suffix}</span>
              </p>
              <p className="kicker mt-2 text-stone">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper py-20 md:py-28">
        <div className="container-diada grid gap-10 md:grid-cols-2">
          <Reveal className="rounded-[28px] border border-line bg-bone p-10">
            <Kicker>Misión</Kicker>
            <p className="mt-5 text-balance text-xl font-medium leading-relaxed text-ink">
              {about.mission}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="rounded-[28px] border border-line bg-bone p-10">
            <Kicker>Visión</Kicker>
            <p className="mt-5 text-balance text-xl font-medium leading-relaxed text-ink">
              {about.vision}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-diada">
          <Reveal>
            <Kicker>Valores</Kicker>
            <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-bold leading-[1.05] text-ink md:text-5xl">
              Cómo trabajamos cada proyecto
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {about.values.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.08} className="border-t border-line pt-6">
                <span className="font-display text-sm font-bold text-clay">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold text-ink">
                  {value.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-stone">
                  {value.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ink py-20 text-bone md:py-28">
        <div className="container-diada">
          <Reveal>
            <Kicker tone="bone">Equipo</Kicker>
            <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-bold leading-[1.05] md:text-5xl">
              Las personas detrás de DIADA
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {about.team.map((member, i) => (
              <Reveal
                key={member.name}
                delay={i * 0.1}
                className="rounded-[24px] border border-bone/10 p-8"
              >
                <p className="font-display text-2xl font-bold">{member.name}</p>
                <p className="kicker mt-2 text-clay">{member.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-bone/65">{member.bio}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2} className="mt-10 text-sm text-bone/50">
            {company.legalName} — RUC {company.ruc}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
