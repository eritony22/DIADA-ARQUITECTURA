import { NextRequest, NextResponse } from "next/server";
import { crearSesion, verificarCredenciales } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body?.username || !body.password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
  }
  const resultado = await verificarCredenciales(body.username, body.password);
  if (resultado === "sin_configurar") {
    // Mensaje distinto para no confundir una falta de configuración con una clave errada.
    return NextResponse.json(
      {
        error:
          "El acceso no está configurado en este despliegue: faltan ADMIN_USERNAME, ADMIN_PASSWORD_HASH o SESSION_SECRET en las variables de entorno.",
      },
      { status: 503 },
    );
  }
  if (resultado === "invalidas") {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }
  await crearSesion(body.username);
  return NextResponse.json({ ok: true });
}
