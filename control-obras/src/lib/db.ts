import "server-only";
import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;

function getClient(): Sql {
  if (client) return client;
  const connectionString =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL (o POSTGRES_URL). Conecta una base de datos Postgres " +
        "(Neon) al proyecto en Vercel, o defínela en .env.local.",
    );
  }
  client = neon(connectionString);
  return client;
}

// Conecta recién en la primera consulta, para que `next build` no exija
// DATABASE_URL al importar este módulo.
export const sql: Sql = ((...args: Parameters<Sql>) => getClient()(...args)) as Sql;
