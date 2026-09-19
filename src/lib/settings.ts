import "server-only";
import type { z } from "zod";
import { sql, ensureSchema } from "./db";
import type { SiteSettings } from "@/types/content";
import type { settingsPatchSchema } from "./validation";
import defaultSettings from "../../data/settings.json";

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

interface SettingsRow {
  company: SiteSettings["company"];
  hero: SiteSettings["hero"];
  about: SiteSettings["about"];
  services: SiteSettings["services"];
  stats: SiteSettings["stats"];
  updated_at: string;
}

function rowToSettings(row: SettingsRow): SiteSettings {
  return {
    company: row.company,
    hero: row.hero,
    about: row.about,
    services: row.services,
    stats: row.stats,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getSettings(): Promise<SiteSettings> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM settings WHERE id = 1 LIMIT 1
  `) as unknown as SettingsRow[];

  if (rows.length === 0) {
    const seed = defaultSettings as unknown as SiteSettings;
    return updateSettings(seed);
  }
  return rowToSettings(rows[0]);
}

export async function updateSettings(
  patch: SettingsPatch,
): Promise<SiteSettings> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM settings WHERE id = 1 LIMIT 1`) as unknown as SettingsRow[];
  const seed = defaultSettings as unknown as SiteSettings;
  const current = rows[0] ? rowToSettings(rows[0]) : seed;

  const next: SiteSettings = {
    ...current,
    ...patch,
    company: { ...current.company, ...(patch.company ?? {}) },
    hero: { ...current.hero, ...(patch.hero ?? {}) },
    about: { ...current.about, ...(patch.about ?? {}) },
    services: patch.services ?? current.services,
    stats: patch.stats ?? current.stats,
  };

  const updatedRows = (await sql`
    INSERT INTO settings (id, company, hero, about, services, stats, updated_at)
    VALUES (
      1, ${JSON.stringify(next.company)}, ${JSON.stringify(next.hero)},
      ${JSON.stringify(next.about)}, ${JSON.stringify(next.services)},
      ${JSON.stringify(next.stats)}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      company = EXCLUDED.company,
      hero = EXCLUDED.hero,
      about = EXCLUDED.about,
      services = EXCLUDED.services,
      stats = EXCLUDED.stats,
      updated_at = now()
    RETURNING *
  `) as unknown as SettingsRow[];

  return rowToSettings(updatedRows[0]);
}
