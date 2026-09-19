import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@/lib/messages";
import { contactMessageSchema } from "@/lib/validation";

const submissionsByIp = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionsByIp.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return timestamps.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados envíos, intenta nuevamente en unos minutos." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa los campos del formulario", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // honeypot triggered — silently pretend success
  if (parsed.data.company_website) {
    return NextResponse.json({ ok: true });
  }

  const { company_website: _honeypot, ...rest } = parsed.data;
  void _honeypot;
  await addMessage(rest);
  return NextResponse.json({ ok: true }, { status: 201 });
}
