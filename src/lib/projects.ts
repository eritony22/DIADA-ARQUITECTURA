import "server-only";
import { sql, ensureSchema } from "./db";
import { generateId, slugify } from "./slug";
import type { Project } from "@/types/content";
import sampleProjects from "../../data/projects.json";

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  area: string | null;
  client: string | null;
  status: string;
  summary: string;
  description: string[];
  materials: string[] | null;
  services: string[] | null;
  cover_image: string;
  gallery: Project["gallery"];
  featured: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as Project["category"],
    location: row.location,
    year: row.year,
    area: row.area ?? undefined,
    client: row.client ?? undefined,
    status: row.status as Project["status"],
    summary: row.summary,
    description: row.description,
    materials: row.materials ?? undefined,
    services: row.services ?? undefined,
    coverImage: row.cover_image,
    gallery: row.gallery,
    featured: row.featured,
    order: row.order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function loadAll(): Promise<Project[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM projects ORDER BY "order" ASC
  `) as unknown as ProjectRow[];
  return rows.map(rowToProject);
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
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM projects WHERE slug = ${slug} LIMIT 1
  `) as unknown as ProjectRow[];
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function getProjectById(id: string): Promise<Project | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM projects WHERE id = ${id} LIMIT 1
  `) as unknown as ProjectRow[];
  return rows[0] ? rowToProject(rows[0]) : null;
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

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  await ensureSchema();
  const baseSlug = slugify(base) || generateId("proyecto");
  let slug = baseSlug;
  let counter = 1;
  for (;;) {
    const rows = excludeId
      ? ((await sql`
          SELECT id FROM projects WHERE slug = ${slug} AND id != ${excludeId} LIMIT 1
        `) as unknown as { id: string }[])
      : ((await sql`
          SELECT id FROM projects WHERE slug = ${slug} LIMIT 1
        `) as unknown as { id: string }[]);
    if (rows.length === 0) return slug;
    slug = `${baseSlug}-${++counter}`;
  }
}

export async function createProject(input: ProjectInput): Promise<Project> {
  await ensureSchema();
  const slug = await uniqueSlug(input.slug || input.title);

  let order = input.order;
  if (order === undefined) {
    const rows = (await sql`
      SELECT COALESCE(MAX("order"), 0) + 1 AS next FROM projects
    `) as unknown as { next: number }[];
    order = rows[0]?.next ?? 1;
  }

  const id = generateId("prj");
  const rows = (await sql`
    INSERT INTO projects (
      id, slug, title, category, location, year, area, client, status,
      summary, description, materials, services, cover_image, gallery,
      featured, "order"
    ) VALUES (
      ${id}, ${slug}, ${input.title}, ${input.category}, ${input.location},
      ${input.year}, ${input.area ?? null}, ${input.client ?? null},
      ${input.status}, ${input.summary}, ${JSON.stringify(input.description)},
      ${JSON.stringify(input.materials ?? [])}, ${JSON.stringify(input.services ?? [])},
      ${input.coverImage}, ${JSON.stringify(input.gallery)}, ${input.featured}, ${order}
    )
    RETURNING *
  `) as unknown as ProjectRow[];
  return rowToProject(rows[0]);
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput>,
): Promise<Project | null> {
  await ensureSchema();
  const current = await getProjectById(id);
  if (!current) return null;

  let slug = current.slug;
  if (patch.slug && slugify(patch.slug) !== current.slug) {
    slug = await uniqueSlug(patch.slug, id);
  }

  const merged: Project = {
    ...current,
    ...patch,
    slug,
    updatedAt: new Date().toISOString(),
  };

  const rows = (await sql`
    UPDATE projects SET
      slug = ${merged.slug},
      title = ${merged.title},
      category = ${merged.category},
      location = ${merged.location},
      year = ${merged.year},
      area = ${merged.area ?? null},
      client = ${merged.client ?? null},
      status = ${merged.status},
      summary = ${merged.summary},
      description = ${JSON.stringify(merged.description)},
      materials = ${JSON.stringify(merged.materials ?? [])},
      services = ${JSON.stringify(merged.services ?? [])},
      cover_image = ${merged.coverImage},
      gallery = ${JSON.stringify(merged.gallery)},
      featured = ${merged.featured},
      "order" = ${merged.order},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as unknown as ProjectRow[];
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    DELETE FROM projects WHERE id = ${id} RETURNING id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

export async function reorderProjects(orderedIds: string[]): Promise<Project[]> {
  await ensureSchema();
  const projects = await loadAll();
  const byId = new Map(projects.map((p) => [p.id, p]));

  const ordered = orderedIds.filter((id) => byId.has(id));
  const missing = projects
    .filter((p) => !orderedIds.includes(p.id))
    .map((p) => p.id);
  const finalOrder = [...ordered, ...missing];

  for (let i = 0; i < finalOrder.length; i++) {
    await sql`UPDATE projects SET "order" = ${i + 1} WHERE id = ${finalOrder[i]}`;
  }

  return loadAll();
}

/**
 * One-time bootstrap for a freshly-connected database: inserts the sample
 * projects bundled in the repo (data/projects.json). Safe to call more than
 * once — existing rows (matched by id) are left untouched.
 */
export async function seedSampleProjects(): Promise<number> {
  await ensureSchema();
  let inserted = 0;
  for (const p of sampleProjects as Project[]) {
    const rows = (await sql`
      INSERT INTO projects (
        id, slug, title, category, location, year, area, client, status,
        summary, description, materials, services, cover_image, gallery,
        featured, "order", created_at, updated_at
      ) VALUES (
        ${p.id}, ${p.slug}, ${p.title}, ${p.category}, ${p.location}, ${p.year},
        ${p.area ?? null}, ${p.client ?? null}, ${p.status}, ${p.summary},
        ${JSON.stringify(p.description ?? [])}, ${JSON.stringify(p.materials ?? [])},
        ${JSON.stringify(p.services ?? [])}, ${p.coverImage}, ${JSON.stringify(p.gallery ?? [])},
        ${p.featured}, ${p.order}, ${p.createdAt}, ${p.updatedAt}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `) as unknown as { id: string }[];
    if (rows.length > 0) inserted++;
  }
  return inserted;
}
