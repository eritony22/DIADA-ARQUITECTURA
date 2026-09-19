import MediaLibrary from "@/components/admin/media-library";
import { listMedia } from "@/lib/media";

export default async function AdminMediaPage() {
  const files = await listMedia();

  return (
    <div>
      <p className="kicker text-stone">Archivos</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">Media library</h1>
      <p className="mt-2 max-w-lg text-stone">
        Sube y administra las imágenes usadas en el sitio. Copia la URL de un
        archivo para reutilizarlo en cualquier proyecto.
      </p>
      <div className="mt-8">
        <MediaLibrary initialFiles={files} />
      </div>
    </div>
  );
}
