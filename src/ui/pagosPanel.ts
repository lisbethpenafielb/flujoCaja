import type { CashEvent, ExcelEstadoOverrides, ManualPago } from '../types';
import { store } from '../state/store';
import { renderManualEntryPanel, type ManualEntryPanelConfig } from './manualEntryPanel';

const CONFIG: ManualEntryPanelConfig = {
  entryLabel: 'pago',
  addTitle: 'Agregar pago',
  addDescription: 'Nómina, arriendos, servicios básicos, seguros u otro pago recurrente que PAGOS FIJOS.xlsx no cubre.',
  conceptoPlaceholder: 'Ej. Arriendo bodega norte',
  fechaLabel: 'Fecha',
  listTitle: 'Pagos manuales',
  listDescription: 'Un pago "Pagado" deja de proyectarse en el Flujo; "Pendiente" aparece en la fecha indicada.',
  emptyMessage: 'Todavía no agregas ningún pago manual.',
  excelTitle: 'Pagos fijos desde Excel',
  excelDescription:
    'PAGOS FIJOS.xlsx (convenio IESS) — el monto viene del Excel, pero podés marcar cada renglón como pagado para sacarlo del Flujo sin editar el archivo origen.',
  excelEmptyMessage: 'No hay pagos fijos cargados desde Excel.',
  excelLabelField: 'category',
  onAdd: (concepto, monto, fecha) => store.addManualPago(concepto, monto, fecha),
  onUpdate: (id, partial) => store.updateManualPago(id, partial),
  onRemove: (id) => store.removeManualPago(id),
  onSetExcelEstado: (eventId, estado) => store.setExcelEstado(eventId, estado),
};

export function renderPagosPanel(pagos: ManualPago[], excelPagosFijos: CashEvent[], excelEstados: ExcelEstadoOverrides): HTMLElement {
  return renderManualEntryPanel(pagos, excelPagosFijos, excelEstados, CONFIG);
}
