import { Compass, HardHat, Sofa, ClipboardCheck, type LucideIcon } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import type { Service } from "@/types/content";

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  "hard-hat": HardHat,
  sofa: Sofa,
  "clipboard-check": ClipboardCheck,
};

export default function ServicesGrid({
  services,
  heading = "Un mismo equipo, del diseño a la obra",
}: {
  services: Service[];
  heading?: string;
}) {
  return (
    <section className="bg-ink py-24 text-bone md:py-32">
      <div className="container-diada">
        <Reveal>
          <Kicker tone="bone">Servicios</Kicker>
          <h2 className="mt-5 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.05] md:text-5xl">
            {heading}
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[3px] border border-bone/10 bg-bone/10 sm:grid-cols-2">
          {services.map((service, i) => {
            const Icon = ICONS[service.icon] ?? Compass;
            return (
              <Reveal key={service.id} delay={i * 0.08} className="bg-ink p-8 md:p-10">
                <Icon size={28} className="text-clay" strokeWidth={1.5} />
                <h3 className="mt-6 font-display text-xl font-bold">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-bone/60">
                  {service.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
