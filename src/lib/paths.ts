import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
export const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
export const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
export const UPLOADS_PUBLIC_PREFIX = "/uploads";
