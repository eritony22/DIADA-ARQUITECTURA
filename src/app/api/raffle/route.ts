import { NextResponse } from "next/server";
import { getPublicTickets, getRaffleConfig } from "@/lib/raffle";

export async function GET() {
  const [config, tickets] = await Promise.all([getRaffleConfig(), getPublicTickets()]);
  return NextResponse.json({ config, tickets });
}
