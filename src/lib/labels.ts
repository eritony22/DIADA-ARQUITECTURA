import type { ProjectCategory, ProjectStatus } from "@/types/content";

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  arquitectura: "Arquitectura",
  construccion: "Construcción",
  interiorismo: "Diseño de Interiores",
  comercial: "Comercial",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  construido: "Construido",
  "en-obra": "En obra",
  proyecto: "Proyecto",
  concepto: "Concepto",
};
