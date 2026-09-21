import { NextRequest, NextResponse } from "next/server";
import { setTicketsStatus } from "@/lib/raffle";
import { adminTicketBulkUpdateSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = adminTicketBulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const numbers = Array.from(new Set(parsed.data.numbers));
  const tickets = await setTicketsStatus(numbers, parsed.data);
  return NextResponse.json({ tickets });
}
