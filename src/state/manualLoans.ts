import { loadJson, saveJson } from './sessionStorageJson';

// Igual que los saldos bancarios: PRESTAMO PERÚ y PRESTAMOS TERCEROS no vienen
// de ningún Excel. Tesorería los digita a mano en el Flujo Diario y el valor
// vive solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.prestamosManuales.v1';

/** category -> fecha (YYYY-MM-DD) -> monto */
export type ManualLoanEntries = Record<string, Record<string, number>>;

export function loadManualLoanEntries(): ManualLoanEntries {
  return loadJson<ManualLoanEntries>(STORAGE_KEY, {});
}

export function saveManualLoanEntries(entries: ManualLoanEntries): void {
  saveJson(STORAGE_KEY, entries);
}
