import "server-only";
import type { z } from "zod";
import { readJson, writeJson } from "./json-store";
import { SETTINGS_FILE } from "./paths";
import type { SiteSettings } from "@/types/content";
import type { settingsPatchSchema } from "./validation";
import defaultSettings from "../../data/settings.json";

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export async function getSettings(): Promise<SiteSettings> {
  return readJson<SiteSettings>(
    SETTINGS_FILE,
    defaultSettings as unknown as SiteSettings,
  );
}

export async function updateSettings(
  patch: SettingsPatch,
): Promise<SiteSettings> {
  const current = await getSettings();
  const next: SiteSettings = {
    ...current,
    ...patch,
    company: { ...current.company, ...(patch.company ?? {}) },
    hero: { ...current.hero, ...(patch.hero ?? {}) },
    about: { ...current.about, ...(patch.about ?? {}) },
    services: patch.services ?? current.services,
    stats: patch.stats ?? current.stats,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(SETTINGS_FILE, next);
  return next;
}
