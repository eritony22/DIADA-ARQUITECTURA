import "server-only";
import { sql, ensureSchema } from "../db";
import type { ObraState } from "@/types/obras";
import seed from "../../../data/obras-vraem-2026.json";

export const OBRA_POR_DEFECTO = "vraem-2026-pangoa";

let tableReady: Promise<void> | null = null;

function ensureObrasTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await ensureSchema();
      await sql`
        CREATE TABLE IF NOT EXISTS obras (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          version INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return tableReady;
}

interface ObraRow {
  data: ObraState;
  version: number;
  updated_at: string;
}

function rowToState(row: ObraRow): ObraState {
  return {
    ...row.data,
    version: row.version,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Devuelve la obra; si no existe todavía, la crea desde la semilla (sin datos
 * personales — los beneficiarios se importan desde el panel).
 */
export async function getObra(id: string): Promise<ObraState | null> {
  await ensureObrasTable();
  const rows = (await sql`
    SELECT data, version, updated_at FROM obras WHERE id = ${id} LIMIT 1
  `) as unknown as ObraRow[];
  if (rows[0]) return rowToState(rows[0]);
  if (id !== OBRA_POR_DEFECTO) return null;

  const inicial = { ...(seed as unknown as ObraState), id };
  await sql`
    INSERT INTO obras (id, data, version)
    VALUES (${id}, ${JSON.stringify(inicial)}::jsonb, 0)
    ON CONFLICT (id) DO NOTHING
  `;
  return getObra(id);
}

export class ConflictoVersion extends Error {}

/**
 * Guarda la obra con control de concurrencia optimista: sólo escribe si la
 * versión en base de datos es la misma que editó el cliente, para que dos
 * personas editando a la vez no se pisen los cambios en silencio.
 */
export async function saveObra(
  state: ObraState,
  versionBase: number,
): Promise<ObraState> {
  await ensureObrasTable();
  const { version: _v, updatedAt: _u, ...data } = state;
  void _v;
  void _u;
  const rows = (await sql`
    UPDATE obras
    SET data = ${JSON.stringify(data)}::jsonb,
        version = version + 1,
        updated_at = now()
    WHERE id = ${state.id} AND version = ${versionBase}
    RETURNING data, version, updated_at
  `) as unknown as ObraRow[];
  if (!rows[0]) throw new ConflictoVersion("La obra fue modificada por otra sesión.");
  return rowToState(rows[0]);
}
