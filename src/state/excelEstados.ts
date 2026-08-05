import type { ExcelEstadoOverrides } from '../types';
import { loadJson, saveJson } from './sessionStorageJson';

// Igual que los pagos/recaudo manuales: esta anulación no se escribe en
// ningún Excel. Tesorería la gestiona a mano en las pestañas Pagos /
// Proyección de Recaudo y vive solo en sessionStorage (se borra al cerrar
// la pestaña/navegador).
const STORAGE_KEY = 'flujocaja.estadosExcel.v1';

export function loadExcelEstados(): ExcelEstadoOverrides {
  return loadJson<ExcelEstadoOverrides>(STORAGE_KEY, {});
}

export function saveExcelEstados(estados: ExcelEstadoOverrides): void {
  saveJson(STORAGE_KEY, estados);
}
