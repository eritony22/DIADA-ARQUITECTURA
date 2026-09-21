import "server-only";
import { sql, ensureSchema } from "./db";
import type {
  PublicRaffleTicket,
  RaffleConfig,
  RaffleMediaItem,
  RafflePrize,
  RaffleTicket,
  TicketStatus,
} from "@/types/content";

const DEFAULT_CONFIG = {
  title: "Gran Sorteo",
  subtitle: "",
  description: "",
  rules: [] as string[],
  prizes: [] as RafflePrize[],
  media: [] as RaffleMediaItem[],
  totalTickets: 100,
  ticketPrice: 10,
  currency: "PEN",
  status: "borrador" as const,
};

interface ConfigRow {
  title: string;
  subtitle: string | null;
  description: string;
  rules: string[];
  prizes: RafflePrize[];
  media: RaffleMediaItem[];
  total_tickets: number;
  ticket_price: string | number;
  currency: string;
  whatsapp: string | null;
  draw_date: string | null;
  status: string;
  updated_at: string;
}

interface TicketRow {
  number: number;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  note: string | null;
  updated_at: string;
}

function rowToConfig(row: ConfigRow): RaffleConfig {
  return {
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description,
    rules: row.rules ?? [],
    prizes: row.prizes ?? [],
    media: row.media ?? [],
    totalTickets: row.total_tickets,
    ticketPrice:
      typeof row.ticket_price === "string" ? parseFloat(row.ticket_price) : row.ticket_price,
    currency: row.currency,
    whatsapp: row.whatsapp ?? undefined,
    drawDate: row.draw_date ?? undefined,
    status: row.status as RaffleConfig["status"],
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function rowToTicket(row: TicketRow): RaffleTicket {
  return {
    number: row.number,
    status: row.status as TicketStatus,
    buyerName: row.buyer_name ?? undefined,
    buyerPhone: row.buyer_phone ?? undefined,
    buyerEmail: row.buyer_email ?? undefined,
    note: row.note ?? undefined,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureTicketRange(total: number): Promise<void> {
  await sql`
    INSERT INTO raffle_tickets (number, status)
    SELECT gs, 'disponible' FROM generate_series(1, ${total}) AS gs
    ON CONFLICT (number) DO NOTHING
  `;
}

async function shrinkTicketRange(total: number): Promise<void> {
  const occupied = (await sql`
    SELECT number FROM raffle_tickets
    WHERE number > ${total} AND status != 'disponible'
    ORDER BY number
  `) as unknown as { number: number }[];

  if (occupied.length > 0) {
    throw new Error(
      `No se puede reducir a ${total} tickets: el ticket #${occupied[0].number}` +
        (occupied.length > 1 ? ` (y ${occupied.length - 1} más)` : "") +
        " ya está reservado o vendido.",
    );
  }

  await sql`DELETE FROM raffle_tickets WHERE number > ${total}`;
}

async function createDefaultConfig(): Promise<RaffleConfig> {
  await sql`
    INSERT INTO raffle_config (
      id, title, subtitle, description, rules, prizes, media,
      total_tickets, ticket_price, currency, status
    ) VALUES (
      1, ${DEFAULT_CONFIG.title}, ${DEFAULT_CONFIG.subtitle}, ${DEFAULT_CONFIG.description},
      '[]', '[]', '[]', ${DEFAULT_CONFIG.totalTickets}, ${DEFAULT_CONFIG.ticketPrice},
      ${DEFAULT_CONFIG.currency}, ${DEFAULT_CONFIG.status}
    )
    ON CONFLICT (id) DO NOTHING
  `;
  await ensureTicketRange(DEFAULT_CONFIG.totalTickets);
  const rows = (await sql`SELECT * FROM raffle_config WHERE id = 1 LIMIT 1`) as unknown as ConfigRow[];
  return rowToConfig(rows[0]);
}

export async function getRaffleConfig(): Promise<RaffleConfig> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM raffle_config WHERE id = 1 LIMIT 1
  `) as unknown as ConfigRow[];
  if (rows.length === 0) return createDefaultConfig();
  return rowToConfig(rows[0]);
}

export type RaffleConfigPatch = Partial<Omit<RaffleConfig, "updatedAt">>;

export async function updateRaffleConfig(patch: RaffleConfigPatch): Promise<RaffleConfig> {
  await ensureSchema();
  const current = await getRaffleConfig();
  const next: RaffleConfig = {
    ...current,
    ...patch,
    rules: patch.rules ?? current.rules,
    prizes: patch.prizes ?? current.prizes,
    media: patch.media ?? current.media,
  };

  if (typeof patch.totalTickets === "number" && patch.totalTickets !== current.totalTickets) {
    if (patch.totalTickets > current.totalTickets) {
      await ensureTicketRange(patch.totalTickets);
    } else {
      await shrinkTicketRange(patch.totalTickets);
    }
  }

  const rows = (await sql`
    UPDATE raffle_config SET
      title = ${next.title},
      subtitle = ${next.subtitle ?? null},
      description = ${next.description},
      rules = ${JSON.stringify(next.rules)},
      prizes = ${JSON.stringify(next.prizes)},
      media = ${JSON.stringify(next.media)},
      total_tickets = ${next.totalTickets},
      ticket_price = ${next.ticketPrice},
      currency = ${next.currency},
      whatsapp = ${next.whatsapp || null},
      draw_date = ${next.drawDate || null},
      status = ${next.status},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `) as unknown as ConfigRow[];

  return rowToConfig(rows[0]);
}

export async function getTickets(): Promise<RaffleTicket[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM raffle_tickets ORDER BY number ASC
  `) as unknown as TicketRow[];
  return rows.map(rowToTicket);
}

export async function getPublicTickets(): Promise<PublicRaffleTicket[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT number, status FROM raffle_tickets ORDER BY number ASC
  `) as unknown as { number: number; status: string }[];
  return rows.map((r) => ({ number: r.number, status: r.status as TicketStatus }));
}

export interface TicketUpdateInput {
  status: TicketStatus;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  note?: string;
}

export async function setTicketStatus(
  number: number,
  input: TicketUpdateInput,
): Promise<RaffleTicket | null> {
  await ensureSchema();
  const clearBuyer = input.status === "disponible";
  const rows = (await sql`
    UPDATE raffle_tickets SET
      status = ${input.status},
      buyer_name = ${clearBuyer ? null : input.buyerName || null},
      buyer_phone = ${clearBuyer ? null : input.buyerPhone || null},
      buyer_email = ${clearBuyer ? null : input.buyerEmail || null},
      note = ${clearBuyer ? null : input.note || null},
      updated_at = now()
    WHERE number = ${number}
    RETURNING *
  `) as unknown as TicketRow[];
  return rows[0] ? rowToTicket(rows[0]) : null;
}

export interface ReserveBuyer {
  name: string;
  phone: string;
  email?: string;
  note?: string;
}

export type ReserveResult =
  | { ok: true; tickets: RaffleTicket[] }
  | { ok: false; unavailable: number[] };

/**
 * Reserves all requested ticket numbers for a buyer in a single atomic
 * UPDATE — either every number was still "disponible" and gets reserved, or
 * none of them are touched. Avoids a race where two buyers claim the same
 * number between a read and a write.
 */
export async function reserveTickets(
  numbers: number[],
  buyer: ReserveBuyer,
): Promise<ReserveResult> {
  await ensureSchema();
  const rows = (await sql`
    UPDATE raffle_tickets t SET
      status = 'reservado',
      buyer_name = ${buyer.name},
      buyer_phone = ${buyer.phone},
      buyer_email = ${buyer.email || null},
      note = ${buyer.note || null},
      updated_at = now()
    FROM (
      SELECT number FROM raffle_tickets
      WHERE number = ANY(${numbers}::int[]) AND status = 'disponible'
    ) avail
    WHERE t.number = avail.number
      AND (
        SELECT COUNT(*) FROM raffle_tickets
        WHERE number = ANY(${numbers}::int[]) AND status = 'disponible'
      ) = ${numbers.length}
    RETURNING t.*
  `) as unknown as TicketRow[];

  if (rows.length === numbers.length) {
    return { ok: true, tickets: rows.map(rowToTicket) };
  }

  const currentRows = (await sql`
    SELECT number, status FROM raffle_tickets WHERE number = ANY(${numbers}::int[])
  `) as unknown as { number: number; status: string }[];
  const unavailable = currentRows.filter((r) => r.status !== "disponible").map((r) => r.number);
  return { ok: false, unavailable };
}
