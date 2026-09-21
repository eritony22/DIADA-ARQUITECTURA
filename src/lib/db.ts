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
      "No se encontró la variable de entorno de conexión a la base de datos " +
        "(DATABASE_URL / POSTGRES_URL). Conecta una base de datos Postgres " +
        "(Neon) desde el dashboard de Vercel, o defínela en tu .env.local.",
    );
  }

  client = neon(connectionString);
  return client;
}

// Connects lazily on the first query instead of at module load, so importing
// this module (which `next build`'s route-data collection does for every
// route, whether or not it touches the database) doesn't require
// DATABASE_URL to already be set.
export const sql: Sql = ((...args: Parameters<Sql>) =>
  getClient()(...args)) as Sql;

let schemaReady: Promise<void> | null = null;

/**
 * Creates the tables on first use if they don't exist yet. Cheap to call on
 * every cold start — each statement is a no-op once the schema exists — and
 * avoids requiring a separate manual migration step on first deploy.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          location TEXT NOT NULL,
          year TEXT NOT NULL,
          area TEXT,
          client TEXT,
          status TEXT NOT NULL,
          summary TEXT NOT NULL,
          description JSONB NOT NULL DEFAULT '[]',
          materials JSONB NOT NULL DEFAULT '[]',
          services JSONB NOT NULL DEFAULT '[]',
          cover_image TEXT NOT NULL,
          gallery JSONB NOT NULL DEFAULT '[]',
          featured BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          company JSONB NOT NULL,
          hero JSONB NOT NULL,
          about JSONB NOT NULL,
          services JSONB NOT NULL,
          stats JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT settings_singleton CHECK (id = 1)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          subject TEXT,
          message TEXT NOT NULL,
          read BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS raffle_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          title TEXT NOT NULL,
          subtitle TEXT,
          description TEXT NOT NULL DEFAULT '',
          rules JSONB NOT NULL DEFAULT '[]',
          prizes JSONB NOT NULL DEFAULT '[]',
          media JSONB NOT NULL DEFAULT '[]',
          total_tickets INTEGER NOT NULL DEFAULT 100,
          ticket_price NUMERIC NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'PEN',
          whatsapp TEXT,
          draw_date TEXT,
          status TEXT NOT NULL DEFAULT 'borrador',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT raffle_config_singleton CHECK (id = 1)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS raffle_tickets (
          number INTEGER PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'disponible',
          buyer_name TEXT,
          buyer_phone TEXT,
          buyer_email TEXT,
          note TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return schemaReady;
}
