import "server-only";
import { promises as fs } from "node:fs";

/**
 * Minimal JSON-file persistence. Reads/writes are serialized per file via a
 * promise chain so concurrent admin requests never interleave writes and
 * corrupt the file.
 */
const writeQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(file) ?? Promise.resolve();
  const next = previous.then(task, task);
  writeQueues.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson<T>(file: string, data: T): Promise<T> {
  return enqueue(file, async () => {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
    await fs.rename(tmp, file);
    return data;
  });
}
