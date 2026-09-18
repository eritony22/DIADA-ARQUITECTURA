import "server-only";
import { readJson, writeJson } from "./json-store";
import { PROJECTS_FILE } from "./paths";
import { generateId, slugify } from "./slug";
import type { Project } from "@/types/content";

async function loadAll(): Promise<Project[]> {
  const projects = await readJson<Project[]>(PROJECTS_FILE, []);
  return [...projects].sort((a, b) => a.order - b.order);
}

export async function getProjects(): Promise<Project[]> {
  return loadAll();
}

export async function getFeaturedProjects(limit?: number): Promise<Project[]> {
  const projects = await loadAll();
  const featured = projects.filter((p) => p.featured);
  return typeof limit === "number" ? featured.slice(0, limit) : featured;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await loadAll();
  return projects.find((p) => p.slug === slug) ?? null;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await loadAll();
  return projects.find((p) => p.id === id) ?? null;
}

export async function getAdjacentProjects(
  slug: string,
): Promise<{ prev: Project | null; next: Project | null }> {
  const projects = await loadAll();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];
  return { prev: prev ?? null, next: next ?? null };
}

export type ProjectInput = Omit<
  Project,
  "id" | "slug" | "createdAt" | "updatedAt" | "order"
> & { slug?: string; order?: number };

export async function createProject(input: ProjectInput): Promise<Project> {
  const projects = await loadAll();
  const baseSlug = slugify(input.slug || input.title);
  let slug = baseSlug || generateId("proyecto");
  let counter = 1;
  while (projects.some((p) => p.slug === slug)) {
    slug = `${baseSlug}-${++counter}`;
  }

  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: generateId("prj"),
    slug,
    order: input.order ?? projects.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...projects, project];
  await writeJson(PROJECTS_FILE, next);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput>,
): Promise<Project | null> {
  const projects = await loadAll();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = projects[index];
  let slug = current.slug;
  if (patch.slug && slugify(patch.slug) !== current.slug) {
    const baseSlug = slugify(patch.slug);
    slug = baseSlug;
    let counter = 1;
    while (projects.some((p) => p.slug === slug && p.id !== id)) {
      slug = `${baseSlug}-${++counter}`;
    }
  }

  const updated: Project = {
    ...current,
    ...patch,
    slug,
    updatedAt: new Date().toISOString(),
  };

  const next = [...projects];
  next[index] = updated;
  await writeJson(PROJECTS_FILE, next);
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await loadAll();
  const next = projects.filter((p) => p.id !== id);
  if (next.length === projects.length) return false;
  await writeJson(PROJECTS_FILE, next);
  return true;
}

export async function reorderProjects(orderedIds: string[]): Promise<Project[]> {
  const projects = await loadAll();
  const byId = new Map(projects.map((p) => [p.id, p]));
  const next = orderedIds
    .map((id, index) => {
      const project = byId.get(id);
      if (!project) return null;
      return { ...project, order: index + 1 };
    })
    .filter((p): p is Project => p !== null);

  // append any project not present in orderedIds, preserving relative order
  const missing = projects.filter((p) => !orderedIds.includes(p.id));
  const merged = [...next, ...missing.map((p, i) => ({ ...p, order: next.length + i + 1 }))];

  await writeJson(PROJECTS_FILE, merged);
  return merged.sort((a, b) => a.order - b.order);
}
