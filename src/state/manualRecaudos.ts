import type { ManualRecaudo } from '../types';
import { loadJson, saveJson } from './sessionStorageJson';

// Igual que los pagos manuales: esta lista no viene de ningún Excel.
// Tesorería la gestiona a mano en la pestaña Proyección de Recaudo y vive
// solo en sessionStorage (se borra al cerrar la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.recaudoManual.v1';

export function loadManualRecaudos(): ManualRecaudo[] {
  return loadJson<ManualRecaudo[]>(STORAGE_KEY, []);
}

export function saveManualRecaudos(recaudos: ManualRecaudo[]): void {
  saveJson(STORAGE_KEY, recaudos);
}
