"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Loader2, Search, Square, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { TICKET_STATUS_LABELS } from "@/lib/labels";
import type { RaffleTicket, TicketStatus } from "@/types/content";

const STATUS_META: Record<TicketStatus, { dot: string; button: string }> = {
  disponible: {
    dot: "bg-emerald-500",
    button: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400",
  },
  reservado: {
    dot: "bg-amber-500",
    button: "border-amber-300 bg-amber-100 text-amber-800 hover:border-amber-500",
  },
  vendido: {
    dot: "bg-clay",
    button: "border-clay/40 bg-clay/15 text-clay-dark hover:border-clay",
  },
};

export default function RaffleTicketBoard({
  tickets,
  totalTickets,
  onTicketUpdated,
  onTicketsUpdated,
}: {
  tickets: RaffleTicket[];
  totalTickets: number;
  onTicketUpdated: (ticket: RaffleTicket) => void;
  onTicketsUpdated: (tickets: RaffleTicket[]) => void;
}) {
  const [filter, setFilter] = useState<"todos" | TicketStatus>("todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);

  const byNumber = useMemo(() => new Map(tickets.map((t) => [t.number, t])), [tickets]);
  const padLength = String(totalTickets).length;

  const counts = useMemo(() => {
    const c: Record<TicketStatus, number> = { disponible: 0, reservado: 0, vendido: 0 };
    tickets.forEach((t) => {
      c[t.status]++;
    });
    return c;
  }, [tickets]);

  const numbers = useMemo(() => {
    const all = Array.from({ length: totalTickets }, (_, i) => i + 1);
    return all.filter((n) => {
      const status = byNumber.get(n)?.status ?? "disponible";
      if (filter !== "todos" && status !== filter) return false;
      if (query && !String(n).includes(query.trim())) return false;
      return true;
    });
  }, [totalTickets, byNumber, filter, query]);

  const selectedTicket: RaffleTicket | null =
    selected != null
      ? (byNumber.get(selected) ?? {
          number: selected,
          status: "disponible",
          updatedAt: "",
        })
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, ""))}
            placeholder="Buscar número…"
            className="w-40 rounded-full border border-line bg-paper py-2 pl-8 pr-3 text-sm focus:border-clay focus:outline-none"
          />
        </div>
        <FilterChip active={filter === "todos"} onClick={() => setFilter("todos")}>
          Todos ({tickets.length})
        </FilterChip>
        <FilterChip
          active={filter === "disponible"}
          onClick={() => setFilter("disponible")}
          dot="bg-emerald-500"
        >
          Disponibles ({counts.disponible})
        </FilterChip>
        <FilterChip
          active={filter === "reservado"}
          onClick={() => setFilter("reservado")}
          dot="bg-amber-500"
        >
          Reservados ({counts.reservado})
        </FilterChip>
        <FilterChip active={filter === "vendido"} onClick={() => setFilter("vendido")} dot="bg-clay">
          Vendidos ({counts.vendido})
        </FilterChip>

        <button
          type="button"
          onClick={() => {
            setBulkMode((v) => !v);
            setBulkSelected(new Set());
          }}
          className={cn(
            "ml-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            bulkMode ? "border-ink bg-ink text-bone" : "border-line text-stone hover:border-ink hover:text-ink",
          )}
        >
          {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
          Selección múltiple
        </button>
      </div>

      {bulkMode && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bone px-4 py-2.5 text-xs text-stone">
          <span>
            {bulkSelected.size === 0
              ? "Haz clic en los tickets que quieras cambiar."
              : `${bulkSelected.size} ticket${bulkSelected.size > 1 ? "s" : ""} seleccionado${bulkSelected.size > 1 ? "s" : ""}.`}
          </span>
          <button
            type="button"
            onClick={() => setBulkSelected(new Set(numbers))}
            className="font-semibold text-ink underline underline-offset-4"
          >
            Seleccionar visibles ({numbers.length})
          </button>
          {bulkSelected.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => setBulkSelected(new Set())}
                className="font-semibold text-ink underline underline-offset-4"
              >
                Limpiar selección
              </button>
              <button
                type="button"
                onClick={() => setBulkEditorOpen(true)}
                className="ml-auto rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-bone hover:bg-clay"
              >
                Aplicar estado a la selección
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(3.1rem,1fr))] gap-1.5 rounded-2xl border border-line bg-paper p-4">
        {numbers.map((n) => {
          const status = byNumber.get(n)?.status ?? "disponible";
          const isBulkSelected = bulkSelected.has(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (bulkMode) {
                  setBulkSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(n)) next.delete(n);
                    else next.add(n);
                    return next;
                  });
                } else {
                  setSelected(n);
                }
              }}
              className={cn(
                "rounded-lg border px-1 py-2 text-center text-xs font-semibold tabular-nums transition-colors",
                isBulkSelected ? "border-clay bg-clay text-bone" : STATUS_META[status].button,
              )}
            >
              {String(n).padStart(padLength, "0")}
            </button>
          );
        })}
        {numbers.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-stone">
            Ningún ticket coincide con el filtro.
          </p>
        )}
      </div>

      {selectedTicket && (
        <TicketEditor
          ticket={selectedTicket}
          padLength={padLength}
          onClose={() => setSelected(null)}
          onSaved={(t) => {
            onTicketUpdated(t);
            setSelected(null);
          }}
        />
      )}

      {bulkEditorOpen && (
        <BulkEditor
          count={bulkSelected.size}
          onClose={() => setBulkEditorOpen(false)}
          onSaved={(updated) => {
            onTicketsUpdated(updated);
            setBulkEditorOpen(false);
            setBulkSelected(new Set());
          }}
          numbers={Array.from(bulkSelected)}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-ink bg-ink text-bone" : "border-line text-stone hover:border-ink hover:text-ink",
      )}
    >
      {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
      {children}
    </button>
  );
}

