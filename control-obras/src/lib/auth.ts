import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "control_obras_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurado.");
  }
  return new TextEncoder().encode(secret);
}

export type ResultadoCredenciales = "ok" | "invalidas" | "sin_configurar";

export async function verificarCredenciales(
  username: string,
  password: string,
): Promise<ResultadoCredenciales> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !expectedHash || !process.env.SESSION_SECRET) return "sin_configurar";
  if (username !== expectedUser) return "invalidas";
  return (await bcrypt.compare(password, expectedHash)) ? "ok" : "invalidas";
}

export async function crearSesion(username: string): Promise<void> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function cerrarSesion(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual (para registrar quién cerró cada semana). */
export async function usuarioActual(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.username === "string" ? payload.username : null;
  } catch {
    return null;
  }
}
