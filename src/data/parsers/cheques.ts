import type { CashEvent, FlowConfidence } from '../../types';
import { excelValueToISO } from '../../utils/dates';
import { parseExcelNumber } from '../../utils/format';
import { allSheetGrids, cell, findColumn, findHeaderRow, isRowEmpty, readWorkbook } from '../xlsxUtils';

// Mejora de modelo #6: la columna "DIAS ANTI" viene con una fórmula rota (texto
// literal "ERROR") en el archivo fuente actual — se ignora deliberadamente.

// Mejora de modelo #4: ESTADO mezcla catálogo cerrado con notas libres. Normalizamos
// por palabras clave en vez de comparar el texto completo.
const ESTADOS_ANULADOS = ['ANULADO'];
const ESTADOS_PROTESTADOS = ['PROTESTADO'];
const ESTADOS_PAGADOS = ['PAGADO'];

function classifyEstado(estadoRaw: string): { confidence: FlowConfidence; excluded: boolean; reason?: string } {
  const u = estadoRaw.toUpperCase();
  if (ESTADOS_ANULADOS.some((k) => u.includes(k))) {
    return { confidence: 'no_confirmado', excluded: true, reason: 'Cheque ANULADO' };
  }
  if (ESTADOS_PAGADOS.some((k) => u.includes(k))) {
    return { confidence: 'no_confirmado', excluded: true, reason: 'Cheque ya PAGADO (movimiento histórico)' };
  }
  if (ESTADOS_PROTESTADOS.some((k) => u.includes(k))) {
    return { confidence: 'vencido', excluded: false, reason: 'Cheque PROTESTADO — requiere gestión' };
  }
  return { confidence: 'confirmado', excluded: false };
}

const REQUIRED_TOKENS = ['EGRESO', 'PROVEEDORES', 'VALOR', 'FECHAS', 'ESTADO'];

export function parseChequesWorkbook(bytes: ArrayBuffer, warnings: string[]): CashEvent[] {
  const wb = readWorkbook(bytes);
  const grids = allSheetGrids(wb);

  // La hoja de detalle real de cheques es la que trae encabezados EGRESO/PROVEEDORES/
  // VALOR/FECHAS/ESTADO. Las otras hojas del libro (tabla dinámica de "no cobrados"
  // y el estado de cuenta bancaria histórico) se ignoran a propósito: no representan
  // compromisos de pago futuros.
  let target: { sheet: string; index: number; headers: string[] } | null = null;
  for (const g of grids) {
    const found = findHeaderRow(g.rows, REQUIRED_TOKENS, 15);
    if (found) {
      target = { sheet: g.name, index: found.index, headers: found.headers };
      break;
    }
  }

  if (!target) {
    warnings.push(
      'BASE CHEQUES.xlsx: no se encontró la hoja de detalle de cheques (encabezados EGRESO/PROVEEDORES/VALOR/FECHAS/ESTADO). Se omitió este archivo.'
    );
    return [];
  }

  const { headers } = target;
  const rows = grids.find((g) => g.name === target!.sheet)!.rows;

  const idx = {
    egreso: findColumn(headers, ['EGRESO', 'CHEQUE']),
    proveedor: findColumn(headers, ['PROVEEDORES', 'PROVEEDOR', 'BENEFICIARIO']),
    categoria: findColumn(headers, ['CATEGORIA']),
    valor: findColumn(headers, ['VALOR']),
    fecha: findColumn(headers, ['FECHAS', 'FECHA CHEQUE', 'FECHA']),
    estado: findColumn(headers, ['ESTADO']),
    banco: findColumn(headers, ['BANCO']),
    firmante: findColumn(headers, ['FIRMANTE']),
    fechaCobro: findColumn(headers, ['FECHA COBRO']),
    negociacion: findColumn(headers, ['NEGOCIACION']),
    estatus2: findColumn(headers, ['ESTATUS 2']),
  };

  const events: CashEvent[] = [];
  let skippedNoDate = 0;
  let skippedNoValue = 0;

  for (let r = target.index + 1; r < rows.length; r++) {
    const row = rows[r];
    if (isRowEmpty(row)) continue;

    const proveedor = String(cell(row, idx.proveedor) ?? '').trim();
    if (!proveedor) continue;

    const valor = parseExcelNumber(cell(row, idx.valor));
    if (valor <= 0) {
      skippedNoValue++;
      continue;
    }

    const fechaISO = excelValueToISO(cell(row, idx.fecha));
    if (!fechaISO) {
      skippedNoDate++;
      continue;
    }

    const estadoRaw = String(cell(row, idx.estado) ?? '').trim();
    const { confidence, excluded, reason } = classifyEstado(estadoRaw);
    const chequeNum = String(cell(row, idx.egreso) ?? '').trim();

    events.push({
      id: `cheque-${chequeNum || r}`,
      kind: 'cheque',
      date: fechaISO,
      amount: valor,
      counterparty: proveedor,
      category: String(cell(row, idx.categoria) ?? 'Sin categoría').trim() || 'Sin categoría',
      status: estadoRaw || 'Sin estado',
      confidence,
      bank: String(cell(row, idx.banco) ?? '').trim() || undefined,
      source: 'BASE CHEQUES',
      sourceSheet: target.sheet,
      excluded,
      excludedReason: reason,
      meta: {
        numeroCheque: chequeNum,
        firmante: String(cell(row, idx.firmante) ?? '').trim(),
        negociacion: String(cell(row, idx.negociacion) ?? '').trim(),
        estatusCobro: String(cell(row, idx.estatus2) ?? '').trim(),
        fechaCobro: excelValueToISO(cell(row, idx.fechaCobro)) ?? undefined,
      },
    });
  }

  if (skippedNoDate > 0) {
    warnings.push(`BASE CHEQUES: ${skippedNoDate} filas sin fecha válida fueron omitidas.`);
  }
  if (events.length === 0) {
    warnings.push('BASE CHEQUES: no se pudo extraer ningún cheque con fecha y valor válidos.');
  }

  return events;
}
