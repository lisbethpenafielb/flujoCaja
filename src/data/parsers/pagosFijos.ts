import type { CashEvent } from '../../types';
import { parseExcelNumber } from '../../utils/format';
import { allSheetGrids, cell, findHeaderRow, isRowEmpty, readWorkbook } from '../xlsxUtils';

// Mejora de modelo #1: hoy PAGOS FIJOS.xlsx solo modela la deuda IESS por convenio,
// mensual. No hay nómina, arriendos, servicios básicos, seguros, etc. El parser deja
// esto explícito vía `warnings` para que la UI muestre el aviso correspondiente.

// El archivo trae totales MENSUALES, no una fecha exacta de pago. Se asume el día
// del mes indicado abajo como vencimiento (ajustable si Tesorería confirma la fecha
// real de pago de los convenios IESS).
const DIA_VENCIMIENTO_MENSUAL = 15;

const MES_ES: Record<string, number> = {
  ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7,
  AGO: 8, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12,
};

function parseMesLabel(label: string): string | null {
  const m = label.trim().match(/^([A-Za-zÁ-ú]{3})-?(\d{4})$/);
  if (!m) return null;
  const mon = MES_ES[m[1].toUpperCase()];
  if (!mon) return null;
  const year = Number(m[2]);
  const day = Math.min(DIA_VENCIMIENTO_MENSUAL, 28);
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function parsePagosFijosWorkbook(bytes: ArrayBuffer, warnings: string[]): Promise<CashEvent[]> {
  const wb = await readWorkbook(bytes);
  const grids = allSheetGrids(wb);

  const target = grids
    .map((g) => ({ g, found: findHeaderRow(g.rows, ['MES', 'TOTAL MENSUAL'], 10) }))
    .find((x) => x.found);

  if (!target || !target.found) {
    warnings.push('PAGOS FIJOS.xlsx: no se encontró la tabla mensual (encabezados "Mes" / "Total mensual").');
    return [];
  }

  const { g, found } = target;
  const headers = found.headers;
  const mesIdx = headers.findIndex((h) => h === 'MES');
  const totalIdx = headers.findIndex((h) => h.includes('TOTAL MENSUAL'));
  const sucursalCols = headers
    .map((h, i) => ({ h, i }))
    .filter((x) => x.h.includes('SUCURSAL'));

  const events: CashEvent[] = [];

  for (let r = found.index + 1; r < g.rows.length; r++) {
    const row = g.rows[r];
    if (isRowEmpty(row)) continue;
    const mesLabel = String(cell(row, mesIdx) ?? '').trim();
    if (!mesLabel || /^TOTAL$/i.test(mesLabel)) continue;

    const fecha = parseMesLabel(mesLabel);
    if (!fecha) continue;

    const totalMes = parseExcelNumber(cell(row, totalIdx));
    if (totalMes <= 0) continue;

    // Un evento consolidado por mes (para el KPI y la fecha de vencimiento) y el
    // desglose por sucursal queda en `meta` para inspección/filtrado futuro.
    const sucursalesDetalle: Record<string, number> = {};
    sucursalCols.forEach(({ h, i }) => {
      const v = parseExcelNumber(cell(row, i));
      if (v > 0) sucursalesDetalle[h] = v;
    });

    events.push({
      id: `pago-fijo-iess-${mesLabel}`,
      kind: 'pago_fijo',
      date: fecha,
      amount: totalMes,
      counterparty: 'IESS',
      category: 'Deuda IESS (convenios)',
      status: 'Programado',
      confidence: 'confirmado',
      source: 'PAGOS FIJOS',
      sourceSheet: g.name,
      meta: { mes: mesLabel, ...sucursalesDetalle },
    });
  }

  if (events.length > 0) {
    warnings.push(
      'PAGOS FIJOS.xlsx solo contiene la deuda IESS por convenio. Faltan nómina, arriendos, servicios básicos, seguros y otros pagos recurrentes — el KPI "Pagos Fijos" está incompleto hasta que se amplíe el archivo fuente.'
    );
  } else {
    warnings.push('PAGOS FIJOS.xlsx: no se pudo extraer ninguna fila mensual válida.');
  }

  return events;
}
