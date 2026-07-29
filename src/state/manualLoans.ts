// Igual que los saldos bancarios: PRESTAMO PERÚ y PRESTAMOS TERCEROS no vienen
// de ningún Excel. Tesorería los digita a mano en el Flujo Diario y el valor
// vive solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.prestamosManuales.v1';

/** category -> fecha (YYYY-MM-DD) -> monto */
export type ManualLoanEntries = Record<string, Record<string, number>>;

export function loadManualLoanEntries(): ManualLoanEntries {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ManualLoanEntries;
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte de cero.
  }
  return {};
}

export function saveManualLoanEntries(entries: ManualLoanEntries): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
