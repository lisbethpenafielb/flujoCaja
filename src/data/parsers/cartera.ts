import type { CashEvent, FlowConfidence } from '../../types';
import { excelValueToISO, nextWeekdayDate, todayISO } from '../../utils/dates';
import { parseExcelNumber } from '../../utils/format';
import {
  allSheetGrids,
  cell,
  findColumn,
  findHeaderRow,
  headerIndex,
  isRowEmpty,
  readWorkbook,
} from '../xlsxUtils';

const WEEKDAY_TOKENS = ['LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO', 'DOMINGO'];

// Mejora de modelo #5: excluimos automáticamente cartera que, por su naturaleza,
// no se convertirá en efectivo (empresas relacionadas, en proceso legal, dadas de
// baja o cruces contables). "POR SOLUCIONAR" se conserva pero marcado como riesgo.
function classifyEstatusLegal(estatus: string): { excluded: boolean; reason?: string; atRisk: boolean } {
  const u = estatus.toUpperCase();
  if (u.includes('RELACIONADA')) return { excluded: true, reason: 'Parte relacionada (intercompañía)', atRisk: false };
  if (u.includes('LEGAL')) return { excluded: true, reason: 'En proceso legal', atRisk: false };
  if (u.includes('DAR BAJA')) return { excluded: true, reason: 'Marcada para dar de baja', atRisk: false };
  if (u.includes('CRUCE DE CUENTAS')) return { excluded: true, reason: 'Cruce de cuentas (no genera flujo de caja)', atRisk: false };
  if (u.includes('AUTOCONSUMO')) return { excluded: true, reason: 'Autoconsumo interno', atRisk: false };
  if (u.includes('POR SOLUCIONAR')) return { excluded: false, reason: 'Por solucionar — alto riesgo de cobro', atRisk: true };
  return { excluded: false, atRisk: false };
}

function classifyObservacion(obs: string): FlowConfidence {
  const u = obs.toUpperCase();
  if (u.includes('PRONTO PAGO') || u.includes('CRONOGRAMA')) return 'confirmado';
  if (u.includes('GESTION')) return 'en_gestion';
  return 'no_confirmado';
}

function buildLegalMap(wb: ReturnType<typeof readWorkbook>): Map<string, string> {
  const grids = allSheetGrids(wb);
  const legalSheet =
    grids.find((g) => /DETALLE LEGAL/i.test(g.name)) ?? grids.find((g) => /^legal$/i.test(g.name));
  const map = new Map<string, string>();
  if (!legalSheet) return map;
  const found = findHeaderRow(legalSheet.rows, ['CLIENTE', 'ESTATUS'], 5);
  if (!found) return map;
  const idx = headerIndex(found.headers);
  const clienteIdx = idx.get('CLIENTE') ?? 0;
  const estatusIdx = idx.get('ESTATUS') ?? 1;
  for (let r = found.index + 1; r < legalSheet.rows.length; r++) {
    const row = legalSheet.rows[r];
    if (isRowEmpty(row)) continue;
    const cliente = String(cell(row, clienteIdx) ?? '').trim().toUpperCase();
    const estatus = String(cell(row, estatusIdx) ?? '').trim();
    if (cliente) map.set(cliente, estatus);
  }
  return map;
}

function parseTransportistas(
  wb: ReturnType<typeof readWorkbook>,
  legalMap: Map<string, string>,
  warnings: string[]
): { events: CashEvent[]; excluded: CashEvent[]; clientesConDetalle: Set<string> } {
  const grids = allSheetGrids(wb);
  const sheet = grids.find((g) => findHeaderRow(g.rows, ['CLIENTE', 'FECHA_VENCIMIENTO', 'SALDO_FACTURA'], 5));
  const events: CashEvent[] = [];
  const excluded: CashEvent[] = [];
  const clientesConDetalle = new Set<string>();

  if (!sheet) {
    warnings.push('PROYECCION DE CARTERA: no se encontró la hoja de facturas con FECHA_VENCIMIENTO/SALDO_FACTURA.');
    return { events, excluded, clientesConDetalle };
  }

  const found = findHeaderRow(sheet.rows, ['CLIENTE', 'FECHA_VENCIMIENTO', 'SALDO_FACTURA'], 5)!;
  const idx = {
    cliente: findColumn(found.headers, ['CLIENTE']),
    factura: findColumn(found.headers, ['NUMERO_FACTURA', 'FACTURA']),
    valor: findColumn(found.headers, ['VALOR_FACTURA']),
    vencimiento: findColumn(found.headers, ['FECHA_VENCIMIENTO']),
    saldo: findColumn(found.headers, ['SALDO_FACTURA']),
  };
  const today = todayISO();

  for (let r = found.index + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r];
    if (isRowEmpty(row)) continue;
    const cliente = String(cell(row, idx.cliente) ?? '').trim();
    if (!cliente) continue;
    clientesConDetalle.add(cliente.toUpperCase());

    const saldo = parseExcelNumber(cell(row, idx.saldo));
    if (saldo <= 0) continue;
    const vencISO = excelValueToISO(cell(row, idx.vencimiento));
    if (!vencISO) continue;

    const legalEstatus = legalMap.get(cliente.toUpperCase()) ?? '';
    const { excluded: isExcluded, reason, atRisk } = classifyEstatusLegal(legalEstatus);
    const confidence: FlowConfidence = isExcluded
      ? 'no_confirmado'
      : atRisk
      ? 'en_gestion'
      : vencISO < today
      ? 'vencido'
      : 'confirmado';

    const evt: CashEvent = {
      id: `cartera-tr-${cell(row, idx.factura) ?? r}`,
      kind: 'cobranza',
      date: vencISO,
      amount: saldo,
      counterparty: cliente,
      category: 'Cartera transportistas',
      status: legalEstatus || 'Vigente',
      confidence,
      source: 'PROYECCION DE CARTERA',
      sourceSheet: sheet.name,
      excluded: isExcluded,
      excludedReason: reason,
      meta: {
        numeroFactura: String(cell(row, idx.factura) ?? ''),
        valorFactura: parseExcelNumber(cell(row, idx.valor)),
      },
    };
    (isExcluded ? excluded : events).push(evt);
  }

  return { events, excluded, clientesConDetalle };
}

