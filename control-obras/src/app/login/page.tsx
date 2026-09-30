"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardHat, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo iniciar sesión");
      }
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink focus:border-ink/50 focus:outline-none";
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-paper p-9 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-bone">
            <HardHat size={20} />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight">Control de Obras</p>
            <p className="text-xs text-stone">Módulos de vivienda · Techo Propio</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
            Usuario
            <input name="username" required autoComplete="username" className={`${input} mt-2`} />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
            Contraseña
            <input name="password" type="password" required autoComplete="current-password" className={`${input} mt-2`} />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-bone hover:bg-ink-soft disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
