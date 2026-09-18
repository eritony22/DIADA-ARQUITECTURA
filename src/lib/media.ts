import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOADS_DIR, UPLOADS_PUBLIC_PREFIX } from "./paths";

export interface MediaFile {
  url: string;
  name: string;
  size: number;
  modifiedAt: string;
}

async function walk(dir: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

export async function listMedia(): Promise<MediaFile[]> {
  const files = await walk(UPLOADS_DIR);
  const stats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(file);
      const relative = path.relative(UPLOADS_DIR, file).split(path.sep).join("/");
      return {
        url: `${UPLOADS_PUBLIC_PREFIX}/${relative}`,
        name: path.basename(file),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    }),
  );
  return stats.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
}

export async function deleteMediaFile(url: string): Promise<boolean> {
  if (!url.startsWith(UPLOADS_PUBLIC_PREFIX)) return false;
  const relative = url.slice(UPLOADS_PUBLIC_PREFIX.length).replace(/^\/+/, "");
  const normalized = path.normalize(relative);
  if (normalized.startsWith("..")) return false;

  const fullPath = path.join(UPLOADS_DIR, normalized);
  try {
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
