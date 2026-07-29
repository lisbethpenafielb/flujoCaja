export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00').getTime();
  const b = new Date(toIso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

const WEEKDAY_INDEX: Record<string, number> = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  MIÉRCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  SÁBADO: 6,
};

/** Resuelve un nombre de día de semana (en español, sin fecha calendario — tal
 *  como llega la hoja RESUMEN de PROYECCION DE CARTERA) a la próxima fecha real
 *  que le corresponde, a partir de `fromIso` (inclusive). */
export function nextWeekdayDate(weekdayName: string, fromIso: string): string | null {
  const key = weekdayName.trim().toUpperCase();
  const target = WEEKDAY_INDEX[key];
  if (target === undefined) return null;
  const d = new Date(fromIso + 'T00:00:00');
  const current = d.getDay();
  let diff = (target - current + 7) % 7;
  if (diff === 0) diff = 0; // hoy mismo si coincide
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

/** Convierte cualquier valor de celda de Excel (Date, número serial, o string)
 *  a fecha ISO. Devuelve null si no se puede interpretar. */
export function excelValueToISO(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return toISODate(value);
  }
  if (typeof value === 'number' && isFinite(value)) {
    // Serial de fecha de Excel (base 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return toISODate(epoch);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return toISODate(parsed);
  }
  return null;
}

export function weekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // semana empieza lunes
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function formatDateEs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShortEs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'short' });
}

/** "lunes, 27 julio" — para encabezados de columna del flujo de caja en formato matriz. */
export function formatDateLongEs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const s = d.toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthNameEs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const s = d.toLocaleDateString('es-EC', { month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

export function dayOfMonth(iso: string): string {
  return iso.slice(8, 10);
}

/** Número de semana ISO-8601 (1-53), usado para el filtro "Semana" de cheques. */
export function isoWeekNumber(iso: string): number {
  const d = new Date(iso + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}

export function isoWeekLabel(iso: string): string {
  return `Semana ${isoWeekNumber(iso)}`;
}
