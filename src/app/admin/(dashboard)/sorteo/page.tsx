import RaffleAdmin from "@/components/admin/raffle-admin";
import { getRaffleConfig, getTickets } from "@/lib/raffle";

export default async function AdminSorteoPage() {
  const [config, tickets] = await Promise.all([getRaffleConfig(), getTickets()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Sorteo</h1>
      <p className="mt-1 text-sm text-stone">
        Configura el tema, los premios y las reglas del sorteo, y administra el estado de cada
        ticket del tablero.
      </p>
      <RaffleAdmin initialConfig={config} initialTickets={tickets} />
    </div>
  );
}
