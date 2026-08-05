import type { CashEvent, ExcelEstadoOverrides, ManualRecaudo } from '../types';
import { store } from '../state/store';
import { renderManualEntryPanel, type ManualEntryPanelConfig } from './manualEntryPanel';

const CONFIG: ManualEntryPanelConfig = {
  entryLabel: 'recaudo',
  addTitle: 'Agregar recaudo',
  addDescription: 'Cobro proyectado que no viene de PROYECCION DE CARTERA.xlsx, o un ajuste manual a la proyección.',
  conceptoPlaceholder: 'Ej. Cliente ABC — factura 4521',
  fechaLabel: 'Fecha proyectada',
  listTitle: 'Recaudo manual',
  listDescription: 'Un recaudo "Pagado" (ya cobrado) deja de proyectarse en el Flujo; "Pendiente" aparece en la fecha indicada.',
  emptyMessage: 'Todavía no agregas ningún recaudo manual.',
  excelTitle: 'Recaudo proyectado desde Excel',
  excelDescription:
    'PROYECCION DE CARTERA.xlsx — el monto viene del Excel, pero podés marcar cada renglón como pagado (ya cobrado) para sacarlo del Flujo sin editar el archivo origen.',
  excelEmptyMessage: 'No hay recaudo cargado desde Excel.',
  excelLabelField: 'counterparty',
  onAdd: (concepto, monto, fecha) => store.addManualRecaudo(concepto, monto, fecha),
  onUpdate: (id, partial) => store.updateManualRecaudo(id, partial),
  onRemove: (id) => store.removeManualRecaudo(id),
  onSetExcelEstado: (eventId, estado) => store.setExcelEstado(eventId, estado),
};

export function renderRecaudoPanel(recaudos: ManualRecaudo[], excelRecaudo: CashEvent[], excelEstados: ExcelEstadoOverrides): HTMLElement {
  return renderManualEntryPanel(recaudos, excelRecaudo, excelEstados, CONFIG);
}
