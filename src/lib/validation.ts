import { z } from "zod";

export const galleryImageSchema = z.object({
  src: z.string().min(1),
  caption: z.string().optional(),
});

export const projectCategorySchema = z.enum([
  "arquitectura",
  "construccion",
  "interiorismo",
  "comercial",
]);

export const projectStatusSchema = z.enum([
  "construido",
  "en-obra",
  "proyecto",
  "concepto",
]);

export const projectInputSchema = z.object({
  title: z.string().min(2, "El título es obligatorio"),
  slug: z.string().optional(),
  category: projectCategorySchema,
  location: z.string().min(2, "La ubicación es obligatoria"),
  year: z.string().min(4),
  area: z.string().optional(),
  client: z.string().optional(),
  status: projectStatusSchema,
  summary: z.string().min(4, "Agrega una descripción corta"),
  description: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  coverImage: z.string().min(1, "Selecciona una imagen de portada"),
  gallery: z.array(galleryImageSchema).default([]),
  featured: z.boolean().default(false),
  order: z.number().optional(),
});

export const settingsPatchSchema = z.object({
  company: z
    .object({
      legalName: z.string().min(1).optional(),
      tradeName: z.string().min(1).optional(),
      ruc: z.string().optional(),
      phones: z.array(z.string()).optional(),
      emails: z.array(z.string()).optional(),
      instagram: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      mapQuery: z.string().optional(),
    })
    .partial()
    .optional(),
  hero: z
    .object({
      kicker: z.string().optional(),
      title: z.string().optional(),
      highlight: z.string().optional(),
      subtitle: z.string().optional(),
    })
    .partial()
    .optional(),
  about: z
    .object({
      kicker: z.string().optional(),
      intro: z.string().optional(),
      story: z.array(z.string()).optional(),
      mission: z.string().optional(),
      vision: z.string().optional(),
      values: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .optional(),
      team: z
        .array(
          z.object({
            name: z.string(),
            role: z.string(),
            bio: z.string(),
          }),
        )
        .optional(),
      teaserImage: z.string().optional(),
      pageImage: z.string().optional(),
    })
    .partial()
    .optional(),
  services: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        icon: z.string(),
      }),
    )
    .optional(),
  stats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        suffix: z.string().optional(),
      }),
    )
    .optional(),
});

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Cuéntanos tu nombre"),
  email: z.string().email("Ingresa un correo válido"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "Cuéntanos un poco más sobre tu proyecto"),
  // honeypot field — real users never fill this
  company_website: z.string().max(0).optional(),
});
