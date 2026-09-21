"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import ImageUploader from "./image-uploader";
import { RAFFLE_STATUS_LABELS } from "@/lib/labels";
import type { RaffleConfig, RaffleMediaItem, RafflePrize, RaffleStatus } from "@/types/content";

export default function RaffleConfigForm({
  config,
  onSaved,
}: {
  config: RaffleConfig;
  onSaved: (config: RaffleConfig) => void;
}) {
  const [title, setTitle] = useState(config.title);
  const [subtitle, setSubtitle] = useState(config.subtitle ?? "");
  const [description, setDescription] = useState(config.description);
  const [rules, setRules] = useState<string[]>(config.rules.length ? config.rules : [""]);
  const [prizes, setPrizes] = useState<RafflePrize[]>(config.prizes);
  const [media, setMedia] = useState<RaffleMediaItem[]>(config.media);
  const [totalTickets, setTotalTickets] = useState(String(config.totalTickets));
  const [ticketPrice, setTicketPrice] = useState(String(config.ticketPrice));
  const [currency, setCurrency] = useState(config.currency);
  const [whatsapp, setWhatsapp] = useState(config.whatsapp ?? "");
  const [drawDate, setDrawDate] = useState(config.drawDate ?? "");
  const [status, setStatus] = useState<RaffleStatus>(config.status);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title,
      subtitle: subtitle || undefined,
      description,
      rules: rules.map((r) => r.trim()).filter(Boolean),
      prizes: prizes.filter((p) => p.title.trim()),
      media,
      totalTickets: Number(totalTickets),
      ticketPrice: Number(ticketPrice),
      currency,
      whatsapp: whatsapp || undefined,
      drawDate: drawDate || undefined,
      status,
    };

    try {
      const res = await fetch("/api/admin/raffle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar el sorteo");
      onSaved(body.config as RaffleConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Información general</h2>
        <div className="mt-5 space-y-5">
          <TextField label="Título del sorteo" value={title} onChange={setTitle} required />
          <TextField
            label="Subtítulo (opcional)"
            value={subtitle}
            onChange={setSubtitle}
            placeholder="Ej. Sorteo por el aniversario de DIADA"
          />
          <TextAreaField
            label="Descripción / temática del sorteo"
            value={description}
            onChange={setDescription}
            rows={4}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Estado del sorteo"
              value={status}
              onChange={(v) => setStatus(v as RaffleStatus)}
              options={Object.entries(RAFFLE_STATUS_LABELS)}
            />
            <TextField
              label="Fecha del sorteo (opcional)"
              type="date"
              value={drawDate}
              onChange={setDrawDate}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Tickets y precio</h2>
        <p className="mt-1 text-sm text-stone">
          Define cuántos números tendrá el tablero (hasta 1000). Si ya hay tickets reservados o
          vendidos, no podrás reducir el total por debajo del número más alto ocupado.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Total de tickets"
            type="number"
            min={1}
            max={1000}
            value={totalTickets}
            onChange={setTotalTickets}
            required
          />
          <TextField
            label="Precio por ticket"
            type="number"
            min={0}
            step="0.01"
            value={ticketPrice}
            onChange={setTicketPrice}
            required
          />
          <TextField
            label="Moneda"
            value={currency}
            onChange={setCurrency}
            placeholder="PEN, USD…"
            required
          />
          <TextField
            label="WhatsApp del sorteo (opcional)"
            value={whatsapp}
            onChange={setWhatsapp}
            placeholder="51987654321"
          />
        </div>
        <p className="mt-2 text-xs text-stone">
          Si dejas el WhatsApp vacío, se usará el número de la empresa configurado en
          Configuración.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Imágenes y video del sorteo</h2>
        <p className="mt-1 text-sm text-stone">
          Fotos o videos del premio o la temática del sorteo, se muestran en la página pública.
        </p>

        <div className="mt-4 space-y-3">
          {media.map((item, i) => (
            <div
              key={item.url + i}
              className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row sm:items-center"
            >
              {item.type === "image" ? (
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg">
                  <Image src={item.url} alt="" fill className="object-cover" />
                </div>
              ) : (
                <video src={item.url} className="h-20 w-32 shrink-0 rounded-lg object-cover" muted />
              )}
              <input
                type="text"
                value={item.caption ?? ""}
                placeholder="Leyenda (opcional)"
                onChange={(e) =>
                  setMedia((items) =>
                    items.map((m, idx) => (idx === i ? { ...m, caption: e.target.value } : m)),
                  )
                }
                className="flex-1 rounded-lg border border-line bg-bone px-3 py-2 text-sm focus:border-clay focus:outline-none"
              />
              <IconButton
                onClick={() => setMedia((items) => items.filter((_, idx) => idx !== i))}
                label="Eliminar"
                danger
              >
                <X size={15} />
              </IconButton>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <ImageUploader
            label="Agregar imágenes"
            className="w-full max-w-sm"
            onUploaded={(files) =>
              setMedia((items) => [
                ...items,
                ...files.map((f) => ({ url: f.url, type: "image" as const, caption: "" })),
              ])
            }
          />
          <AddVideoField
            onAdd={(url) =>
              setMedia((items) => [...items, { url, type: "video", caption: "" }])
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Premios</h2>
        <div className="mt-4 space-y-4">
          {prizes.map((prize, i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-4">
                {prize.image ? (
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                    <Image src={prize.image} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-28 shrink-0">
                    <ImageUploader
                      multiple={false}
                      label="Subir foto"
                      onUploaded={(files) =>
                        files[0] &&
                        setPrizes((items) =>
                          items.map((p, idx) => (idx === i ? { ...p, image: files[0].url } : p)),
                        )
                      }
                    />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={prize.title}
                    placeholder="Nombre del premio"
                    onChange={(e) =>
                      setPrizes((items) =>
                        items.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p)),
                      )
                    }
                    className="w-full rounded-lg border border-line bg-bone px-3 py-2 text-sm font-semibold focus:border-clay focus:outline-none"
                  />
                  <textarea
                    value={prize.description ?? ""}
                    placeholder="Descripción del premio (opcional)"
                    rows={2}
                    onChange={(e) =>
                      setPrizes((items) =>
                        items.map((p, idx) =>
                          idx === i ? { ...p, description: e.target.value } : p,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-line bg-bone px-3 py-2 text-sm focus:border-clay focus:outline-none"
                  />
                </div>
                <IconButton
                  onClick={() => setPrizes((items) => items.filter((_, idx) => idx !== i))}
                  label="Eliminar premio"
                  danger
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPrizes((items) => [...items, { title: "", description: "" }])}
          className="mt-4 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-clay"
        >
          <Plus size={15} /> Agregar premio
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Reglas del sorteo</h2>
        <div className="mt-4 space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={rule}
                placeholder={`Regla ${i + 1}`}
                onChange={(e) =>
                  setRules((items) => items.map((r, idx) => (idx === i ? e.target.value : r)))
                }
                className="flex-1 rounded-lg border border-line bg-bone px-3 py-2 text-sm focus:border-clay focus:outline-none"
              />
              <IconButton
                onClick={() => setRules((items) => items.filter((_, idx) => idx !== i))}
                label="Eliminar regla"
                danger
              >
                <X size={15} />
              </IconButton>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRules((items) => [...items, ""])}
          className="mt-3 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-clay"
        >
          <Plus size={15} /> Agregar regla
        </button>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-end border-t border-line pt-6">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function AddVideoField({ onAdd }: { onAdd: (url: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex-1">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        Agregar video (URL)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          placeholder="https://…"
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-clay"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <textarea
        value={value}
        required={required}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </select>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-line text-stone hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
