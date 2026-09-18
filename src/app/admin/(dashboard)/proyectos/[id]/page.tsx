import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ProjectForm from "@/components/admin/project-form";
import { getProjectById } from "@/lib/projects";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link
          href="/admin/proyectos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone hover:text-ink"
        >
          <ArrowLeft size={15} />
          Proyectos
        </Link>
        <Link
          href={`/proyectos/${project.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone hover:text-ink"
        >
          Ver en el sitio
          <ExternalLink size={14} />
        </Link>
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink">{project.title}</h1>
      <div className="mt-8">
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
