import type { Metadata } from "next";
import ControlObras from "@/components/obras/control-obras";
import { getObra, OBRA_POR_DEFECTO } from "@/lib/obras/store";

export const metadata: Metadata = {
  title: "Control de obras",
};

export default async function ObrasPage() {
  const obra = await getObra(OBRA_POR_DEFECTO);
  if (!obra) throw new Error("No se pudo cargar la obra");
  return <ControlObras initial={obra} />;
}
