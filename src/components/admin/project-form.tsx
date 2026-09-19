"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown, Loader2, Trash2, X } from "lucide-react";
import ImageUploader from "./image-uploader";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { GalleryImage, Project, ProjectCategory, ProjectStatus } from "@/types/content";

interface ProjectFormValues {
  title: string;
  category: ProjectCategory;
  location: string;
  year: string;
  area: string;
  client: string;
  status: ProjectStatus;
  summary: string;
  description: string;
  materials: string;
  services: string;
  coverImage: string;
  featured: boolean;
}

function toFormValues(project?: Project | null): ProjectFormValues {
  return {
    title: project?.title ?? "",
    category: project?.category ?? "arquitectura",
    location: project?.location ?? "",
    year: project?.year ?? new Date().getFullYear().toString(),
    area: project?.area ?? "",
    client: project?.client ?? "",
    status: project?.status ?? "proyecto",
    summary: project?.summary ?? "",
    description: project?.description?.join("\n\n") ?? "",
    materials: project?.materials?.join(", ") ?? "",
    services: project?.services?.join(", ") ?? "",
    coverImage: project?.coverImage ?? "",
    featured: project?.featured ?? false,
  };
}

export default function ProjectForm({ project }: { project?: Project | null }) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [values, setValues] = useState<ProjectFormValues>(toFormValues(project));
  const [gallery, setGallery] = useState<GalleryImage[]>(project?.gallery ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function moveGalleryItem(index: number, dir: -1 | 1) {
    setGallery((items) => {
      const next = [...items];
      const target = index + dir;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: values.title,
      category: values.category,
      location: values.location,
      year: values.year,
      area: values.area || undefined,
      client: values.client || undefined,
      status: values.status,
      summary: values.summary,
      description: values.description
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      materials: values.materials
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      services: values.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      coverImage: values.coverImage,
      gallery,
      featured: values.featured,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/projects/${project!.id}` : "/api/admin/projects",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar el proyecto");

      router.push("/admin/proyectos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirm(`¿Eliminar el proyecto "${project.title}"? Esta acción no se puede deshacer.`))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el proyecto");
      router.push("/admin/proyectos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Información general</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField
            label="Título del proyecto"
            value={values.title}
            onChange={(v) => update("title", v)}
            required
          />
          <SelectField
            label="Categoría"
            value={values.category}
            onChange={(v) => update("category", v as ProjectCategory)}
            options={Object.entries(CATEGORY_LABELS)}
          />
          <TextField
            label="Ubicación"
            value={values.location}
            onChange={(v) => update("location", v)}
            required
          />
          <TextField label="Año" value={values.year} onChange={(v) => update("year", v)} required />
          <TextField label="Área (opcional)" value={values.area} onChange={(v) => update("area", v)} />
          <TextField
            label="Cliente (opcional)"
            value={values.client}
            onChange={(v) => update("client", v)}
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(v) => update("status", v as ProjectStatus)}
            options={Object.entries(STATUS_LABELS)}
          />
          <label className="flex items-center gap-3 self-end pb-2.5">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => update("featured", e.target.checked)}
              className="h-4 w-4 accent-clay"
            />
            <span className="text-sm font-medium text-ink">
              Destacar en la página de inicio
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Contenido</h2>
        <div className="mt-5 space-y-5">
          <TextAreaField
            label="Resumen corto (aparece en las tarjetas de proyecto)"
            value={values.summary}
            onChange={(v) => update("summary", v)}
            rows={2}
            required
          />
          <TextAreaField
            label="Descripción (separa párrafos dejando una línea en blanco)"
            value={values.description}
            onChange={(v) => update("description", v)}
            rows={8}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Materiales (separados por coma)"
              value={values.materials}
              onChange={(v) => update("materials", v)}
              placeholder="Madera, Concreto, Acero"
            />
            <TextField
              label="Servicios brindados (separados por coma)"
              value={values.services}
              onChange={(v) => update("services", v)}
              placeholder="Diseño arquitectónico, Paisajismo"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Imagen de portada</h2>
        <p className="mt-1 text-sm text-stone">
          Se usa en las tarjetas de proyecto y como imagen principal del detalle.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {values.coverImage && (
            <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-line sm:w-56">
              <Image src={values.coverImage} alt="Portada" fill className="object-cover" />
            </div>
          )}
          <ImageUploader
            multiple={false}
            label={values.coverImage ? "Reemplazar portada" : "Subir portada"}
            className="w-full max-w-sm"
            onUploaded={(files) => {
              if (files[0]) update("coverImage", files[0].url);
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Galería</h2>
        <p className="mt-1 text-sm text-stone">
          Imágenes adicionales del proyecto, con leyenda opcional.
        </p>

        <div className="mt-4 space-y-3">
          {gallery.map((image, i) => (
            <div
              key={image.src + i}
              className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row sm:items-center"
            >
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg">
                <Image src={image.src} alt="" fill className="object-cover" />
              </div>
              <input
                type="text"
                value={image.caption ?? ""}
                placeholder="Leyenda (opcional)"
                onChange={(e) =>
                  setGallery((items) =>
                    items.map((img, idx) =>
                      idx === i ? { ...img, caption: e.target.value } : img,
                    ),
                  )
                }
                className="flex-1 rounded-lg border border-line bg-bone px-3 py-2 text-sm focus:border-clay focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <IconButton onClick={() => moveGalleryItem(i, -1)} label="Subir">
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton onClick={() => moveGalleryItem(i, 1)} label="Bajar">
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton
                  onClick={() => setGallery((items) => items.filter((_, idx) => idx !== i))}
                  label="Eliminar"
                  danger
                >
                  <X size={15} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>

        <ImageUploader
          label="Agregar imágenes a la galería"
          className="mt-4"
          onUploaded={(files) =>
            setGallery((items) => [
              ...items,
              ...files.map((f) => ({ src: f.url, caption: "" })),
            ])
          }
        />
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={16} />
            {deleting ? "Eliminando…" : "Eliminar proyecto"}
          </button>
        ) : (
          <span />
        )}

        <button
          type="submit"
          disabled={saving || !values.coverImage}
          className="flex items-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar proyecto"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <textarea
        value={value}
        required={required}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </select>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-line text-stone hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
