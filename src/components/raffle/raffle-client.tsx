"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageCircle, Search, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublicRaffleTicket, RaffleConfig, TicketStatus } from "@/types/content";

const STATUS_CLASS: Record<TicketStatus, string> = {
  disponible: "border-line bg-paper text-ink hover:border-clay",
  reservado: "border-amber-300 bg-amber-100 text-amber-800 cursor-not-allowed",
  vendido: "border-clay/30 bg-clay/10 text-clay-dark cursor-not-allowed",
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currency || "PEN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function RaffleClient({
  config,
  initialTickets,
  whatsappFallback,
}: {
  config: RaffleConfig;
  initialTickets: PublicRaffleTicket[];
  whatsappFallback?: string;
}) {
  const [tickets, setTickets] = useState<PublicRaffleTicket[]>(initialTickets);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);

  const byNumber = useMemo(() => new Map(tickets.map((t) => [t.number, t])), [tickets]);
  const padLength = String(config.totalTickets).length;
  const isActive = config.status === "activo";

  const numbers = useMemo(() => {
    const all = Array.from({ length: config.totalTickets }, (_, i) => i + 1);
    if (!query.trim()) return all;
    return all.filter((n) => String(n).includes(query.trim()));
  }, [config.totalTickets, query]);

  function toggle(n: number) {
    if (!isActive) return;
    const t = byNumber.get(n);
    if (!t || t.status !== "disponible") return;
    setSelected((sel) => (sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n]));
  }

  const total = selected.length * config.ticketPrice;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.length === 0) return;
    setStatus("loading");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/raffle/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: selected,
          buyerName: data.buyerName,
          buyerPhone: data.buyerPhone,
          buyerEmail: data.buyerEmail || undefined,
          note: data.note || undefined,
          company_website: data.company_website || undefined,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (Array.isArray(body.unavailable)) {
          const taken: number[] = body.unavailable;
          setTickets((items) =>
            items.map((t) => (taken.includes(t.number) ? { ...t, status: "reservado" } : t)),
          );
          setSelected((sel) => sel.filter((n) => !taken.includes(n)));
        }
        throw new Error(body.error ?? "No pudimos reservar tus números");
      }

      setTickets((items) =>
        items.map((t) => (selected.includes(t.number) ? { ...t, status: "reservado" } : t)),
      );

      const phone = (config.whatsapp || whatsappFallback || "").replace(/\D/g, "");
      const numbersLabel = selected.map((n) => String(n).padStart(padLength, "0")).join(", ");
      const message = [
        `Hola, quiero confirmar mi compra del sorteo "${config.title}".`,
        `Números: ${numbersLabel}`,
        `Total: ${formatMoney(total, config.currency)}`,
        `Nombre: ${data.buyerName}`,
      ].join("\n");
      const link = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
      setWaLink(link);
      if (link) window.open(link, "_blank", "noopener,noreferrer");

      setStatus("success");
      setSelected([]);
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
    }
  }

  if (!isActive) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-10 text-center">
        <p className="text-stone">
          {config.status === "cerrado"
            ? "Este sorteo ya finalizó. ¡Gracias a todos los participantes!"
            : "Este sorteo aún no está disponible para la compra de números."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone">
            <LegendDot className="border border-line bg-paper" label="Disponible" />
            <LegendDot className="border border-amber-300 bg-amber-100" label="Reservado" />
            <LegendDot className="border border-clay/30 bg-clay/10" label="Vendido" />
          </div>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\D/g, ""))}
              placeholder="Buscar número"
              className="w-36 rounded-full border border-line bg-paper py-2 pl-8 pr-3 text-sm focus:border-clay focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5 rounded-2xl border border-line bg-paper p-4">
          {numbers.map((n) => {
            const t = byNumber.get(n);
            const s = t?.status ?? "disponible";
            const isSelected = selected.includes(n);
            return (
              <button
                key={n}
                type="button"
                disabled={s !== "disponible"}
                onClick={() => toggle(n)}
                className={cn(
                  "rounded-lg border px-1 py-2 text-center text-xs font-semibold tabular-nums transition-colors",
                  isSelected ? "border-clay bg-clay text-bone" : STATUS_CLASS[s],
                )}
              >
                {String(n).padStart(padLength, "0")}
              </button>
            );
          })}
          {numbers.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-stone">
              Ningún número coincide con tu búsqueda.
            </p>
          )}
        </div>
      </div>

      <div className="h-fit rounded-2xl border border-line bg-paper p-6 lg:sticky lg:top-28">
        <h3 className="font-display text-lg font-bold text-ink">Tu selección</h3>

        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-stone">
            Elige uno o más números disponibles en el tablero.
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone">
            {selected.length} número{selected.length > 1 ? "s" : ""} ·{" "}
            {selected.map((n) => String(n).padStart(padLength, "0")).join(", ")}
          </p>
        )}

        <p className="mt-4 font-display text-2xl font-bold text-ink">
          {formatMoney(total, config.currency)}
        </p>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 space-y-3 rounded-xl border border-clay/30 bg-clay/10 p-4"
          >
            <CheckCircle2 size={24} className="text-clay" />
            <p className="text-sm text-ink">
              ¡Tus números quedaron reservados! Te abrimos WhatsApp para confirmar el pago con el
              administrador.
            </p>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-clay-dark underline"
              >
                <MessageCircle size={14} /> Abrir WhatsApp de nuevo
              </a>
            )}
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="block text-sm font-semibold text-ink underline underline-offset-4"
            >
              Comprar más números
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Field label="Nombre completo" name="buyerName" required />
            <Field label="WhatsApp / teléfono" name="buyerPhone" required />
            <Field label="Correo (opcional)" name="buyerEmail" type="email" />
            <Field label="Nota (opcional)" name="note" />
            {/* honeypot — hidden from real users, catches simple bots */}
            <input
              type="text"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={selected.length === 0 || status === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShoppingCart size={16} />
              )}
              Reservar y continuar por WhatsApp
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded", className)} />
      {label}
    </span>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-stone">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-line bg-bone px-3.5 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}
