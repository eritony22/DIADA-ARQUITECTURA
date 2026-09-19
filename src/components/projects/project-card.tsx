import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/types/content";
import { CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/cn";

export default function ProjectCard({
  project,
  priority = false,
  wide = false,
}: {
  project: Project;
  priority?: boolean;
  wide?: boolean;
}) {
  return (
    <Link
      href={`/proyectos/${project.slug}`}
      className="group block overflow-hidden bg-ink text-bone"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          wide ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[4/5]",
        )}
      >
        <Image
          src={project.coverImage}
          alt={project.title}
          fill
          sizes={
            wide
              ? "100vw"
              : "(min-width: 1024px) 46vw, (min-width: 640px) 45vw, 90vw"
          }
          priority={priority}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95" />

        <span className="absolute left-5 top-5 border border-bone/30 bg-ink/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-bone backdrop-blur">
          {CATEGORY_LABELS[project.category]}
        </span>

        <div className="absolute inset-x-5 bottom-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3
                className={cn(
                  "font-display font-bold leading-tight",
                  wide ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl",
                )}
              >
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