function TicketEditor({
  ticket,
  padLength,
  onClose,
  onSaved,
}: {
  ticket: RaffleTicket;
  padLength: number;
  onClose: () => void;
  onSaved: (ticket: RaffleTicket) => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [buyerName, setBuyerName] = useState(ticket.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(ticket.buyerPhone ?? "");
  const [buyerEmail, setBuyerEmail] = useState(ticket.buyerEmail ?? "");
  const [note, setNote] = useState(ticket.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/raffle/tickets/${ticket.number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          buyerName: buyerName || undefined,
          buyerPhone: buyerPhone || undefined,
          buyerEmail: buyerEmail || undefined,
          note: note || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo actualizar el ticket");
      onSaved(body.ticket as RaffleTicket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            Ticket #{String(ticket.number).padStart(padLength, "0")}
          </h3>
          <button type="button" onClick={onClose} className="text-stone hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                  status === s ? "border-ink bg-ink text-bone" : "border-line text-stone hover:border-ink",
                )}
              >
                {TICKET_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {status !== "disponible" && (
            <div className="space-y-3">
              <MiniField label="Nombre del comprador" value={buyerName} onChange={setBuyerName} />
              <MiniField label="Teléfono" value={buyerPhone} onChange={setBuyerPhone} />
              <MiniField label="Correo (opcional)" value={buyerEmail} onChange={setBuyerEmail} />
              <MiniField label="Nota (opcional)" value={note} onChange={setNote} />
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-stone hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone hover:bg-clay disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkEditor({
  numbers,
  count,
  onClose,
  onSaved,
}: {
  numbers: number[];
  count: number;
  onClose: () => void;
  onSaved: (tickets: RaffleTicket[]) => void;
}) {
  const [status, setStatus] = useState<TicketStatus>("vendido");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/raffle/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers,
          status,
          buyerName: buyerName || undefined,
          buyerPhone: buyerPhone || undefined,
          buyerEmail: buyerEmail || undefined,
          note: note || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo actualizar los tickets");
      onSaved(body.tickets as RaffleTicket[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            {count} ticket{count > 1 ? "s" : ""} seleccionado{count > 1 ? "s" : ""}
          </h3>
          <button type="button" onClick={onClose} className="text-stone hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                  status === s ? "border-ink bg-ink text-bone" : "border-line text-stone hover:border-ink",
                )}
              >
                {TICKET_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {status === "disponible" ? (
            <p className="text-xs text-stone">
              Se liberarán los tickets seleccionados y se borrarán sus datos de comprador.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone">
                Estos datos se aplicarán a los {count} tickets seleccionados (útil cuando un mismo
                comprador se lleva varios números).
              </p>
              <MiniField label="Nombre del comprador" value={buyerName} onChange={setBuyerName} />
              <MiniField label="Teléfono" value={buyerPhone} onChange={setBuyerPhone} />
              <MiniField label="Correo (opcional)" value={buyerEmail} onChange={setBuyerEmail} />
              <MiniField label="Nota (opcional)" value={note} onChange={setNote} />
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-stone hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone hover:bg-clay disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Aplicar a {count} ticket{count > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-stone">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-bone px-3 py-2 text-sm focus:border-clay focus:outline-none"
      />
    </div>
  );
}
