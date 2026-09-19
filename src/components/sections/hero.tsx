"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { HeroContent, Project } from "@/types/content";
import { CATEGORY_LABELS } from "@/lib/labels";

const SLIDE_MS = 5500;

export default function Hero({
  content,
  slides,
}: {
  content: HeroContent;
  slides: Project[];
}) {
  const [index, setIndex] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (!hasSlides || slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [hasSlides, slides.length]);

  const current = hasSlides ? slides[index] : null;

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-ink text-bone">
      <div className="absolute inset-0" aria-hidden="true">
        <AnimatePresence mode="sync">
          {hasSlides && (
            <motion.div
              key={current!.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: 1.08 }}
                transition={{ duration: SLIDE_MS / 1000 + 1.4, ease: "linear" }}
              >
                <Image
                  src={current!.coverImage}
                  alt={current!.title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
        <div className="absolute inset-0 bg-ink/10" />
      </div>

      <div className="container-diada relative z-10 flex w-full flex-col gap-16 pb-16 pt-40 md:pb-20">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="kicker text-clay"
          >
            {content.kicker}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-6 max-w-4xl text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.03]"
          >
            {content.title}
            <span className="block text-bone/80">{content.highlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-8 max-w-xl text-balance text-lg leading-relaxed text-bone/70"
          >
            {content.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/proyectos"
              className="group inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-clay-light"
            >
              Ver proyectos
              <ArrowUpRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 rounded-full border border-bone/25 px-6 py-3.5 text-sm font-semibold text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink"
            >
              Cotizar proyecto
            </Link>
          </motion.div>
        </div>

        {hasSlides && (
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-bone/15 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current!.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="kicker text-bone/50">
                  {CATEGORY_LABELS[current!.category]} — {current!.location}
                </p>
                <p className="mt-2 font-display text-xl font-bold sm:text-2xl">
                  {current!.title}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ver proyecto ${slide.title}`}
                  className="group flex h-6 items-center px-0.5"
                >
                  <span
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-8 bg-clay"
                        : "w-4 bg-bone/30 group-hover:bg-bone/60"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <motion.div
        className="absolute right-6 top-24 z-10 hidden items-center gap-2 text-xs text-bone/50 md:flex md:right-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="kicker">Desplázate</span>
        <ArrowDown size={14} />
      </motion.div>
    </section>
  );
}
