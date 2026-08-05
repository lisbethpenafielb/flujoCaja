import type { ExcelEstadoOverrides } from '../types';

// Igual que los pagos/recaudo manuales: esta anulación no se escribe en
// ningún Excel. Tesorería la gestiona a mano en las pestañas Pagos /
// Proyección de Recaudo y vive solo en sessionStorage (se borra al cerrar
// la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.estadosExcel.v1';

export function loadExcelEstados(): ExcelEstadoOverrides {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ExcelEstadoOverrides;
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte de cero.
  }
  return {};
}

export function saveExcelEstados(estados: ExcelEstadoOverrides): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estados));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
