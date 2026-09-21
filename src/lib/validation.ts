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
      whatsapp: z.string().optional(),
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

export const ticketStatusSchema = z.enum(["disponible", "reservado", "vendido"]);

export const raffleMediaItemSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["image", "video"]),
  caption: z.string().optional(),
});

export const rafflePrizeSchema = z.object({
  title: z.string().min(1, "El premio necesita un título"),
  description: z.string().optional().default(""),
  image: z.string().optional(),
});

export const raffleStatusSchema = z.enum(["borrador", "activo", "cerrado"]);

export const raffleConfigPatchSchema = z.object({
  title: z.string().min(2, "El título es obligatorio").optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  rules: z.array(z.string()).optional(),
  prizes: z.array(rafflePrizeSchema).optional(),
  media: z.array(raffleMediaItemSchema).optional(),
  totalTickets: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Debe haber al menos 1 ticket")
    .max(1000, "El máximo es 1000 tickets")
    .optional(),
  ticketPrice: z.number().min(0, "El precio no puede ser negativo").optional(),
  currency: z.string().min(1).optional(),
  whatsapp: z.string().optional(),
  drawDate: z.string().optional(),
  status: raffleStatusSchema.optional(),
});

export const adminTicketUpdateSchema = z.object({
  status: ticketStatusSchema,
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().optional(),
  note: z.string().optional(),
});

export const adminTicketBulkUpdateSchema = z.object({
  numbers: z.array(z.number().int().min(1)).min(1, "Selecciona al menos un ticket"),
  status: ticketStatusSchema,
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().optional(),
  note: z.string().optional(),
});

export const raffleReserveSchema = z.object({
  numbers: z
    .array(z.number().int().min(1))
    .min(1, "Selecciona al menos un número")
    .max(50, "Puedes reservar hasta 50 números a la vez"),
  buyerName: z.string().min(2, "Ingresa tu nombre completo"),
  buyerPhone: z.string().min(6, "Ingresa un teléfono válido"),
  buyerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  note: z.string().optional(),
  // honeypot field — real users never fill this
  company_website: z.string().max(0).optional(),
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
