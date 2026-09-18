"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import InstagramIcon from "@/components/icons/instagram-icon";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/", label: "Inicio", index: "01" },
  { href: "/proyectos", label: "Proyectos", index: "02" },
  { href: "/servicios", label: "Servicios", index: "03" },
  { href: "/nosotros", label: "Nosotros", index: "04" },
  { href: "/contacto", label: "Contacto", index: "05" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Close the menu when the route changes. Adjusted during render (React's
  // recommended pattern for "reset state when a prop changes") instead of
  // an effect, so it can't lag a frame behind navigation.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[70] transition-colors duration-500",
          (scrolled || open) && !open
            ? "border-b border-line bg-bone/90 backdrop-blur"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container-diada flex h-20 items-center justify-between md:h-24">
          <Link
            href="/"
            className="relative z-10 flex items-center gap-3"
            aria-label="DIADA Arquitectura y Construcción — Inicio"
          >
            <motion.span
              className="block h-9 w-auto md:h-11"
              whileHover={{ rotate: -2, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              <Image
                src="/images/brand/logo.webp"
                alt="DIADA Arquitectura y Construcción"
                width={220}
                height={95}
                priority
                className={cn(
                  "h-full w-auto object-contain transition-[filter] duration-500",
                  open && "invert",
                )}
              />
            </motion.span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className={cn(
              "relative z-10 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] transition-colors",
              open || !scrolled ? "text-bone" : "text-ink",
            )}
          >
            {open ? "Cerrar" : "Menú"}
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-current">
              <span className="relative flex h-3 w-4 flex-col justify-between">
                <motion.span
                  className="block h-px w-full bg-current"
                  animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                />
                <motion.span
                  className="block h-px w-full bg-current"
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
                <motion.span
                  className="block h-px w-full bg-current"
                  animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                />
              </span>
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[60] flex flex-col justify-between overflow-y-auto bg-ink px-6 pb-10 pt-28 text-bone md:px-10 md:pt-32"
          >
            <nav className="flex flex-col">
              {NAV_LINKS.map((link, i) => {
                const active =
                  link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.06 }}
                    className="border-b border-bone/10"
                  >
                    <Link
                      href={link.href}
                      className="group flex items-baseline gap-4 py-4 md:py-5"
                    >
                      <span className="font-display text-xs text-clay">
                        {link.index}
                      </span>
                      <span
                        className={cn(
                          "font-display text-4xl font-extrabold tracking-tight transition-colors sm:text-6xl lg:text-7xl",
                          active ? "text-clay" : "text-bone group-hover:text-clay",
                        )}
                      >
                        {link.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-12 flex flex-col gap-8 border-t border-bone/10 pt-8 md:flex-row md:items-end md:justify-between"
            >
              <div className="space-y-2 text-sm text-bone/60">
                <a href="tel:+51914457116" className="flex items-center gap-2 hover:text-bone">
                  <Phone size={14} />
                  914 457 116 · 962 377 887
                </a>
                <a
                  href="mailto:andreagarciavasquez@gmail.com"
                  className="flex items-center gap-2 hover:text-bone"
                >
                  <Mail size={14} />
                  andreagarciavasquez@gmail.com
                </a>
                <a
                  href="https://instagram.com/diada_arq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-bone"
                >
                  <InstagramIcon size={14} />
                  @diada_arq
                </a>
              </div>

              <Link
                href="/contacto"
                className="group inline-flex w-fit items-center gap-2 rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-clay-light"
              >
                Cotizar proyecto
                <ArrowUpRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
