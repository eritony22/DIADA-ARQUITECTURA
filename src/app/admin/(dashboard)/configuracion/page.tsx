import SettingsForm from "@/components/admin/settings-form";
import { getSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <p className="kicker text-stone">Contenido del sitio</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">Configuración</h1>
      <p className="mt-2 max-w-lg text-stone">
        Edita la información de la empresa, la portada, el equipo, los
        servicios y las estadísticas que se muestran en el sitio web.
      </p>
      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
