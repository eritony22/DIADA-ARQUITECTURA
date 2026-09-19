import "server-only";
import { sql, ensureSchema } from "./db";
import { generateId } from "./slug";
import type { ContactMessage } from "@/types/content";

interface MessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

function rowToMessage(row: MessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    subject: row.subject ?? undefined,
    message: row.message,
    read: row.read,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getMessages(): Promise<ContactMessage[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM messages ORDER BY created_at DESC
  `) as unknown as MessageRow[];
  return rows.map(rowToMessage);
}

export async function getUnreadCount(): Promise<number> {
  await ensureSchema();
  const rows = (await sql`
    SELECT COUNT(*)::int AS count FROM messages WHERE read = false
  `) as unknown as { count: number }[];
  return rows[0]?.count ?? 0;
}

export interface MessageInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export async function addMessage(input: MessageInput): Promise<ContactMessage> {
  await ensureSchema();
  const id = generateId("msg");
  const rows = (await sql`
    INSERT INTO messages (id, name, email, phone, subject, message, read)
    VALUES (
      ${id}, ${input.name}, ${input.email}, ${input.phone ?? null},
      ${input.subject ?? null}, ${input.message}, false
    )
    RETURNING *
  `) as unknown as MessageRow[];
  return rowToMessage(rows[0]);
}

export async function markMessageRead(
  id: string,
  read: boolean,
): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    UPDATE messages SET read = ${read} WHERE id = ${id} RETURNING id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

export async function deleteMessage(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    DELETE FROM messages WHERE id = ${id} RETURNING id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}
