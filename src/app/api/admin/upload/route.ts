import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR, UPLOADS_PUBLIC_PREFIX } from "@/lib/paths";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo" },
      { status: 400 },
    );
  }

  const now = new Date();
  const subdir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetDir = path.join(UPLOADS_DIR, subdir);
  await fs.mkdir(targetDir, { recursive: true });

  const uploaded: { url: string; name: string; size: number }[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      errors.push(`${file.name}: formato no permitido (${file.type || "desconocido"})`);
      continue;
    }
    if (file.size > MAX_SIZE_BYTES) {
      errors.push(`${file.name}: supera el tamaño máximo de 20MB`);
      continue;
    }

    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(targetDir, filename), buffer);

    uploaded.push({
      url: `${UPLOADS_PUBLIC_PREFIX}/${subdir}/${filename}`,
      name: file.name,
      size: file.size,
    });
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: "No se pudo subir ningún archivo", details: errors },
      { status: 400 },
    );
  }

  return NextResponse.json({ files: uploaded, errors });
}
