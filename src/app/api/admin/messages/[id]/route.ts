import { NextRequest, NextResponse } from "next/server";
import { deleteMessage, markMessageRead } from "@/lib/messages";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({ read: z.boolean() });

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const ok = await markMessageRead(id, parsed.data.read);
  if (!ok) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = await deleteMessage(id);
  if (!ok) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
