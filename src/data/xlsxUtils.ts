import type { WorkBook } from 'xlsx';

export type Row = Record<string, unknown>;

export interface SheetGrid {
  name: string;
  rows: unknown[][];
}

// `xlsx` pesa ~330KB y solo hace falta al sincronizar con Drive — la mayoría de
// visitas solo miran el dashboard (demo o datos ya cargados), así que se importa
// dinámicamente en vez de ir en el bundle principal. `readWorkbook` es el único
// punto de entrada async; el resto de funciones de este archivo son sync y
// asumen que ya se llamó (y esperó) a `readWorkbook` antes, como hacen los 3
// parsers (cheques/cartera/pagosFijos) hoy.
let xlsxModule: typeof import('xlsx') | null = null;

export async function readWorkbook(bytes: ArrayBuffer): Promise<WorkBook> {
  xlsxModule ??= await import('xlsx');
  return xlsxModule.read(bytes, { type: 'array', cellDates: true });
}

export function sheetToGrid(wb: WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  if (!xlsxModule) throw new Error('sheetToGrid: llamar a readWorkbook() antes');
  return xlsxModule.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
}

export function allSheetGrids(wb: WorkBook): SheetGrid[] {
  return wb.SheetNames.map((name) => ({ name, rows: sheetToGrid(wb, name) }));
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Busca, dentro de las primeras `scanRows` filas de una grilla, la fila que mejor
 * calza como encabezado: la que contiene el mayor número de los `requiredTokens`
 * (comparación por "contiene", insensible a mayúsculas/acentos de espacio).
 * Así el parser no depende de que el encabezado esté siempre en la fila 1.
 */
export function findHeaderRow(
  rows: unknown[][],
  requiredTokens: string[],
  scanRows = 10
): { index: number; headers: string[] } | null {
  let best: { index: number; headers: string[]; score: number } | null = null;
  for (let r = 0; r < Math.min(scanRows, rows.length); r++) {
    const headers = (rows[r] ?? []).map(normalizeHeader);
    const score = requiredTokens.reduce(
      (acc, tok) => acc + (headers.some((h) => h.includes(tok)) ? 1 : 0),
      0
    );
    if (score > 0 && (!best || score > best.score)) {
      best = { index: r, headers, score };
    }
  }
  if (!best || best.score < Math.min(2, requiredTokens.length)) return null;
  return { index: best.index, headers: best.headers };
}

/** Construye un mapa NOMBRE_ENCABEZADO -> índice de columna. */
export function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h) map.set(h, i);
  });
  return map;
}

/** Busca el índice de columna cuyo encabezado *contiene* alguno de los alias dados. */
export function findColumn(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (aliases.some((a) => h.includes(a))) return i;
  }
  return -1;
}

export function cell(row: unknown[], idx: number): unknown {
  return idx >= 0 && idx < row.length ? row[idx] : undefined;
}

/** Convierte una letra de columna de Excel ("G", "AA", ...) a un índice de
 *  columna base 0 (G -> 6). Tesorería confirmó las columnas exactas de BASE
 *  CHEQUES por letra, así que el parser lee esos campos por posición fija en
 *  vez de por nombre de encabezado (más robusto ante encabezados repetidos
 *  o ligeramente distintos, ej. "ESTADO" vs "ESTATUS 2"). */
export function columnLetterToIndex(letter: string): number {
  let idx = 0;
  for (const ch of letter.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

export function isRowEmpty(row: unknown[] | undefined): boolean {
  if (!row) return true;
  return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}
