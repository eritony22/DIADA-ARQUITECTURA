import type { Metadata } from "next";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import ProjectFilterGrid from "@/components/projects/project-filter-grid";
import { getProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Proyectos",
  description:
    "Portafolio de proyectos de arquitectura, construcción y diseño de interiores de DIADA en Tarapoto y San Martín, Perú.",
};

export default async function ProyectosPage() {
  const projects = await getProjects();

  return (
    <div className="bg-bone">
      <section className="border-b border-line bg-ink pb-16 pt-36 text-bone md:pt-44">
        <div className="container-diada">
          <Reveal>
            <Kicker>Portafolio</Kicker>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Proyectos construidos desde el lugar
            </h1>
            <p className="mt-6 max-w-xl text-balance leading-relaxed text-bone/65">
              Arquitectura, construcción y diseño de interiores desarrollados
              en Tarapoto y la región San Martín — cada proyecto documentado
              con sus planos, materiales y visualizaciones.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-diada">
          <ProjectFilterGrid projects={projects} />
        </div>
      </section>
    </div>
  );
}
