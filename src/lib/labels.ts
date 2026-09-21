import type { ProjectCategory, ProjectStatus, RaffleStatus, TicketStatus } from "@/types/content";

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

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const RAFFLE_STATUS_LABELS: Record<RaffleStatus, string> = {
  borrador: "Borrador (oculto)",
  activo: "Activo (visible y en venta)",
  cerrado: "Cerrado (sorteo finalizado)",
};
