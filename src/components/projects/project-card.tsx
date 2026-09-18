import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/types/content";
import { CATEGORY_LABELS } from "@/lib/labels";

export default function ProjectCard({
  project,
  priority = false,
}: {
  project: Project;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/proyectos/${project.slug}`}
      className="group block overflow-hidden rounded-[28px] bg-ink text-bone"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src={project.coverImage}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 32vw, (min-width: 640px) 45vw, 90vw"
          priority={priority}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95" />

        <span className="absolute left-5 top-5 rounded-full border border-bone/30 bg-ink/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-bone backdrop-blur">
          {CATEGORY_LABELS[project.category]}
        </span>

        <div className="absolute inset-x-5 bottom-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold leading-tight sm:text-2xl">
                {project.title}
              </h3>
              <p className="mt-1 text-xs text-bone/60">{project.location}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay text-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
              <ArrowUpRight size={18} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
