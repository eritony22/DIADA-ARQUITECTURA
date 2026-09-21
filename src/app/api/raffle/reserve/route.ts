import { NextRequest, NextResponse } from "next/server";
import { getRaffleConfig, reserveTickets } from "@/lib/raffle";
import { raffleReserveSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = raffleReserveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // honeypot — real users never fill this field
  if (parsed.data.company_website) {
    return NextResponse.json({ error: "No se pudo procesar la reserva" }, { status: 400 });
  }

  const config = await getRaffleConfig();
  if (config.status !== "activo") {
    return NextResponse.json(
      { error: "Este sorteo no está disponible para la compra de números en este momento" },
      { status: 400 },
    );
  }

  const numbers = Array.from(new Set(parsed.data.numbers)).sort((a, b) => a - b);
  const outOfRange = numbers.filter((n) => n > config.totalTickets);
  if (outOfRange.length > 0) {
    return NextResponse.json(
      { error: `Los números ${outOfRange.join(", ")} no existen en este sorteo` },
      { status: 400 },
    );
  }

  const result = await reserveTickets(numbers, {
    name: parsed.data.buyerName,
    phone: parsed.data.buyerPhone,
    email: parsed.data.buyerEmail || undefined,
    note: parsed.data.note,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `Los números ${result.unavailable.join(", ")} ya no están disponibles. Actualiza la página e inténtalo de nuevo.`,
        unavailable: result.unavailable,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ tickets: result.tickets });
}
