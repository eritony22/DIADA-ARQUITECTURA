"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Images,
  MessageSquare,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import Logo from "@/components/brand/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/admin/proyectos", label: "Proyectos", icon: Building2 },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export default function AdminShell({
  children,
  unreadMessages,
}: {
  children: React.ReactNode;
  unreadMessages: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const NavLinks = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-ink text-bone"
                : "text-ink/70 hover:bg-ink/5 hover:text-ink",
            )}
          >
            <span className="flex items-center gap-3">
              <Icon size={17} strokeWidth={1.8} />
              {item.label}
            </span>
            {item.href === "/admin/mensajes" && unreadMessages > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[0.65rem] font-bold text-bone">
                {unreadMessages}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-paper p-5 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-1 text-ink">
          <Logo className="h-8" label="DIADA" />
        </Link>
        {NavLinks}
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5 hover:text-ink"
          >
            <ExternalLink size={17} strokeWidth={1.8} />
            Ver sitio web
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-ink/70 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <LogOut size={17} strokeWidth={1.8} />
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 text-ink">
          <Logo className="h-7" label="DIADA" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-30 flex flex-col bg-paper p-5 lg:hidden">
          {NavLinks}
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink/70"
            >
              <ExternalLink size={17} />
              Ver sitio web
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-600"
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-5 pb-16 pt-24 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
