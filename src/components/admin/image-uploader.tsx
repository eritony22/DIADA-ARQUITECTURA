"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
}

export default function ImageUploader({
  onUploaded,
  multiple = true,
  label = "Subir imágenes",
  className,
}: {
  onUploaded: (files: UploadedFile[]) => void;
  multiple?: boolean;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      list.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok || !body) {
        const detail = body?.details?.length ? `: ${body.details.join(" · ")}` : "";
        throw new Error(
          (body?.error ?? "El servidor no respondió correctamente. Intenta con una imagen más pequeña.") +
            detail,
        );
      }
      onUploaded(body.files as UploadedFile[]);
      if (body.errors?.length) {
        setError(body.errors.join(" · "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir archivos");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragOver ? "border-clay bg-clay/5" : "border-line hover:border-stone",
        )}
      >
        {loading ? (
          <Loader2 size={22} className="animate-spin text-clay" />
        ) : (
          <UploadCloud size={22} className="text-stone" />
        )}
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-stone">
          Arrastra imágenes aquí o haz clic para elegir (JPG, PNG, WEBP, hasta 4MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
