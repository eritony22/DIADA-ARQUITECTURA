import Link from "next/link";
import Image from "next/image";
import { Plus, Star } from "lucide-react";
import { getProjects } from "@/lib/projects";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";
import SeedProjectsButton from "@/components/admin/seed-projects-button";

export default async function AdminProjectsPage() {
  const projects = await getProjects();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="kicker text-stone">Portafolio</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">Proyectos</h1>
        </div>
        <Link
          href="/admin/proyectos/nuevo"
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone hover:bg-clay"
        >
          <Plus size={16} />
          Nuevo proyecto
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper">
        {projects.length === 0 ? (
          <div className="p-8 text-center text-stone">
            <p>Todavía no hay proyectos. Crea el primero.</p>
            <SeedProjectsButton />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/admin/proyectos/${project.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-bone-dim sm:p-5"
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                    <Image
                      src={project.coverImage}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-base font-bold text-ink">
                        {project.title}
                      </p>
                      {project.featured && (
                        <Star size={14} className="shrink-0 fill-clay text-clay" />
                      )}
                    </div>
                    <p className="truncate text-sm text-stone">
                      {project.location} · {project.year}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink">
                      {CATEGORY_LABELS[project.category]}
                    </span>
                    <span className="text-xs text-stone">
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
