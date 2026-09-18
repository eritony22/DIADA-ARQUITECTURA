import { NextRequest, NextResponse } from "next/server";
import { reorderProjects } from "@/lib/projects";
import { z } from "zod";

const schema = z.object({ order: z.array(z.string()).min(1) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const projects = await reorderProjects(parsed.data.order);
  return NextResponse.json({ projects });
}
