import { NextRequest, NextResponse } from "next/server";
import { deleteMediaFile, listMedia } from "@/lib/media";
import { z } from "zod";

export async function GET() {
  const files = await listMedia();
  return NextResponse.json({ files });
}

const schema = z.object({ url: z.string().min(1) });

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const ok = await deleteMediaFile(parsed.data.url);
  if (!ok) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
