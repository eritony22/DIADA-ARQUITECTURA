import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { BLOB_TOKEN } from "@/lib/blob-token";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

// Vercel's serverless functions reject request bodies above ~4.5MB at the
// platform level (before this handler even runs), so the app-level limit
// has to stay under that regardless of what the UI would otherwise allow.
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest) {
  try {
    if (!BLOB_TOKEN) {
      return NextResponse.json(
        {
          error:
            "El almacenamiento de imágenes no está configurado (falta BLOB_READ_WRITE_TOKEN). Contacta al administrador del sitio.",
        },
        { status: 500 },
      );
    }

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

    const uploaded: { url: string; name: string; size: number }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const ext = ALLOWED_TYPES[file.type];
      if (!ext) {
        errors.push(`${file.name}: formato no permitido (${file.type || "desconocido"})`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        errors.push(`${file.name}: supera el tamaño máximo de 4MB`);
        continue;
      }

      try {
        const pathname = `uploads/${subdir}/${randomUUID()}.${ext}`;
        const blob = await put(pathname, file, {
          access: "public",
          contentType: file.type,
          addRandomSuffix: false,
          token: BLOB_TOKEN,
        });

        uploaded.push({
          url: blob.url,
          name: file.name,
          size: file.size,
        });
      } catch (err) {
        errors.push(
          `${file.name}: ${err instanceof Error ? err.message : "error al subir"}`,
        );
      }
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "No se pudo subir ningún archivo", details: errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ files: uploaded, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado al subir" },
      { status: 500 },
    );
  }
}
