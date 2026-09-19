import { NextRequest, NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/projects";
import { projectInputSchema } from "@/lib/validation";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = await createProject(parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