function parseResumen(
  wb: ReturnType<typeof readWorkbook>,
  legalMap: Map<string, string>,
  clientesConDetalle: Set<string>,
  warnings: string[]
): { events: CashEvent[]; excluded: CashEvent[] } {
  const grids = allSheetGrids(wb);
  const sheet = grids.find((g) => /RESUMEN/i.test(g.name));
  const events: CashEvent[] = [];
  const excluded: CashEvent[] = [];
  if (!sheet) return { events, excluded };

  const found = findHeaderRow(sheet.rows, ['CLIENTE', ...WEEKDAY_TOKENS], 6);
  if (!found) {
    warnings.push('PROYECCION DE CARTERA (RESUMEN): no se encontró la fila de encabezados esperada.');
    return { events, excluded };
  }
  const idx = headerIndex(found.headers);
  const clienteIdx = findColumn(found.headers, ['CLIENTE']);
  const obsIdx = findColumn(found.headers, ['OBSERVACIONES']);
  const weekdayCols = WEEKDAY_TOKENS.map((tok) => ({ tok, i: idx.get(tok) ?? -1 })).filter((w) => w.i >= 0);
  const today = todayISO();

  let skippedYaEnDetalle = 0;

  for (let r = found.index + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r];
    if (isRowEmpty(row)) continue;
    const cliente = String(cell(row, clienteIdx) ?? '').trim();
    if (!cliente || /^TOTAL/i.test(cliente)) continue;

    // Evita doble conteo: si el cliente ya tiene facturas con fecha exacta en la
    // hoja TRANSPORTISTAS, no se vuelve a proyectar aquí con la fecha aproximada
    // de día-de-semana (mejora de modelo #3 — riesgo de duplicación entre hojas).
    if (clientesConDetalle.has(cliente.toUpperCase())) {
      skippedYaEnDetalle++;
      continue;
    }

    const observacion = String(cell(row, obsIdx) ?? '').trim();
    const legalEstatus = legalMap.get(cliente.toUpperCase()) ?? '';
    const { excluded: isExcluded, reason, atRisk } = classifyEstatusLegal(legalEstatus);

    for (const { tok, i } of weekdayCols) {
      const monto = parseExcelNumber(cell(row, i));
      if (monto <= 0) continue;
      const fecha = nextWeekdayDate(tok, today);
      if (!fecha) continue;
      const baseConfidence = classifyObservacion(observacion);
      const confidence: FlowConfidence = isExcluded ? 'no_confirmado' : atRisk ? 'en_gestion' : baseConfidence;

      const evt: CashEvent = {
        id: `cartera-res-${cliente}-${tok}-${r}`,
        kind: 'cobranza',
        date: fecha,
        amount: monto,
        counterparty: cliente,
        category: 'Cartera clientes (cronograma semanal)',
        status: legalEstatus || observacion || 'Programado',
        confidence,
        source: 'PROYECCION DE CARTERA',
        sourceSheet: sheet.name,
        excluded: isExcluded,
        excludedReason: reason,
        meta: { diaSemana: tok, observaciones: observacion },
      };
      (isExcluded ? excluded : events).push(evt);
    }
  }

  if (skippedYaEnDetalle > 0) {
    warnings.push(
      `PROYECCION DE CARTERA: ${skippedYaEnDetalle} cliente(s) de RESUMEN ya tenían facturas con fecha exacta en TRANSPORTISTAS; se usó la fecha exacta para evitar duplicar la cobranza proyectada.`
    );
  }

  return { events, excluded };
}

export function parseCarteraWorkbook(bytes: ArrayBuffer, warnings: string[]): { events: CashEvent[]; excluded: CashEvent[] } {
  const wb = readWorkbook(bytes);
  const legalMap = buildLegalMap(wb);
  const { events: trEvents, excluded: trExcluded, clientesConDetalle } = parseTransportistas(wb, legalMap, warnings);
  const { events: resEvents, excluded: resExcluded } = parseResumen(wb, legalMap, clientesConDetalle, warnings);
  return { events: [...trEvents, ...resEvents], excluded: [...trExcluded, ...resExcluded] };
}
