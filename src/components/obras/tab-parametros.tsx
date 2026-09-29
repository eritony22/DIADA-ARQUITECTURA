"use client";

import { useRef, useState } from "react";
import { Download, FlaskConical, Trash2, Upload } from "lucide-react";
import type { ObraConfig, ObraState, Partida } from "@/types/obras";
import { duracionModulo, soles, todayISO, ultimaFechaCorte } from "@/lib/obras/calc";
import { generarDemo, importarBeneficiarios, quitarDemo, tieneDemo } from "@/lib/obras/ops";
import { obraStateSchema } from "@/lib/obras/schema";
import { parseTsv, readXlsx } from "@/lib/obras/xlsx";
import { useObra } from "./obra-context";
import { ETAPAS } from "./labels";
import { Button, Card, Field, inputClass } from "./ui";

export default function TabParametros() {
  return (
    <div className="flex flex-col gap-5">
      <Importar />
      <Configuracion />
      <Partidas />
      <Entidades />
      <div className="grid gap-5 xl:grid-cols-2">
        <Demo />
        <Respaldo />
      </div>
      <ReferenciaTechoPropio />
    </div>
  );
}

function Importar() {
  const { obra, replace } = useObra();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pegado, setPegado] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const aplicar = (rows: string[][]) => {
    const r = importarBeneficiarios(rows, obra);
    replace(r.state);
    setMsg({
      ok: true,
      text:
        `${r.agregados} beneficiario(s) agregados, ${r.actualizados} actualizados.` +
        (r.omitidos.length ? ` Omitidos: ${r.omitidos.join(", ")}.` : ""),
    });
  };

  const onFile = async (file: File) => {
    setMsg(null);
    try {
      const hojas = await readXlsx(file);
      let error: unknown = null;
      for (const h of hojas) {
        try {
          aplicar(h.rows);
          return;
        } catch (e) {
          error = e;
        }
      }
      throw error ?? new Error("El libro no tiene hojas.");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "No se pudo leer el archivo." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card
      title="Importar lista oficial de beneficiarios"
      subtitle="Sube el .xlsx de la lista oficial (columnas N°, DNI, N° DOC, A. PATERNO, A. MATERNO, NOMBRES, DEPARTAMENTO, PROVINCIA, DISTRITO, DIRECCIÓN, GRUPO, ENTIDAD TÉCNICA, LATITUD, LONGITUD) o pega las filas copiadas desde Excel. Se actualiza por N° de documento: puedes reimportar sin duplicar."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
          />
          <Button variant="primary" onClick={() => fileRef.current?.click()} className="self-start">
            <Upload size={14} /> Subir archivo .xlsx
          </Button>
          <p className="text-xs text-stone">
            El archivo se lee en tu navegador; solo se guardan en la base de datos los campos del
            padrón. Actualmente hay <b>{obra.beneficiarios.length}</b> familias registradas.
          </p>
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-[#0ca30c]/10 text-ink" : "bg-red-50 text-red-700"}`}>
              {msg.text}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <textarea
            rows={4}
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            placeholder="…o pega aquí las filas copiadas de Excel (incluyendo la fila de encabezados)"
            className={inputClass}
          />
          <Button
            onClick={() => {
              try {
                aplicar(parseTsv(pegado));
                setPegado("");
              } catch (e) {
                setMsg({ ok: false, text: e instanceof Error ? e.message : "Error al importar" });
              }
            }}
            disabled={!pegado.trim()}
            className="self-start"
          >
            Importar texto pegado
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Configuracion() {
  const { obra, update } = useObra();
  const c = obra.config;
  const set = <K extends keyof ObraConfig>(k: K, v: ObraConfig[K]) =>
    update((d) => void (d.config[k] = v));
  const num = (k: keyof ObraConfig, v: string, min = 0) => {
    const n = Number(v);
    if (Number.isFinite(n)) set(k, Math.max(min, n) as never);
  };

  return (
    <Card title="Datos de la obra y reglas de control">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre">
          <input className={inputClass} value={c.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </Field>
        <Field label="Convocatoria">
          <input className={inputClass} value={c.convocatoria} onChange={(e) => set("convocatoria", e.target.value)} />
        </Field>
        <Field label="Distrito / provincia">
          <div className="flex gap-2">
            <input className={inputClass} value={c.distrito} onChange={(e) => set("distrito", e.target.value)} />
            <input className={inputClass} value={c.provincia} onChange={(e) => set("provincia", e.target.value)} />
          </div>
        </Field>
        <Field label="Departamento">
          <input className={inputClass} value={c.departamento} onChange={(e) => set("departamento", e.target.value)} />
        </Field>
        <Field label="Valor del BFH por familia (S/)">
          <input type="number" className={inputClass} value={c.valorBfh} onChange={(e) => num("valorBfh", e.target.value)} />
        </Field>
        <Field label="Ahorro de la familia (S/)">
          <input type="number" className={inputClass} value={c.ahorroFamilia} onChange={(e) => num("ahorroFamilia", e.target.value)} />
        </Field>
        <Field label="Cobertura de garantía (%)">
          <input
            type="number"
            className={inputClass}
            value={Math.round(c.coberturaGarantia * 100)}
            onChange={(e) => num("coberturaGarantia", String(Number(e.target.value) / 100))}
          />
        </Field>
        <Field label="Área del módulo (m²)">
          <input type="number" className={inputClass} value={c.areaModuloM2} onChange={(e) => num("areaModuloM2", e.target.value, 1)} />
        </Field>
        <Field label="Inicio de obra">
          <input type="date" className={inputClass} value={c.fechaInicio} onChange={(e) => e.target.value && set("fechaInicio", e.target.value)} />
        </Field>
        <Field label="Desfase entre grupos (días)">
          <input type="number" className={inputClass} value={c.desfaseGrupoDias} onChange={(e) => num("desfaseGrupoDias", String(Math.round(Number(e.target.value))))} />
        </Field>
        <Field label="Plazo contractual total (días)">
          <input type="number" className={inputClass} value={c.plazoTotalDias} onChange={(e) => num("plazoTotalDias", String(Math.round(Number(e.target.value))), 1)} />
        </Field>
        <Field label="Aviso de vencimiento de fianzas (días)">
          <input type="number" className={inputClass} value={c.diasAvisoFianza} onChange={(e) => num("diasAvisoFianza", String(Math.round(Number(e.target.value))))} />
        </Field>
        <Field label="SPI de alerta (atraso)">
          <input type="number" step={0.05} className={inputClass} value={c.umbralSpiAlerta} onChange={(e) => num("umbralSpiAlerta", e.target.value)} />
        </Field>
        <Field label="SPI crítico">
          <input type="number" step={0.05} className={inputClass} value={c.umbralSpiCritico} onChange={(e) => num("umbralSpiCritico", e.target.value)} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-stone">
        BFH gestionado: {obra.beneficiarios.length} × {soles(c.valorBfh)} = <b>{soles(obra.beneficiarios.length * c.valorBfh)}</b>.
        Verifica el valor del BFH en la resolución de la convocatoria (varía por ámbito y por año).
      </p>
    </Card>
  );
}

function Partidas() {
  const { obra, update } = useObra();
  const [draft, setDraft] = useState<Partida[] | null>(null);
  const filas = draft ?? obra.partidas;
  const suma = filas.reduce((s, p) => s + p.peso, 0);
  const valido = Math.abs(suma - 1) < 0.0005;
  const edit = (k: number, patch: Partial<Partida>) => {
    const next = filas.map((p, i) => (i === k ? { ...p, ...patch } : p));
    setDraft(next);
  };
  return (
    <Card
      title="Partidas, pesos y cronograma tipo del módulo"
      subtitle="Pesos del cuadro de valorización (deben sumar 100 %) y secuencia programada en días desde el inicio del módulo."
      actions={
        draft && (
          <>
            <span className={`text-xs font-semibold ${valido ? "text-stone" : "text-red-700"}`}>
              Suma: {(suma * 100).toFixed(1)} %
            </span>
            <Button onClick={() => setDraft(null)}>Descartar</Button>
            <Button
              variant="primary"
              disabled={!valido}
              onClick={() => {
                update((d) => void (d.partidas = draft));
                setDraft(null);
              }}
            >
              Aplicar cambios
            </Button>
          </>
        )
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-stone">
              <th className="py-2 pr-2 font-medium">Cód.</th>
              <th className="py-2 pr-2 font-medium">Grupo</th>
              <th className="py-2 pr-2 font-medium">Partida</th>
              <th className="py-2 pr-2 font-medium">Peso %</th>
              <th className="py-2 pr-2 font-medium">Inicio (día)</th>
              <th className="py-2 pr-2 font-medium">Duración (días)</th>
              <th className="py-2 font-medium">Predecesoras</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p, k) => (
              <tr key={p.id} className="border-b border-line/60">
                <td className="py-1 pr-2 w-14"><input className={inputClass} value={p.codigo} onChange={(e) => edit(k, { codigo: e.target.value })} /></td>
                <td className="py-1 pr-2 w-52"><input className={inputClass} value={p.grupo} onChange={(e) => edit(k, { grupo: e.target.value })} /></td>
                <td className="py-1 pr-2"><input className={inputClass} value={p.nombre} onChange={(e) => edit(k, { nombre: e.target.value })} /></td>
                <td className="py-1 pr-2 w-24">
                  <input type="number" step={0.5} className={inputClass} value={Math.round(p.peso * 1000) / 10} onChange={(e) => edit(k, { peso: Math.max(0, Number(e.target.value) || 0) / 100 })} />
                </td>
                <td className="py-1 pr-2 w-24">
                  <input type="number" min={0} className={inputClass} value={p.inicioDia} onChange={(e) => edit(k, { inicioDia: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                </td>
                <td className="py-1 pr-2 w-24">
                  <input type="number" min={0} className={inputClass} value={p.duracionDias} onChange={(e) => edit(k, { duracionDias: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                </td>
                <td className="py-1 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {filas.filter((o) => o.id !== p.id).map((o) => {
                      const on = p.predecesoras.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          title={o.nombre}
                          onClick={() => edit(k, { predecesoras: on ? p.predecesoras.filter((x) => x !== o.id) : [...p.predecesoras, o.id] })}
                          className={`rounded px-1.5 py-0.5 ${on ? "bg-ink text-bone" : "bg-bone text-stone"}`}
                        >
                          {o.codigo}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone">
        Duración resultante del módulo: <b>{duracionModulo(filas, obra.config)} días</b>. El avance
        programado de cada partida se distribuye linealmente en su duración.
      </p>
    </Card>
  );
}

function Entidades() {
  const { obra, update } = useObra();
  return (
    <Card title="Entidades técnicas" subtitle="Datos de las empresas que ejecutan los módulos.">
      <div className="grid gap-4 lg:grid-cols-2">
        {obra.entidades.map((e, k) => (
          <div key={e.id} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3">
            <Field label="Sigla (como en la lista oficial)">
              <input className={inputClass} value={e.sigla} disabled />
            </Field>
            <Field label="Razón social">
              <input className={inputClass} value={e.razonSocial} onChange={(ev) => update((d) => void (d.entidades[k].razonSocial = ev.target.value))} />
            </Field>
            <Field label="RUC">
              <input className={inputClass} value={e.ruc ?? ""} onChange={(ev) => update((d) => void (d.entidades[k].ruc = ev.target.value || undefined))} />
            </Field>
            <Field label="Representante / residente">
              <input className={inputClass} value={e.representante ?? ""} onChange={(ev) => update((d) => void (d.entidades[k].representante = ev.target.value || undefined))} />
            </Field>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Demo() {
  const { obra, replace, setFecha } = useObra();
  const activo = tieneDemo(obra);
  return (
    <Card
      title="Escenario de demostración"
      subtitle="Genera 4 valorizaciones quincenales simuladas (ritmos distintos por módulo, un módulo rezagado por entidad y un adelanto de materiales) para probar tableros, alertas y proyecciones. No toca tus valorizaciones reales."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!obra.beneficiarios.length}
          onClick={() => {
            const next = generarDemo(obra, Date.now() % 100000);
            replace(next);
            // Llevar el corte a la última valorización simulada para ver el escenario completo.
            const ultima = ultimaFechaCorte(next.valorizaciones);
            if (ultima) setFecha(ultima);
          }}
        >
          <FlaskConical size={14} /> {activo ? "Regenerar demo" : "Generar demo"}
        </Button>
        <Button
          variant="danger"
          disabled={!activo}
          onClick={() => {
            replace(quitarDemo(obra));
            setFecha(todayISO());
          }}
        >
          <Trash2 size={14} /> Borrar datos demo
        </Button>
      </div>
    </Card>
  );
}

function Respaldo() {
  const { obra, replace } = useObra();
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card title="Respaldo" subtitle="Descarga todo el estado de la obra en JSON, o restaura un respaldo.">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const blob = new Blob([JSON.stringify(obra, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${obra.id}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Download size={14} /> Descargar JSON
        </Button>
        <input
          ref={ref}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const parsed = obraStateSchema.safeParse({ ...JSON.parse(await f.text()), id: obra.id, version: obra.version });
              if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Respaldo inválido");
              if (confirm("¿Reemplazar todos los datos de la obra con este respaldo?")) {
                replace(parsed.data as ObraState);
                setError(null);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Respaldo inválido");
            } finally {
              e.target.value = "";
            }
          }}
        />
        <Button onClick={() => ref.current?.click()}>
          <Upload size={14} /> Restaurar
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-stone">
        El respaldo contiene datos personales de las familias: guárdalo en un lugar seguro.
      </p>
    </Card>
  );
}

function ReferenciaTechoPropio() {
  return (
    <Card
      title="Referencia: Techo Propio — Construcción en Sitio Propio"
      subtitle="Resumen para orientar el control. Confirma montos y requisitos en la convocatoria y reglamento vigentes."
    >
      <div className="grid gap-5 text-sm lg:grid-cols-2">
        <div>
          <h4 className="font-semibold text-ink">Cómo funciona</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/80">
            <li>
              Programa del Ministerio de Vivienda operado por el Fondo MIVIVIENDA (FMV). La familia
              recibe el <b>Bono Familiar Habitacional (BFH)</b>, que no se devuelve, y aporta un ahorro
              mínimo.
            </li>
            <li>
              En la modalidad <b>CSP</b> la familia debe tener un terreno o aires independizados
              inscritos en SUNARP, sin otra vivienda ni apoyo habitacional previo del Estado, y con
              ingreso familiar dentro del tope de la convocatoria.
            </li>
            <li>
              Una <b>Entidad Técnica (ET)</b> con registro vigente —aquí PAHER y JCVM— firma el
              contrato de obra con cada familia y construye el módulo (≈ 35 m², dos dormitorios).
            </li>
            <li>
              Para recibir el desembolso del BFH y el ahorro, la ET constituye una <b>garantía
              (carta fianza)</b> a favor del FMV, que respalda sus obligaciones en cada contrato de
              obra; se libera tras la verificación y entrega.
            </li>
            <li>
              Durante la ejecución se emiten informes de <b>verificación de obra</b> sobre el
              avance y la conclusión.
            </li>
            <li>
              Referencia 2026: BFH base S/ 33 000 (6 UIT) con montos mayores en ámbitos
              priorizados; para familias en el VRAEM se reportó un bono excepcional de S/ 46 659
              (valor precargado — verifícalo para Pangoa); ahorro mínimo S/ 2 475; ingreso máximo
              S/ 2 706.
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-ink">Etapas que controla esta herramienta</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink/80">
            {ETAPAS.map((e) => (
              <li key={e.id}>
                <b>{e.label}:</b> {e.descripcion}
              </li>
            ))}
          </ol>
          <h4 className="mt-4 font-semibold text-ink">Fuentes</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            <li><a className="underline" target="_blank" rel="noreferrer" href="https://www.mivivienda.com.pe/PortalWEB/usuario-busca-viviendas/pagina.aspx?idpage=30">Fondo MIVIVIENDA — Techo Propio</a></li>
            <li><a className="underline" target="_blank" rel="noreferrer" href="https://www.elperuano.pe/noticia/299785-tienes-terreno-propio-conoce-como-acceder-al-bono-familiar-habitacional-de-hasta-s-37389">El Peruano — BFH en sitio propio 2026</a></li>
            <li><a className="underline" target="_blank" rel="noreferrer" href="https://www.fogapi.com.pe/wp-content/uploads/2024/04/Formato-de-Contrato-de-Afianzamiento-del-FMV-construccion-en-Sitio-Propio.pdf">FOGAPI — Contrato de afianzamiento a ET (CSP)</a></li>
            <li><a className="underline" target="_blank" rel="noreferrer" href="https://www.infobae.com/peru/2026/04/11/techo-propio-2026-desde-el-14-de-abril-podras-postular-a-bonos-de-vivienda/">Infobae — Convocatoria Techo Propio 2026</a></li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
