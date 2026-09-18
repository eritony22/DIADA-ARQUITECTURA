import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import GalleryLightbox from "@/components/projects/gallery-lightbox";
import { getAdjacentProjects, getProjectBySlug } from "@/lib/projects";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    openGraph: {
      title: project.title,
      description: project.summary,
      images: [{ url: project.coverImage }],
    },
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const { prev, next } = await getAdjacentProjects(slug);

  const facts: { label: string; value: string }[] = [
    { label: "Ubicación", value: project.location },
    { label: "Año", value: project.year },
    ...(project.area ? [{ label: "Área", value: project.area }] : []),
    ...(project.client ? [{ label: "Cliente", value: project.client }] : []),
    { label: "Estado", value: STATUS_LABELS[project.status] },
  ];

  return (
    <div className="bg-bone">
      <section className="relative overflow-hidden bg-ink pb-20 pt-36 text-bone md:pt-44">
        <div className="container-diada relative z-10">
          <Reveal>
            <Link
              href="/proyectos"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-bone/60 transition-colors hover:text-bone"
            >
              <ArrowLeft
                size={14}
                className="transition-transform duration-300 group-hover:-translate-x-1"
              />
              Todos los proyectos
            </Link>

            <Kicker className="mt-8">{CATEGORY_LABELS[project.category]}</Kicker>
            <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              {project.title}
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-bone/70">
              {project.summary}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-diada grid gap-14 md:grid-cols-[1fr_320px] md:gap-20">
          <Reveal>
            <div className="space-y-6 text-balance leading-relaxed text-ink/80">
              {project.description.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {(project.materials?.length || project.services?.length) && (
              <div className="mt-12 grid gap-8 sm:grid-cols-2">
                {project.materials && project.materials.length > 0 && (
                  <div>
                    <p className="kicker text-stone">Materiales</p>
                    <ul className="mt-4 space-y-2 text-sm text-ink/75">
                      {project.materials.map((m) => (
                        <li key={m} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.services && project.services.length > 0 && (
                  <div>
                    <p className="kicker text-stone">Servicios brindados</p>
                    <ul className="mt-4 space-y-2 text-sm text-ink/75">
                      {project.services.map((s) => (
                        <li key={s} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-line bg-paper p-8">
              <p className="kicker text-stone">Ficha técnica</p>
              <dl className="mt-6 space-y-5">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs uppercase tracking-wide text-stone">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 font-display text-base font-semibold text-ink">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/contacto"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink"
              >
                Iniciar un proyecto similar
                <ArrowUpRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {project.gallery.length > 0 && (
        <section className="border-t border-line bg-paper py-16 md:py-24">
          <div className="container-diada">
            <Reveal>
              <Kicker>Galería</Kicker>
              <h2 className="mt-4 font-display text-3xl font-bold text-ink md:text-4xl">
                El proyecto en detalle
              </h2>
            </Reveal>
            <div className="mt-10">
              <GalleryLightbox images={project.gallery} projectTitle={project.title} />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-ink text-bone">
        <div className="container-diada grid divide-y divide-bone/10 md:grid-cols-2 md:divide-x md:divide-y-0">
          {prev && (
            <Link
              href={`/proyectos/${prev.slug}`}
              className="group flex items-center justify-between gap-4 py-10 pr-6 md:pr-10"
            >
              <div>
                <span className="kicker text-bone/40">
                  <ArrowLeft size={14} className="mr-2 inline" />
                  Anterior
                </span>
                <p className="mt-3 font-display text-xl font-bold">{prev.title}</p>
              </div>
            </Link>
          )}
          {next && (
            <Link
              href={`/proyectos/${next.slug}`}
              className="group flex items-center justify-between gap-4 py-10 pl-0 text-right md:pl-10"
            >
              <div className="ml-auto">
                <span className="kicker justify-end text-bone/40">
                  Siguiente
                  <ArrowRight size={14} className="ml-2 inline" />
                </span>
                <p className="mt-3 font-display text-xl font-bold">{next.title}</p>
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
