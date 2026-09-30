"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Beneficiario, ISODate, ObraState } from "@/types/obras";
import {
  indicadorBeneficiario,
  resumen,
  soloRegistradas,
  todayISO,
  ultimaFechaCorte,
  type IndicadorBeneficiario,
  type Resumen,
} from "@/lib/obras/calc";
import { diagnosticar, type Alerta } from "@/lib/obras/diagnostico";

export type SaveStatus = "saved" | "pending" | "saving" | "error" | "conflict";

export interface Filtros {
  entidad: string; // "all" o id
  grupo: string; // "all" o número
  q: string;
}

interface ObraContextValue {
  obra: ObraState;
  /** La obra con solo las semanas registradas: base de todos los indicadores. */
  obraReal: ObraState;
  usuario: string | null;
  update: (recipe: (draft: ObraState) => void) => void;
  replace: (next: ObraState) => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  reloadFromServer: () => Promise<void>;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  fecha: ISODate;
  setFecha: (f: ISODate) => void;
  /** Beneficiarios que pasan los filtros globales. */
  seleccion: Beneficiario[];
  seleccionIds: Set<string>;
  indicadores: IndicadorBeneficiario[];
  resumen: Resumen;
  alertas: Alerta[];
}

const ObraContext = createContext<ObraContextValue | null>(null);

export function useObra(): ObraContextValue {
  const ctx = useContext(ObraContext);
  if (!ctx) throw new Error("useObra debe usarse dentro de <ObraProvider>");
  return ctx;
}

function fechaPorDefecto(obra: ObraState): ISODate {
  const hoy = todayISO();
  const ultima = ultimaFechaCorte(obra.valorizaciones);
  return ultima && ultima > hoy ? ultima : hoy;
}

export function ObraProvider({
  initial,
  usuario,
  children,
}: {
  initial: ObraState;
  usuario: string | null;
  children: ReactNode;
}) {
  const [obra, setObra] = useState<ObraState>(initial);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ entidad: "all", grupo: "all", q: "" });
  const [fecha, setFecha] = useState<ISODate>(() => fechaPorDefecto(initial));

  // Guardado automático con debounce. `latest` es siempre el estado local
  // más reciente; `inFlight` evita dos PUT simultáneos (el segundo se
  // encadena cuando termina el primero, con la versión actualizada).
  const latest = useRef(obra);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const flush = useCallback(async () => {
    if (inFlight.current || !dirty.current) return;
    inFlight.current = true;
    dirty.current = false;
    setSaveStatus("saving");
    const enviado = latest.current;
    let fallo = false;
    try {
      const res = await fetch(`/api/obras/${enviado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obra: enviado }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setSaveStatus("conflict");
        setSaveError(
          "Otra sesión guardó cambios en esta obra. Recarga para ver la versión actual (tus últimos cambios no se guardaron).",
        );
        inFlight.current = false;
        return;
      }
      if (!res.ok) {
        throw new Error(
          body?.error
            ? `${body.error}${body.issues?.[0] ? ` — ${body.issues[0].path?.join(".")}: ${body.issues[0].message}` : ""}`
            : `Error ${res.status}`,
        );
      }
      const guardado = body.obra as ObraState;
      const merged = { ...latest.current, version: guardado.version, updatedAt: guardado.updatedAt };
      latest.current = merged;
      setObra(merged);
      setSaveError(null);
      setSaveStatus(dirty.current ? "pending" : "saved");
    } catch (e) {
      fallo = true;
      dirty.current = true;
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      inFlight.current = false;
    }
    // Cambios hechos mientras se guardaba: se envían a continuación.
    if (dirty.current && !fallo) void flushRef.current();
  }, []);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setSaveStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  }, [flush]);

  const update = useCallback(
    (recipe: (draft: ObraState) => void) => {
      const draft = structuredClone(latest.current);
      recipe(draft);
      latest.current = draft;
      setObra(draft);
      schedule();
    },
    [schedule],
  );

  const replace = useCallback(
    (next: ObraState) => {
      const merged = { ...next, id: latest.current.id, version: latest.current.version };
      latest.current = merged;
      setObra(merged);
      schedule();
    },
    [schedule],
  );

  const reloadFromServer = useCallback(async () => {
    const res = await fetch(`/api/obras/${latest.current.id}`);
    if (!res.ok) return;
    const body = await res.json();
    latest.current = body.obra;
    dirty.current = false;
    setObra(body.obra);
    setSaveStatus("saved");
    setSaveError(null);
  }, []);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const seleccion = useMemo(() => {
    const q = filtros.q.trim().toUpperCase();
    return obra.beneficiarios.filter(
      (b) =>
        (filtros.entidad === "all" || b.entidadId === filtros.entidad) &&
        (filtros.grupo === "all" || String(b.grupo) === filtros.grupo) &&
        (!q ||
          `${b.apPaterno} ${b.apMaterno} ${b.nombres} ${b.numDoc} ${b.direccion}`
            .toUpperCase()
            .includes(q)),
    );
  }, [obra.beneficiarios, filtros]);

  const seleccionIds = useMemo(() => new Set(seleccion.map((b) => b.id)), [seleccion]);

  const obraReal = useMemo(() => soloRegistradas(obra), [obra]);
  const indicadores = useMemo(
    () => seleccion.map((b) => indicadorBeneficiario(b, obraReal, fecha)),
    [seleccion, obraReal, fecha],
  );
  const res = useMemo(() => resumen(indicadores, obra.config), [indicadores, obra.config]);
  const alertas = useMemo(
    () => diagnosticar(obra, fecha, seleccionIds),
    [obra, fecha, seleccionIds],
  );

  const value: ObraContextValue = {
    obra,
    obraReal,
    usuario,
    update,
    replace,
    saveStatus,
    saveError,
    reloadFromServer,
    filtros,
    setFiltros,
    fecha,
    setFecha,
    seleccion,
    seleccionIds,
    indicadores,
    resumen: res,
    alertas,
  };

  return <ObraContext.Provider value={value}>{children}</ObraContext.Provider>;
}
