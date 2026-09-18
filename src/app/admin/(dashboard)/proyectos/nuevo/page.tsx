import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectForm from "@/components/admin/project-form";

export default function NewProjectPage() {
  return (
    <div>
      <Link
        href="/admin/proyectos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-stone hover:text-ink"
      >
        <ArrowLeft size={15} />
        Proyectos
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink">Nuevo proyecto</h1>
      <div className="mt-8">
        <ProjectForm />
      </div>
    </div>
  );
}
