// Modelo de datos del módulo "Control de Obras" (Techo Propio — Construcción
// en Sitio Propio). Todo el estado de una convocatoria vive en un solo
// documento (`ObraState`) que se guarda como JSONB en Postgres; los cálculos
// (avance, curva S, valorizaciones, proyecciones, diagnóstico) se derivan de
// él en `src/lib/obras/*` y nunca se persisten.

/** Fecha ISO sin hora, `YYYY-MM-DD`. */
export type ISODate = string;

export interface EntidadTecnica {
  id: string; // sigla usada en la lista oficial: "PAHER", "JCVM"
  sigla: string;
  razonSocial: string;
  ruc?: string;
  representante?: string;
  telefono?: string;
}

/**
 * Partida del presupuesto del módulo. `peso` es la fracción del costo
 * unitario (las 13 partidas suman 1). `inicioDia`/`duracionDias` son el
 * cronograma programado relativo al inicio del módulo.
 */
export interface Partida {
  id: string;
  codigo: string; // "01", "02", …
  grupo: string; // agrupador del cuadro: "CONCRETO SIMPLE", "MUROS Y CONCRETO ARMADO"…
  nombre: string;
  peso: number;
  inicioDia: number;
  duracionDias: number;
  /** Partidas que deben ir avanzadas antes de empezar ésta (secuencia constructiva). */
  predecesoras: string[];
}

export type EstadoPredio = "vacio" | "demolicion_total" | "demolicion_parcial";

/** Etapas del BFH en Techo Propio – CSP, en el orden en que ocurren. */
export type EtapaTechoPropio =
  | "asignado"
  | "contrato"
  | "garantia"
  | "desembolso"
  | "ejecucion"
  | "verificacion"
  | "entregado";

export interface Beneficiario {
  id: string;
  n: number;
  tipoDoc: string;
  numDoc: string;
  apPaterno: string;
  apMaterno: string;
  nombres: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  grupo: number;
  entidadId: string;
  lat: number | null;
  lng: number | null;
  estadoPredio: EstadoPredio | null;
  predioConfirmado: boolean | null;
  etapa: EtapaTechoPropio;
  /** Inicio programado del módulo; si falta se usa el del grupo. */
  fechaInicio?: ISODate;
  telefono?: string;
  observaciones?: string;
}

export interface MovimientoContrato {
  id: string;
  descripcion: string;
  fecha: ISODate;
  monto: number;
}

export interface Adelanto extends MovimientoContrato {
  tipo: "materiales" | "efectivo";
  /** Descuento aplicado en cada valorización (clave = id de valorización). */
  amortizaciones: Record<string, number>;
}

/**
 * Subcontrato de mano de obra/ejecución por módulo — el "cuadro de
 * valorización" se emite contra uno de estos.
 */
export interface Contrato {
  id: string;
  subcontratista: string;
  entidadId: string;
  beneficiarioIds: string[];
  costoUnitario: number;
  fechaInicio: ISODate;
  plazoDias: number;
  adicionales: MovimientoContrato[];
  adelantos: Adelanto[];
}

export type EstadoValorizacion = "borrador" | "aprobada" | "pagada";

export interface Valorizacion {
  id: string;
  numero: number;
  contratoId: string;
  fechaCorte: ISODate;
  estado: EstadoValorizacion;
  /**
   * Avance ACUMULADO al corte, por beneficiario y partida, en % de la
   * partida (0–100). El aporte al módulo es `peso × avance / 100`.
   */
  avances: Record<string, Record<string, number>>;
  observaciones?: string;
  demo?: boolean;
}

export type TipoFianza = "fiel_cumplimiento" | "adelanto" | "bfh" | "otra";
export type EstadoFianza = "vigente" | "renovada" | "liberada" | "ejecutada";

export interface Fianza {
  id: string;
  numero: string;
  entidadId: string;
  emisor: string; // banco / aseguradora / FOGAPI…
  tipo: TipoFianza;
  monto: number;
  fechaEmision: ISODate;
  fechaVencimiento: ISODate;
  beneficiarioIds: string[];
  estado: EstadoFianza;
  observaciones?: string;
}

/** Categorías 6M (Ishikawa) para análisis de causa raíz. */
export type Categoria6M =
  | "mano_obra"
  | "materiales"
  | "metodo"
  | "maquinaria"
  | "medio_ambiente"
  | "medicion"
  | "gestion";

export type EstadoAccion = "plan" | "hacer" | "verificar" | "actuar" | "cerrada";

/** Acción correctiva / de mejora — ciclo PDCA. */
export interface Accion {
  id: string;
  creada: ISODate;
  alertaClave?: string;
  problema: string;
  categoria: Categoria6M;
  causaRaiz: string;
  accion: string;
  responsable: string;
  fechaCompromiso: ISODate;
  estado: EstadoAccion;
  beneficiarioIds: string[];
  resultado?: string;
}

export interface ObraConfig {
  nombre: string;
  programa: string;
  modalidad: string;
  convocatoria: string;
  distrito: string;
  provincia: string;
  departamento: string;
  areaModuloM2: number;
  /** Valor del BFH por familia (S/) — varía por ámbito; editable. */
  valorBfh: number;
  /** Ahorro mínimo de la familia (S/). */
  ahorroFamilia: number;
  /** Cobertura de garantía exigida sobre BFH + ahorro (1.05 = 105 %). */
  coberturaGarantia: number;
  fechaInicio: ISODate;
  plazoModuloDias: number;
  /** Desfase de inicio entre grupos (días). */
  desfaseGrupoDias: number;
  plazoTotalDias: number;
  umbralSpiAlerta: number;
  umbralSpiCritico: number;
  diasAvisoFianza: number;
}

export interface ObraState {
  id: string;
  version: number;
  updatedAt: string;
  config: ObraConfig;
  entidades: EntidadTecnica[];
  partidas: Partida[];
  beneficiarios: Beneficiario[];
  contratos: Contrato[];
  valorizaciones: Valorizacion[];
  fianzas: Fianza[];
  acciones: Accion[];
}
