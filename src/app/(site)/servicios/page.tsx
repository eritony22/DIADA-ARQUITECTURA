import type { Metadata } from "next";
import { Compass, HardHat, Sofa, ClipboardCheck, type LucideIcon } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import CtaBand from "@/components/sections/cta-band";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Diseño arquitectónico, construcción de edificios, diseño de interiores y consultoría técnica en Tarapoto, San Martín.",
};

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  "hard-hat": HardHat,
  sofa: Sofa,
  "clipboard-check": ClipboardCheck,
};

const PROCESS = [
  {
    step: "01",
    title: "Conversación y levantamiento",
    description:
      "Escuchamos el proyecto, visitamos el terreno o local y definimos alcance, presupuesto referencial y plazos.",
  },
  {
    step: "02",
    title: "Diseño y expediente técnico",
    description:
      "Anteproyecto, diseño definitivo, planos de arquitectura, estructuras e instalaciones, y visualización 3D del proyecto.",
  },
  {
    step: "03",
    title: "Construcción",
    description:
      "Ejecución de obra con equipo propio, control de cronograma, calidad y presupuesto en cada partida.",
  },
  {
    step: "04",
    title: "Entrega y acompañamiento",
    description:
      "Entrega del proyecto terminado con acompañamiento post-obra para ajustes y mantenimiento inicial.",
  },
];

export default async function ServiciosPage() {
  const { services, company } = await getSettings();

  return (
    <div className="bg-bone">
      <section className="border-b border-line bg-ink pb-20 pt-36 text-bone md:pt-44">
        <div className="container-diada">
          <Reveal>
            <Kicker>Lo que hacemos</Kicker>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Diseño y construcción bajo un mismo techo
            </h1>
            <p className="mt-6 max-w-xl text-balance leading-relaxed text-bone/70">
              Integramos cuatro disciplinas para que no tengas que coordinar
              entre estudios y contratistas distintos: un solo equipo
              responsable de principio a fin.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-diada grid gap-6 md:grid-cols-2">
          {services.map((service, i) => {
            const Icon = ICONS[service.icon] ?? Compass;
            return (
              <Reveal
                key={service.id}
                delay={i * 0.08}
                className="group rounded-[28px] border border-line bg-paper p-9 transition-colors hover:border-clay"
              >
                <div className="flex items-start justify-between">
                  <Icon size={30} strokeWidth={1.5} className="text-clay" />
                  <span className="font-display text-sm font-bold text-stone-light">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-6 font-display text-2xl font-bold text-ink">
                  {service.title}
                </h2>
                <p className="mt-3 leading-relaxed text-stone">{service.description}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-ink py-20 text-bone md:py-28">
        <div className="container-diada">
          <Reveal>
            <Kicker tone="bone">Cómo trabajamos</Kicker>
            <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-bold leading-[1.05] md:text-5xl">
              De la primera reunión a la entrega de llaves
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-10 md:grid-cols-4">
            {PROCESS.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.1} className="border-t border-bone/15 pt-6">
                <span className="font-display text-3xl font-extrabold text-clay">
                  {item.step}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-bone/60">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand company={company} />
    </div>
  );
}
