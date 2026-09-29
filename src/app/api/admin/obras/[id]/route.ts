import { NextRequest, NextResponse } from "next/server";
import { ConflictoVersion, getObra, saveObra } from "@/lib/obras/store";
import { obraStateSchema } from "@/lib/obras/schema";
import type { ObraState } from "@/types/obras";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const obra = await getObra(id);
  if (!obra) {
    return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ obra });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = obraStateSchema.safeParse(body?.obra);
  if (!parsed.success || parsed.data.id !== id) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        issues: parsed.success ? undefined : parsed.error.issues.slice(0, 10),
      },
      { status: 400 },
    );
  }
  try {
    const obra = await saveObra(parsed.data as ObraState, parsed.data.version);
    return NextResponse.json({ obra });
  } catch (error) {
    if (error instanceof ConflictoVersion) {
      const actual = await getObra(id);
      return NextResponse.json(
        { error: error.message, obra: actual },
        { status: 409 },
      );
    }
    throw error;
  }
}
