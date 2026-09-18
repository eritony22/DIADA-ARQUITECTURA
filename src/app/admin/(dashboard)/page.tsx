import Link from "next/link";
import { Building2, Images, MessageSquare, Star } from "lucide-react";
import { getProjects } from "@/lib/projects";
import { getMessages } from "@/lib/messages";
import { listMedia } from "@/lib/media";

export default async function AdminDashboardPage() {
  const [projects, messages, media] = await Promise.all([
    getProjects(),
    getMessages(),
    listMedia(),
  ]);

  const unread = messages.filter((m) => !m.read).length;
  const featured = projects.filter((p) => p.featured).length;

  const cards = [
    {
      href: "/admin/proyectos",
      label: "Proyectos publicados",
      value: projects.length,
      icon: Building2,
    },
    {
      href: "/admin/proyectos",
      label: "Proyectos destacados",
      value: featured,
      icon: Star,
    },
    {
      href: "/admin/mensajes",
      label: "Mensajes sin leer",
      value: unread,
      icon: MessageSquare,
    },
    {
      href: "/admin/media",
      label: "Archivos en la media library",
      value: media.length,
      icon: Images,
    },
  ];

  return (
    <div>
      <p className="kicker text-stone">Panel de administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">
        Hola, bienvenido de vuelta
      </h1>
      <p className="mt-2 max-w-lg text-stone">
        Gestiona los proyectos, el contenido y los mensajes del sitio web de
        DIADA desde aquí.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-clay"
            >
              <Icon size={22} className="text-clay" strokeWidth={1.6} />
              <p className="mt-5 font-display text-3xl font-extrabold text-ink">
                {card.value}
              </p>
              <p className="mt-1 text-sm text-stone">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            Últimos mensajes
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {messages.slice(0, 5).map((m) => (
              <li key={m.id} className="py-3">
                <p className="text-sm font-semibold text-ink">{m.name}</p>
                <p className="line-clamp-1 text-xs text-stone">{m.message}</p>
              </li>
            ))}
            {messages.length === 0 && (
              <li className="py-3 text-sm text-stone">Sin mensajes todavía.</li>
            )}
          </ul>
          <Link
            href="/admin/mensajes"
            className="mt-4 inline-block text-sm font-semibold text-ink underline underline-offset-4"
          >
            Ver todos los mensajes
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            Proyectos recientes
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {projects.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.title}</p>
                  <p className="text-xs text-stone">{p.location}</p>
                </div>
                <Link
                  href={`/admin/proyectos/${p.id}`}
                  className="text-xs font-semibold text-clay"
                >
                  Editar
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/proyectos/nuevo"
            className="mt-4 inline-block text-sm font-semibold text-ink underline underline-offset-4"
          >
            Crear nuevo proyecto
          </Link>
        </div>
      </div>
    </div>
  );
}
