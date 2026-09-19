import "server-only";
import { list, del } from "@vercel/blob";

export interface MediaFile {
  url: string;
  name: string;
  size: number;
  modifiedAt: string;
}

const UPLOADS_PREFIX = "uploads/";

export async function listMedia(): Promise<MediaFile[]> {
  const files: MediaFile[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: UPLOADS_PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      files.push({
        url: blob.url,
        name: blob.pathname.split("/").pop() ?? blob.pathname,
        size: blob.size,
        modifiedAt: blob.uploadedAt.toISOString(),
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return files.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
}

export async function deleteMediaFile(url: string): Promise<boolean> {
  if (!url.includes("blob.vercel-storage.com")) return false;
  try {
    await del(url);
    return true;
  } catch {
    return false;
  }
}
