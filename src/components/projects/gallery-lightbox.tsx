"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { GalleryImage } from "@/types/content";

export default function GalleryLightbox({
  images,
  projectTitle,
}: {
  images: GalleryImage[];
  projectTitle: string;
}) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, prev, next]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setIndex(i)}
            className={`group relative overflow-hidden rounded-[3px] bg-ink/5 ${
              images.length === 1 ? "sm:col-span-2" : ""
            }`}
          >
            <div className="relative aspect-[16/11] w-full">
              <Image
                src={image.src}
                alt={image.caption ?? `${projectTitle} — imagen ${i + 1}`}
                fill
                sizes="(min-width: 640px) 48vw, 92vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors duration-300 group-hover:bg-ink/30">
                <ZoomIn
                  size={28}
                  className="text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
            </div>
            {image.caption && (
              <p className="mt-3 px-1 pb-1 text-left text-sm text-stone">
                {image.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {index !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4 md:p-10"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-bone/30 text-bone transition-colors hover:bg-bone hover:text-ink"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-bone/30 text-bone transition-colors hover:bg-bone hover:text-ink md:left-6"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-bone/30 text-bone transition-colors hover:bg-bone hover:text-ink md:right-6"
                  aria-label="Siguiente"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="relative h-full max-h-[80vh] w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              {index !== null && (
                <Image
                  src={images[index].src}
                  alt={images[index].caption ?? projectTitle}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              )}
            </motion.div>

            {index !== null && images[index].caption && (
              <p className="absolute bottom-6 left-1/2 max-w-lg -translate-x-1/2 px-4 text-center text-sm text-bone/70">
                {images[index].caption}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
