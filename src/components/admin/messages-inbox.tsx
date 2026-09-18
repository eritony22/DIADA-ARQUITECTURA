"use client";

import { useState } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import type { ContactMessage } from "@/types/content";
import { cn } from "@/lib/cn";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MessagesInbox({
  initialMessages,
}: {
  initialMessages: ContactMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessages[0]?.id ?? null,
  );

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  async function toggleRead(message: ContactMessage) {
    const read = !message.read;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, read } : m)));
    await fetch(`/api/admin/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
  }

  async function remove(message: ContactMessage) {
    if (!confirm(`¿Eliminar el mensaje de ${message.name}?`)) return;
    await fetch(`/api/admin/messages/${message.id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    if (selectedId === message.id) setSelectedId(null);
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-paper p-10 text-center text-stone">
        No hay mensajes todavía. Aparecerán aquí cuando alguien escriba desde
        el formulario de contacto.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {messages.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={cn(
                "w-full px-4 py-4 text-left transition-colors hover:bg-bone-dim",
                selectedId === m.id && "bg-bone-dim",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    m.read ? "text-ink/70" : "font-bold text-ink",
                  )}
                >
                  {m.name}
                </p>
                {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-clay" />}
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-stone">{m.message}</p>
              <p className="mt-1 text-[0.7rem] text-stone/70">{formatDate(m.createdAt)}</p>
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-line bg-paper p-6">
        {selected ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">{selected.name}</h2>
                <a
                  href={`mailto:${selected.email}`}
                  className="text-sm text-clay hover:underline"
                >
                  {selected.email}
                </a>
                {selected.phone && (
                  <p className="text-sm text-stone">{selected.phone}</p>
                )}
                <p className="mt-1 text-xs text-stone">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleRead(selected)}
                  className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink"
                >
                  {selected.read ? <Mail size={14} /> : <MailOpen size={14} />}
                  {selected.read ? "Marcar no leído" : "Marcar leído"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(selected)}
                  className="flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </div>

            {selected.subject && (
              <p className="mt-5 text-sm font-semibold text-ink">
                Asunto: <span className="font-normal text-stone">{selected.subject}</span>
              </p>
            )}

            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink/85">
              {selected.message}
            </p>

            <a
              href={`mailto:${selected.email}?subject=${encodeURIComponent(
                `Re: tu consulta a DIADA${selected.subject ? ` — ${selected.subject}` : ""}`,
              )}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone hover:bg-clay"
            >
              Responder por correo
            </a>
          </div>
        ) : (
          <p className="text-stone">Selecciona un mensaje para leerlo.</p>
        )}
      </div>
    </div>
  );
}
