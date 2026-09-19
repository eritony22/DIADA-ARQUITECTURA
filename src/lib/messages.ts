import "server-only";
import { readJson, writeJson } from "./json-store";
import { MESSAGES_FILE } from "./paths";
import { generateId } from "./slug";
import type { ContactMessage } from "@/types/content";

async function loadAll(): Promise<ContactMessage[]> {
  const messages = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
  return [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getMessages(): Promise<ContactMessage[]> {
  return loadAll();
}

export async function getUnreadCount(): Promise<number> {
  const messages = await loadAll();
  return messages.filter((m) => !m.read).length;
}

export interface MessageInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export async function addMessage(input: MessageInput): Promise<ContactMessage> {
  const messages = await loadAll();
  const message: ContactMessage = {
    id: generateId("msg"),
    ...input,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await writeJson(MESSAGES_FILE, [message, ...messages]);
  return message;
}

export async function markMessageRead(
  id: string,
  read: boolean,
): Promise<boolean> {
  const messages = await loadAll();
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return false;
  messages[index] = { ...messages[index], read };
  await writeJson(MESSAGES_FILE, messages);
  return true;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const messages = await loadAll();
  const next = messages.filter((m) => m.id !== id);
  if (next.length === messages.length) return false;
  await writeJson(MESSAGES_FILE, next);
  return true;
}
