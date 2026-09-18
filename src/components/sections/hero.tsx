"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { HeroContent } from "@/types/content";

export default function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-ink text-bone">
      {/* parametric background shapes */}
      <div className="absolute inset-0" aria-hidden="true">
        <motion.svg
          viewBox="0 0 1200 900"
          className="absolute -right-1/4 top-0 h-full w-[85%] opacity-90 md:-right-1/12"
          preserveAspectRatio="xMidYMid slice"
        >
          <motion.path
            d="M180 850 C 60 620, 140 340, 420 210 C 700 80, 980 160, 1080 400 C 1180 640, 1040 860, 760 900 C 480 940, 300 1080, 180 850 Z"
            fill="var(--color-clay)"
            opacity={0.16}
            animate={{ rotate: [0, 6, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "600px 500px" }}
          />
          <motion.path
            d="M320 780 C 220 560, 320 320, 560 240 C 800 160, 1020 280, 1060 500 C 1100 720, 900 860, 660 860 C 420 860, 420 1000, 320 780 Z"
            fill="none"
            stroke="var(--color-bone)"
            strokeOpacity={0.14}
            strokeWidth={1.5}
            animate={{ rotate: [0, -5, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "600px 500px" }}
          />
        </motion.svg>

        <motion.div
          className="absolute left-[8%] top-[22%] h-40 w-40 rounded-full border border-bone/10 md:h-64 md:w-64"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[18%] left-[18%] h-3 w-3 rounded-full bg-clay md:h-4 md:w-4"
          animate={{ y: [0, -22, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
      </div>

      <div className="container-diada relative z-10 pb-20 pt-40 md:pb-28">
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
          <span className="block text-stone-light">{content.highlight}</span>
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
            className="group inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-bone transition-colors hover:bg-clay-dark"
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

      <motion.div
        className="absolute bottom-8 right-6 z-10 hidden items-center gap-2 text-xs text-bone/50 md:flex md:right-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="kicker">Desplázate</span>
        <ArrowDown size={14} />
      </motion.div>
    </section>
  );
}
