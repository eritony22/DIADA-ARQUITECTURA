import { NextResponse } from "next/server";
import { seedSampleProjects } from "@/lib/projects";

// One-click bootstrap for a freshly-connected database, used by the "Cargar
// proyectos de ejemplo" button on the empty admin projects list — an
// alternative to running `npm run db:migrate` from a terminal, for
// deployments where nobody has local Node.js access.
export async function POST() {
  const inserted = await seedSampleProjects();
  return NextResponse.json({ inserted });
}
