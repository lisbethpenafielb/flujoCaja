import type { ManualPago } from '../types';

// Igual que los saldos bancarios y los préstamos manuales: esta lista no
// viene de ningún Excel. Tesorería la gestiona a mano en la pestaña Pagos y
// vive solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.pagosManuales.v1';

export function loadManualPagos(): ManualPago[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ManualPago[];
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte de cero.
  }
  return [];
}

export function saveManualPagos(pagos: ManualPago[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pagos));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
