import MessagesInbox from "@/components/admin/messages-inbox";
import { getMessages } from "@/lib/messages";

export default async function AdminMessagesPage() {
  const messages = await getMessages();

  return (
    <div>
      <p className="kicker text-stone">Contacto</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">Mensajes</h1>
      <p className="mt-2 max-w-lg text-stone">
        Mensajes enviados desde el formulario de contacto del sitio web.
      </p>
      <div className="mt-8">
        <MessagesInbox initialMessages={messages} />
      </div>
    </div>
  );
}
