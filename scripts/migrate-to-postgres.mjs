// One-time seed: copies the JSON fixtures in /data into the connected
// Postgres database. Safe to re-run — existing rows (matched by id) are
// left untouched via ON CONFLICT DO NOTHING.
//
// Usage (loads env vars from .env.local automatically via --env-file):
//   node --env-file=.env.local scripts/migrate-to-postgres.mjs
//
// Point DATABASE_URL at your production database (copy it from the Vercel
// dashboard -> Storage -> your Postgres database -> .env.local tab) to seed
// production, or leave your local .env.local as-is to seed a dev database.

import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  console.error(
    "Falta DATABASE_URL / POSTGRES_URL. Define la variable de conexión " +
      "a Postgres antes de correr este script (ver el comentario al inicio del archivo).",
  );
  process.exit(1);
}

const sql = neon(connectionString);

async function readJson(file, fallback) {
  try {
    const raw = await readFile(path.join(ROOT, "data", file), "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function ensureSchema() {
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
}

async function migrateProjects() {
  const projects = await readJson("projects.json", []);
  for (const p of projects) {
    await sql`
      INSERT INTO projects (
        id, slug, title, category, location, year, area, client, status,
        summary, description, materials, services, cover_image, gallery,
        featured, "order", created_at, updated_at
      ) VALUES (
        ${p.id}, ${p.slug}, ${p.title}, ${p.category}, ${p.location}, ${p.year},
        ${p.area ?? null}, ${p.client ?? null}, ${p.status}, ${p.summary},
        ${JSON.stringify(p.description ?? [])}, ${JSON.stringify(p.materials ?? [])},
        ${JSON.stringify(p.services ?? [])}, ${p.coverImage}, ${JSON.stringify(p.gallery ?? [])},
        ${p.featured}, ${p.order}, ${p.createdAt}, ${p.updatedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ ${projects.length} proyecto(s) procesados`);
}

async function migrateSettings() {
  const settings = await readJson("settings.json", null);
  if (!settings) {
    console.log("• No hay settings.json, se omite");
    return;
  }
  await sql`
    INSERT INTO settings (id, company, hero, about, services, stats, updated_at)
    VALUES (
      1, ${JSON.stringify(settings.company)}, ${JSON.stringify(settings.hero)},
      ${JSON.stringify(settings.about)}, ${JSON.stringify(settings.services)},
      ${JSON.stringify(settings.stats)}, ${settings.updatedAt ?? new Date().toISOString()}
    )
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("✓ Configuración procesada");
}

async function migrateMessages() {
  const messages = await readJson("messages.json", []);
  for (const m of messages) {
    await sql`
      INSERT INTO messages (id, name, email, phone, subject, message, read, created_at)
      VALUES (
        ${m.id}, ${m.name}, ${m.email}, ${m.phone ?? null}, ${m.subject ?? null},
        ${m.message}, ${m.read}, ${m.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ ${messages.length} mensaje(s) procesados`);
}

(async () => {
  await ensureSchema();
  await migrateProjects();
  await migrateSettings();
  await migrateMessages();
  console.log("Listo.");
})();
