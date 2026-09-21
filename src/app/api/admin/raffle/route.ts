import { NextRequest, NextResponse } from "next/server";
import { getRaffleConfig, getTickets, updateRaffleConfig } from "@/lib/raffle";
import { raffleConfigPatchSchema } from "@/lib/validation";

export async function GET() {
  const [config, tickets] = await Promise.all([getRaffleConfig(), getTickets()]);
  return NextResponse.json({ config, tickets });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = raffleConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const config = await updateRaffleConfig(parsed.data);
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo actualizar el sorteo" },
      { status: 400 },
    );
  }
}
