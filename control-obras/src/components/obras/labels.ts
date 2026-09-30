import type {
  EstadoAccion,
  EstadoFianza,
  EstadoPredio,
  EstadoValorizacion,
  EtapaTechoPropio,
  TipoFianza,
} from "@/types/obras";

export const ETAPAS: { id: EtapaTechoPropio; label: string; descripcion: string }[] = [
  { id: "asignado", label: "BFH asignado", descripcion: "Familia elegible con bono asignado." },
  { id: "contrato", label: "Contrato de obra", descripcion: "Contrato de obra firmado entre la familia y la entidad técnica." },
  { id: "garantia", label: "Garantía presentada", descripcion: "Carta fianza a favor del Fondo MIVIVIENDA presentada." },
  { id: "desembolso", label: "BFH desembolsado", descripcion: "El FMV desembolsó el BFH y el ahorro a la entidad técnica." },
  { id: "ejecucion", label: "En ejecución", descripcion: "Módulo en construcción." },
  { id: "verificacion", label: "Verificación de obra", descripcion: "Obra concluida, en verificación e informe." },
  { id: "entregado", label: "Entregado", descripcion: "Módulo entregado y garantía liberada." },
];

export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e.id, e.label])) as Record<
  EtapaTechoPropio,
  string
>;

export const PREDIO_LABEL: Record<EstadoPredio, string> = {
  vacio: "Vacío",
  demolicion_total: "Demolición total",
  demolicion_parcial: "Demolición parcial",
};

export const VALORIZACION_LABEL: Record<EstadoValorizacion, string> = {
  borrador: "Borrador",
  aprobada: "Aprobada",
  pagada: "Pagada",
};

export const TIPO_FIANZA_LABEL: Record<TipoFianza, string> = {
  fiel_cumplimiento: "Fiel cumplimiento",
  adelanto: "Adelanto",
  bfh: "Garantía BFH (FMV)",
  otra: "Otra",
};

export const ESTADO_FIANZA_LABEL: Record<EstadoFianza, string> = {
  vigente: "Vigente",
  renovada: "Renovada",
  liberada: "Liberada",
  ejecutada: "Ejecutada",
};

export const PDCA: { id: EstadoAccion; label: string; descripcion: string }[] = [
  { id: "plan", label: "Planificar", descripcion: "Problema, causa raíz y acción definida" },
  { id: "hacer", label: "Hacer", descripcion: "Acción en ejecución" },
  { id: "verificar", label: "Verificar", descripcion: "Medir si la acción funcionó" },
  { id: "actuar", label: "Actuar", descripcion: "Estandarizar o corregir el rumbo" },
  { id: "cerrada", label: "Cerrada", descripcion: "Eficacia comprobada" },
];
