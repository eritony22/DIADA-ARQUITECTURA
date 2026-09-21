import { NextRequest, NextResponse } from "next/server";
import { setTicketStatus } from "@/lib/raffle";
import { adminTicketUpdateSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ number: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { number } = await params;
  const ticketNumber = Number(number);
  if (!Number.isInteger(ticketNumber) || ticketNumber < 1) {
    return NextResponse.json({ error: "Número de ticket inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminTicketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ticket = await setTicketStatus(ticketNumber, parsed.data);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}
