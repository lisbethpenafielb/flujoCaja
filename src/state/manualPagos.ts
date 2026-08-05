import type { ManualPago } from '../types';
import { loadJson, saveJson } from './sessionStorageJson';

// Igual que los saldos bancarios y los préstamos manuales: esta lista no
// viene de ningún Excel. Tesorería la gestiona a mano en la pestaña Pagos y
// vive solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.pagosManuales.v1';

export function loadManualPagos(): ManualPago[] {
  return loadJson<ManualPago[]>(STORAGE_KEY, []);
}

export function saveManualPagos(pagos: ManualPago[]): void {
  saveJson(STORAGE_KEY, pagos);
}
