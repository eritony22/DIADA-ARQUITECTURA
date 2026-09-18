"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import ProjectCard from "./project-card";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Project, ProjectCategory } from "@/types/content";
import { cn } from "@/lib/cn";

type FilterValue = "todos" | ProjectCategory;

export default function ProjectFilterGrid({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<FilterValue>("todos");

  const availableCategories = useMemo(() => {
    const set = new Set(projects.map((p) => p.category));
    return Array.from(set);
  }, [projects]);

  const filtered = useMemo(
    () => (filter === "todos" ? projects : projects.filter((p) => p.category === filter)),
    [projects, filter],
  );

  return (
    <div>
      <LayoutGroup>
        <div className="flex flex-wrap gap-3">
          <FilterPill
            active={filter === "todos"}
            onClick={() => setFilter("todos")}
            label={`Todos (${projects.length})`}
          />
          {availableCategories.map((cat) => (
            <FilterPill
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={CATEGORY_LABELS[cat]}
            />
          ))}
        </div>
      </LayoutGroup>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <ProjectCard project={project} priority={i < 3} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-stone">
          Aún no hay proyectos publicados en esta categoría.
        </p>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-ink bg-ink text-bone"
          : "border-line text-stone hover:border-ink hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
