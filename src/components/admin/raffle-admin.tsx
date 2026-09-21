"use client";

import { useState } from "react";
import { Grid3x3, Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";
import RaffleConfigForm from "./raffle-config-form";
import RaffleTicketBoard from "./raffle-ticket-board";
import type { RaffleConfig, RaffleTicket } from "@/types/content";

export default function RaffleAdmin({
  initialConfig,
  initialTickets,
}: {
  initialConfig: RaffleConfig;
  initialTickets: RaffleTicket[];
}) {
  const [config, setConfig] = useState(initialConfig);
  const [tickets, setTickets] = useState(initialTickets);
  const [tab, setTab] = useState<"config" | "tickets">("config");

  async function refreshTickets() {
    const res = await fetch("/api/admin/raffle");
    if (!res.ok) return;
    const body = await res.json();
    setConfig(body.config);
    setTickets(body.tickets);
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-line">
        <TabButton
          active={tab === "config"}
          onClick={() => setTab("config")}
          icon={Settings2}
          label="Configuración"
        />
        <TabButton
          active={tab === "tickets"}
          onClick={() => setTab("tickets")}
          icon={Grid3x3}
          label={`Tablero (${tickets.length})`}
        />
      </div>

      <div className="mt-6">
        {tab === "config" ? (
          <RaffleConfigForm
            config={config}
            onSaved={(next) => {
              const ticketsChanged = next.totalTickets !== config.totalTickets;
              setConfig(next);
              if (ticketsChanged) refreshTickets();
            }}
          />
        ) : (
          <RaffleTicketBoard
            tickets={tickets}
            totalTickets={config.totalTickets}
            onTicketUpdated={(ticket) =>
              setTickets((items) =>
                items.map((t) => (t.number === ticket.number ? ticket : t)),
              )
            }
            onTicketsUpdated={(updated) =>
              setTickets((items) => {
                const byNumber = new Map(updated.map((t) => [t.number, t]));
                return items.map((t) => byNumber.get(t.number) ?? t);
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
        active ? "border-clay text-ink" : "border-transparent text-stone hover:text-ink",
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
