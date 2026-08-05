import type { ManualRecaudo } from '../types';

// Igual que los pagos manuales: esta lista no viene de ningún Excel.
// Tesorería la gestiona a mano en la pestaña Proyección de Recaudo y vive
// solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.recaudoManual.v1';

export function loadManualRecaudos(): ManualRecaudo[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ManualRecaudo[];
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte de cero.
  }
  return [];
}

export function saveManualRecaudos(recaudos: ManualRecaudo[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recaudos));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
