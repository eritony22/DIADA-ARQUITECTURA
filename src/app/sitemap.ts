import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/projects";

const BASE_URL = "https://diada-arquitectura.pe";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/proyectos",
    "/servicios",
    "/nosotros",
    "/contacto",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${BASE_URL}/proyectos/${project.slug}`,
    lastModified: project.updatedAt,
  }));

  return [...staticRoutes, ...projectRoutes];
}
