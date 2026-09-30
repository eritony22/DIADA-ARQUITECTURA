// Lector mínimo de .xlsx en el navegador (sin dependencias): descomprime el
// ZIP con DecompressionStream y lee la primera hoja como una matriz de
// textos. Suficiente para importar listas de beneficiarios; no evalúa
// fórmulas (usa el último valor calculado que guardó Excel).

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function readEntries(buf: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buf);
  // End of central directory: firma 0x06054b50, buscando desde el final.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("El archivo no es un .xlsx válido.");
  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let k = 0; k < count; k++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(new Uint8Array(buf, ptr + 46, nameLen));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const view = new DataView(buf);
  const nameLen = view.getUint16(e.localHeaderOffset + 26, true);
  const extraLen = view.getUint16(e.localHeaderOffset + 28, true);
  const start = e.localHeaderOffset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buf, start, e.compressedSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error(`Compresión no soportada (${e.method}).`);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export interface SheetData {
  name: string;
  rows: string[][];
}

/** Lee todas las hojas del libro como matrices de texto. */
export async function readXlsx(file: File): Promise<SheetData[]> {
  const buf = await file.arrayBuffer();
  const entries = readEntries(buf);
  const get = async (name: string) => {
    const e = entries.find((x) => x.name === name);
    return e ? readEntry(buf, e) : null;
  };
  const parser = new DOMParser();
  const xml = (s: string) => parser.parseFromString(s, "application/xml");

  const shared: string[] = [];
  const sst = await get("xl/sharedStrings.xml");
  if (sst) {
    for (const si of Array.from(xml(sst).getElementsByTagName("si"))) {
      shared.push(
        Array.from(si.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join(""),
      );
    }
  }

  const wb = await get("xl/workbook.xml");
  const rels = await get("xl/_rels/workbook.xml.rels");
  if (!wb || !rels) throw new Error("No se encontró el libro dentro del .xlsx.");
  const relMap = new Map<string, string>();
  for (const r of Array.from(xml(rels).getElementsByTagName("Relationship"))) {
    const target = r.getAttribute("Target") ?? "";
    relMap.set(
      r.getAttribute("Id") ?? "",
      target.startsWith("/") ? target.slice(1) : `xl/${target}`,
    );
  }

  const sheets: SheetData[] = [];
  for (const s of Array.from(xml(wb).getElementsByTagName("sheet"))) {
    const rid =
      s.getAttribute("r:id") ??
      s.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      ) ??
      "";
    const path = relMap.get(rid);
    const content = path ? await get(path) : null;
    if (!content) continue;
    const rows: string[][] = [];
    for (const row of Array.from(xml(content).getElementsByTagName("row"))) {
      const r = Number(row.getAttribute("r") ?? rows.length + 1) - 1;
      const cells: string[] = [];
      for (const c of Array.from(row.getElementsByTagName("c"))) {
        const ref = c.getAttribute("r");
        const idx = ref ? colIndex(ref) : cells.length;
        const type = c.getAttribute("t");
        let value = "";
        if (type === "inlineStr") {
          value = Array.from(c.getElementsByTagName("t"))
            .map((t) => t.textContent ?? "")
            .join("");
        } else {
          const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
          value = type === "s" ? (shared[Number(v)] ?? "") : v;
        }
        cells[idx] = value;
      }
      rows[r] = Array.from(cells, (v) => v ?? "");
    }
    sheets.push({
      name: s.getAttribute("name") ?? `Hoja ${sheets.length + 1}`,
      rows: Array.from(rows, (r) => r ?? []),
    });
  }
  return sheets;
}

/** Convierte texto pegado desde Excel (separado por tabulaciones) en matriz. */
export function parseTsv(text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split("\t"));
}
