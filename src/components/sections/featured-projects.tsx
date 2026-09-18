import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ProjectCard from "@/components/projects/project-card";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import type { Project } from "@/types/content";

export default function FeaturedProjects({ projects }: { projects: Project[] }) {
  return (
    <section className="bg-bone py-24 md:py-32">
      <div className="container-diada">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Kicker>Proyectos seleccionados</Kicker>
            <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-bold leading-[1.05] text-ink md:text-5xl">
              Arquitectura construida a partir del lugar
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              href="/proyectos"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-ink"
            >
              Ver todo el portafolio
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 0.1}>
              <ProjectCard project={project} priority={i === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
