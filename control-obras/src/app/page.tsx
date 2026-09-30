import ControlObras from "@/components/obras/control-obras";
import { getObra, OBRA_POR_DEFECTO } from "@/lib/obras/store";
import { usuarioActual } from "@/lib/auth";

// Siempre datos frescos de la base de datos.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [obra, usuario] = await Promise.all([getObra(OBRA_POR_DEFECTO), usuarioActual()]);
  if (!obra) throw new Error("No se pudo cargar la obra");
  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <ControlObras initial={obra} usuario={usuario} />
    </main>
  );
}
