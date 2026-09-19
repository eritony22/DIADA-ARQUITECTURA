"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Trash2 } from "lucide-react";
import ImageUploader, { type UploadedFile } from "./image-uploader";
import type { MediaFile } from "@/lib/media";

export default function MediaLibrary({ initialFiles }: { initialFiles: MediaFile[] }) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  function handleUploaded(uploaded: UploadedFile[]) {
    const now = new Date().toISOString();
    setFiles((prev) => [
      ...uploaded.map((f) => ({ ...f, modifiedAt: now })),
      ...prev,
    ]);
  }

  async function handleDelete(url: string) {
    if (!confirm("¿Eliminar este archivo? Si está en uso en algún proyecto dejará de mostrarse."))
      return;
    setDeletingUrl(url);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.url !== url));
    } catch {
      alert("No se pudo eliminar el archivo.");
    } finally {
      setDeletingUrl(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(window.location.origin + url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
    });
  }

  return (
    <div>
      <ImageUploader onUploaded={handleUploaded} label="Subir archivos a la media library" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((file) => (
          <div
            key={file.url}
            className="group relative overflow-hidden rounded-xl border border-line bg-paper"
          >
            <div className="relative aspect-square w-full">
              <Image src={file.url} alt={file.name} fill className="object-cover" />
            </div>
            <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-ink/80 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => copyUrl(file.url)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bone text-ink"
                aria-label="Copiar URL"
              >
                {copiedUrl === file.url ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(file.url)}
                disabled={deletingUrl === file.url}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bone text-red-600 disabled:opacity-60"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <p className="mt-8 text-center text-stone">
          Aún no hay archivos subidos. Los que subas aquí y en los formularios de
          proyectos aparecerán en esta biblioteca.
        </p>
      )}
    </div>
  );
}
