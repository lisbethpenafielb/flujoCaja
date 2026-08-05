import type {
  BankAccount,
  CashAlert,
  CashEvent,
  ChequeFilters,
  ChequesPivotYear,
  DailyBucket,
  Filters,
  FlatChequePivot,
  Kpis,
  ManualPago,
  TreasuryMatrix,
  TreasuryPeriod,
  TreasuryRow,
  VendorPivot,
} from '../types';
import { PROJECTION_DAYS, SPECIAL_CHEQUE_ROWS } from '../config';
import {
  addDays,
  daysBetween,
  formatDateEs,
  formatDateLongEs,
  monthNameEs,
  todayISO,
  weekStart,
  yearOf,
} from '../utils/dates';
import { formatMoney } from '../utils/format';

export function totalBankBalance(accounts: BankAccount[]): number {
  return accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
}

function isNoCobrado(e: CashEvent): boolean {
  const estatus = String(e.meta?.estatusCobro ?? '').toUpperCase();
  return estatus !== 'COBRADO';
}

/** Un cheque ya COBRADO ya salió de la cuenta — su efecto ya está reflejado en
 *  el saldo bancario que Tesorería ingresa manualmente, así que se excluye de
 *  toda proyección hacia adelante para no restarlo dos veces. */
function isPendingEvent(e: CashEvent): boolean {
  if (e.excluded) return false;
  if (e.kind === 'cheque' && !isNoCobrado(e)) return false;
  return true;
}

export function applyFilters(events: CashEvent[], filters: Filters): CashEvent[] {
  return events.filter((e) => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (filters.bank !== 'todos' && (e.bank ?? 'Sin banco') !== filters.bank) return false;
    if (filters.counterparty !== 'todos' && e.counterparty !== filters.counterparty) return false;
    if (filters.category !== 'todos' && e.category !== filters.category) return false;
    if (filters.status !== 'todos' && e.status !== filters.status) return false;
    return true;
  });
}

function dayStatus(closing: number, avgDailyOutflow: number): DailyBucket['status'] {
  if (closing < 0) return 'negativo';
  if (avgDailyOutflow > 0 && closing < avgDailyOutflow) return 'bajo';
  return 'suficiente';
}

/** Construye la proyección diaria de PROJECTION_DAYS días, arrastrando el saldo
 *  final de un día como saldo inicial del siguiente (requisito explícito del
 *  módulo: recálculo automático en cascada). */
export function buildDailyProjection(
  events: CashEvent[],
  openingBalance: number,
  fromDate: string = todayISO(),
  days: number = PROJECTION_DAYS
): DailyBucket[] {
  const active = events.filter(isPendingEvent);
  const byDate = new Map<string, CashEvent[]>();
  for (const e of active) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const toDate = addDays(fromDate, days - 1);
  const totalOut = active
    .filter((e) => e.date >= fromDate && e.date <= toDate && (e.kind === 'cheque' || e.kind === 'pago_fijo'))
    .reduce((s, e) => s + e.amount, 0);
  const avgDailyOutflow = totalOut / days;

  const buckets: DailyBucket[] = [];
  let running = openingBalance;

  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const dayEvents = byDate.get(date) ?? [];
    const cobranza = dayEvents.filter((e) => e.kind === 'cobranza').reduce((s, e) => s + e.amount, 0);
    const cheques = dayEvents.filter((e) => e.kind === 'cheque').reduce((s, e) => s + e.amount, 0);
    const pagosFijos = dayEvents.filter((e) => e.kind === 'pago_fijo').reduce((s, e) => s + e.amount, 0);
    const opening = running;
    const closing = opening + cobranza - cheques - pagosFijos;
    running = closing;

    buckets.push({
      date,
      openingBalance: opening,
      cobranza,
      cheques,
      pagosFijos,
      closingBalance: closing,
      events: dayEvents,
      status: dayStatus(closing, avgDailyOutflow),
    });
  }

  return buckets;
}

export function computeKpis(daily: DailyBucket[], openingBalance: number): Kpis {
  const cobranzaEsperada = daily.reduce((s, d) => s + d.cobranza, 0);
  const chequesProgramados = daily.reduce((s, d) => s + d.cheques, 0);
  const pagosFijos = daily.reduce((s, d) => s + d.pagosFijos, 0);
  const saldoNetoProyectado = daily.length ? daily[daily.length - 1].closingBalance : openingBalance;

  const avgDailyOutflow = daily.length ? (chequesProgramados + pagosFijos) / daily.length : 0;
  const liquidezDias = avgDailyOutflow > 0 ? openingBalance / avgDailyOutflow : null;

  const negativeDays = daily.filter((d) => d.closingBalance < 0).length;
  let riesgo: Kpis['riesgo'] = 'bajo';
  if (negativeDays > 0) riesgo = 'alto';
  else if (liquidezDias !== null && liquidezDias < 7) riesgo = 'medio';

  return {
    saldoBancario: openingBalance,
    cobranzaEsperada,
    chequesProgramados,
    pagosFijos,
    saldoNetoProyectado,
    liquidezDias,
    riesgo,
  };
}

export function buildAlerts(daily: DailyBucket[], events: CashEvent[]): CashAlert[] {
  const alerts: CashAlert[] = [];

  const negativeDays = daily.filter((d) => d.closingBalance < 0);
  if (negativeDays.length > 0) {
    const first = negativeDays[0];
    alerts.push({
      id: 'saldo-negativo',
      level: 'critico',
      title: `${negativeDays.length} día(s) con saldo proyectado negativo`,
      detail: `El primer quiebre ocurre el ${formatDateEs(first.date)} con un saldo de ${formatMoney(
        first.closingBalance
      )}.`,
      date: first.date,
    });
  }

  const totalCobranza = daily.reduce((s, d) => s + d.cobranza, 0);
  const totalPagos = daily.reduce((s, d) => s + d.cheques + d.pagosFijos, 0);
  if (totalPagos > 0 && totalCobranza < totalPagos) {
    alerts.push({
      id: 'cobranza-insuficiente',
      level: 'advertencia',
      title: 'La cobranza proyectada no cubre los compromisos de pago',
      detail: `Cobranza esperada ${formatMoney(totalCobranza)} vs. compromisos totales ${formatMoney(totalPagos)} en el período.`,
    });
  }

  const totalPagosFijos = daily.reduce((s, d) => s + d.pagosFijos, 0);
  const opening = daily[0]?.openingBalance ?? 0;
  if (totalPagosFijos > opening) {
    alerts.push({
      id: 'pagos-fijos-exceden-disponibilidad',
      level: 'advertencia',
      title: 'Los pagos fijos superan la disponibilidad actual en bancos',
      detail: `Pagos fijos proyectados ${formatMoney(totalPagosFijos)} vs. saldo bancario actual ${formatMoney(opening)}.`,
    });
  }

  const today = todayISO();
  const proximaSemana = addDays(today, 7);
  const chequesGrandes = events
    .filter((e) => isPendingEvent(e) && e.kind === 'cheque' && e.date >= today && e.date <= proximaSemana)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  for (const c of chequesGrandes.slice(0, 3)) {
    if (c.amount < 1000) continue;
    alerts.push({
      id: `cheque-importante-${c.id}`,
      level: 'info',
      title: `Cheque importante próximo: ${c.counterparty}`,
      detail: `${formatMoney(c.amount)} programado para el ${formatDateEs(c.date)} (${c.category}).`,
      date: c.date,
    });
  }

  return alerts;
}

// ============================================================================
// Flujo de Caja en formato matriz (filas = partidas, columnas = período)
// ============================================================================

export function buildDayPeriods(fromISO: string, toISO: string): TreasuryPeriod[] {
  const n = Math.max(1, daysBetween(fromISO, toISO) + 1);
  const periods: TreasuryPeriod[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(fromISO, i);
    periods.push({ key: date, label: formatDateLongEs(date), start: date, end: date });
  }
  return periods;
}

export function buildWeekPeriods(fromISO: string, toISO: string): TreasuryPeriod[] {
  const n = Math.max(1, daysBetween(fromISO, toISO) + 1);
  const byWeek = new Map<string, string[]>();
  for (let i = 0; i < n; i++) {
    const date = addDays(fromISO, i);
    const ws = weekStart(date);
    if (!byWeek.has(ws)) byWeek.set(ws, []);
    byWeek.get(ws)!.push(date);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ws, dates]) => {
      const start = dates[0];
      const end = dates[dates.length - 1];
      return { key: ws, label: `${formatDateEs(start)} – ${formatDateEs(end)}`, start, end };
    });
}

function sumInRange(events: CashEvent[], start: string, end: string): number {
  return events.filter((e) => e.date >= start && e.date <= end).reduce((s, e) => s + e.amount, 0);
}

function sumBefore(events: CashEvent[], cutoff: string): number {
  return events.filter((e) => e.date < cutoff).reduce((s, e) => s + e.amount, 0);
}

function matchesSpecialRow(event: CashEvent, keywords: string[]): boolean {
  const cat = event.category.toUpperCase();
  return keywords.some((k) => cat.includes(k.toUpperCase()));
}

function buildFlowRow(label: string, kind: TreasuryRow['kind'], events: CashEvent[], cutoff: string, periods: TreasuryPeriod[], sign: 1 | -1): TreasuryRow {
  const rezagados = sumBefore(events, cutoff) * sign;
  const values = periods.map((p) => sumInRange(events, p.start, p.end) * sign);
  const total = rezagados + values.reduce((s, v) => s + v, 0);
  return { label, kind, rezagados, values, total };
}

/** Convierte las partidas digitadas a mano (Préstamo Perú / Préstamos
 *  Terceros — ver SPECIAL_CHEQUE_ROWS) en eventos sintéticos, para que
 *  participen del mismo cálculo (matriz, KPIs, alertas) que un cheque real
 *  sin duplicar lógica. Solo se usan en las pestañas Flujo Diario/Semanal —
 *  nunca se mezclan con BASE CHEQUES en las pestañas de cheques. */
export function buildManualLoanEvents(entries: Record<string, Record<string, number>>): CashEvent[] {
  const events: CashEvent[] = [];
  for (const [category, byDate] of Object.entries(entries)) {
    for (const [date, amount] of Object.entries(byDate)) {
      if (!amount) continue;
      events.push({
        id: `manual-${category}-${date}`,
        kind: 'cheque',
        date,
        amount,
        counterparty: 'Ingreso manual',
        category,
        status: 'Manual',
        confidence: 'confirmado',
        source: 'MANUAL',
        sourceSheet: 'manual',
        meta: { estatusCobro: 'PENDIENTE' },
      });
    }
  }
  return events;
}

/** Convierte los pagos de la pestaña Pagos en eventos `pago_fijo` para que
 *  participen del mismo Flujo/KPIs/alertas que la deuda IESS de PAGOS
 *  FIJOS.xlsx. Solo los "pendientes" generan evento — un pago "pagado" ya
 *  salió de caja, así que deja de proyectarse en el Flujo. */
export function buildManualPagoEvents(pagos: ManualPago[]): CashEvent[] {
  return pagos
    .filter((p) => p.estado === 'pendiente')
    .map((p) => ({
      id: `pago-manual-${p.id}`,
      kind: 'pago_fijo',
      date: p.fecha,
      amount: p.monto,
      counterparty: p.concepto,
      category: p.concepto,
      status: 'Pendiente',
      confidence: 'confirmado',
      source: 'MANUAL',
      sourceSheet: 'manual',
    }));
}

/**
 * Flujo de Caja en formato matriz: filas por banco + partidas de movimiento,
 * columnas por período (día o semana), con una columna "REZAGADOS" (backlog —
 * eventos anteriores al primer período) y arrastre de saldo en cascada, igual
 * que `buildDailyProjection` pero pivotado como lo usa Tesorería internamente.
 */
export function buildTreasuryMatrix(events: CashEvent[], bankAccounts: BankAccount[], periods: TreasuryPeriod[]): TreasuryMatrix {
  const active = events.filter(isPendingEvent);
  const cutoff = periods[0]?.start ?? todayISO();

  const totalRezagadosBancos = totalBankBalance(bankAccounts);
  const bankRows: TreasuryRow[] = bankAccounts.map((a) => ({
    label: `SALDO ${a.name}`,
    kind: 'banco',
    rezagados: a.balance,
    values: periods.map(() => null),
    total: a.balance,
    bankAccountId: a.id,
  }));

  const cobranza = active.filter((e) => e.kind === 'cobranza');
  const recaudoRow = buildFlowRow('(+) PROYECCIÓN RECAUDO', 'ingreso', cobranza, cutoff, periods, 1);

  const cheques = active.filter((e) => e.kind === 'cheque');
  const specialRows: TreasuryRow[] = [];
  const specialMatched = new Set<string>();
  for (const special of SPECIAL_CHEQUE_ROWS) {
    const matched = cheques.filter((e) => matchesSpecialRow(e, special.keywords));
    matched.forEach((e) => specialMatched.add(e.id));
    const row = buildFlowRow(`(-) ${special.label}`, 'egreso', matched, cutoff, periods, -1);
    if (special.manual) {
      row.manual = true;
      row.manualCategory = special.keywords[0];
    }
    specialRows.push(row);
  }
  const chequesRestantes = cheques.filter((e) => !specialMatched.has(e.id));
  const chequesRow = buildFlowRow('(-) CHEQUES POSFECHADOS', 'egreso', chequesRestantes, cutoff, periods, -1);

  const pagosFijos = active.filter((e) => e.kind === 'pago_fijo');
  const pagosFijosRow = buildFlowRow('(-) PAGOS FIJOS', 'egreso', pagosFijos, cutoff, periods, -1);

  const movementRows = [recaudoRow, ...specialRows, chequesRow, pagosFijosRow];

  const saldoFinalRezagados = totalRezagadosBancos + movementRows.reduce((s, r) => s + (r.rezagados ?? 0), 0);
  const saldoFinalValues = periods.map((_, i) => movementRows.reduce((s, r) => s + (r.values[i] ?? 0), 0));
  const saldoFinalTotal = saldoFinalRezagados + saldoFinalValues.reduce((s, v) => s + v, 0);
  const saldoFinalRow: TreasuryRow = {
    label: '(=) SALDO FINAL',
    kind: 'saldoFinal',
    rezagados: saldoFinalRezagados,
    values: saldoFinalValues,
    total: saldoFinalTotal,
  };

  const saldoInicialValues: number[] = [];
  const flujoDisponibleValues: number[] = [];
  let running = saldoFinalRezagados;
  for (let i = 0; i < periods.length; i++) {
    saldoInicialValues.push(running);
    const closing = running + saldoFinalValues[i];
    flujoDisponibleValues.push(closing);
    running = closing;
  }
  const saldoInicialRow: TreasuryRow = {
    label: '(+) SALDO INICIAL',
    kind: 'saldoInicial',
    rezagados: saldoFinalRezagados,
    values: saldoInicialValues,
    total: null,
  };
  const flujoDisponibleRow: TreasuryRow = {
    label: '(=) FLUJO DISPONIBLE',
    kind: 'flujoDisponible',
    rezagados: saldoFinalRezagados,
    values: flujoDisponibleValues,
    total: flujoDisponibleValues.length ? flujoDisponibleValues[flujoDisponibleValues.length - 1] : saldoFinalRezagados,
  };

  return {
    periods,
    totalRezagadosBancos,
    rows: [...bankRows, recaudoRow, ...specialRows, chequesRow, pagosFijosRow, saldoFinalRow, saldoInicialRow, flujoDisponibleRow],
  };
}

// ============================================================================
// Cheques: filtros tipo "botón" + tabla dinámica Año > Mes > Día
// ============================================================================

/** MES/AÑO de BASE CHEQUES (columnas J/K) tal como Tesorería las registró —
 *  con respaldo a la fecha del cheque solo para eventos que no traen esas
 *  columnas (demo, préstamos manuales). */
export function chequeMes(e: CashEvent): string {
  return String(e.meta?.mes ?? monthNameEs(e.date));
}

export function chequeAnio(e: CashEvent): string {
  return String(e.meta?.anio ?? yearOf(e.date));
}

export function applyChequeFilters(events: CashEvent[], filters: ChequeFilters): CashEvent[] {
  return events.filter((e) => {
    if (filters.estado !== 'todos' && e.status !== filters.estado) return false;
    if (filters.banco !== 'todos' && (e.bank ?? 'Sin banco') !== filters.banco) return false;
    if (filters.estatus2 !== 'todos' && String(e.meta?.estatusCobro ?? 'Sin estatus') !== filters.estatus2) return false;
    if (filters.negociacion !== 'todos' && String(e.meta?.negociacion ?? 'Sin negociación') !== filters.negociacion) return false;
    if (filters.mes !== 'todos' && chequeMes(e) !== filters.mes) return false;
    if (filters.anio !== 'todos' && chequeAnio(e) !== filters.anio) return false;
    if (filters.fechaInicio && e.date < filters.fechaInicio) return false;
    if (filters.fechaFin && e.date > filters.fechaFin) return false;
    return true;
  });
}

/** Cheques "rezagados": con fecha anterior a hoy y que aún no se han cobrado
 *  (si ya están COBRADO, son historia resuelta, no backlog pendiente). */
export function chequesRezagados(events: CashEvent[], asOf: string = todayISO()): CashEvent[] {
  return events
    .filter((e) => !e.excluded && e.kind === 'cheque' && e.date < asOf && isNoCobrado(e))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Tabla dinámica Año > Mes > Día con la suma de cheques NO COBRADOS, igual a
 *  la tabla dinámica "Suma de NO COBRADOS" que ya existe en BASE CHEQUES. */
export function buildChequesPivot(chequeEvents: CashEvent[]): ChequesPivotYear[] {
  const noCobrados = chequeEvents.filter((e) => !e.excluded && isNoCobrado(e));

  const years = new Map<string, Map<string, Map<string, CashEvent[]>>>();
  for (const e of noCobrados) {
    const y = yearOf(e.date);
    const m = monthNameEs(e.date);
    const d = e.date;
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, new Map());
    const days = months.get(m)!;
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(e);
  }

  const result: ChequesPivotYear[] = [...years.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([year, months]) => {
      const monthList = [...months.entries()]
        .sort(([, aDays], [, bDays]) => {
          const aDate = [...aDays.keys()][0];
          const bDate = [...bDays.keys()][0];
          return aDate < bDate ? -1 : 1;
        })
        .map(([month, days]) => {
          const dayList = [...days.entries()]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([date, evts]) => ({
              day: date.slice(8, 10),
              date,
              total: evts.reduce((s, e) => s + e.amount, 0),
              events: evts,
            }));
          return {
            month,
            monthKey: dayList[0]?.date.slice(0, 7) ?? month,
            total: dayList.reduce((s, d) => s + d.total, 0),
            days: dayList,
          };
        });
      return { year, total: monthList.reduce((s, m) => s + m.total, 0), months: monthList };
    });

  return result;
}

/** Tabla dinámica Proveedor × Fecha: una fila por proveedor (con sus cheques
 *  como subfilas desplegables) y una columna por fecha, igual a una tabla
 *  dinámica de Excel con PROVEEDORES en filas y FECHAS en columnas. */
export function buildChequeVendorPivot(events: CashEvent[]): VendorPivot {
  const dates = [...new Set(events.map((e) => e.date))].sort();

  const columnGroups: { label: string; span: number }[] = [];
  for (const date of dates) {
    const label = `${monthNameEs(date)} ${yearOf(date)}`;
    const last = columnGroups[columnGroups.length - 1];
    if (last && last.label === label) last.span++;
    else columnGroups.push({ label, span: 1 });
  }

  const byVendor = new Map<string, CashEvent[]>();
  for (const e of events) {
    if (!byVendor.has(e.counterparty)) byVendor.set(e.counterparty, []);
    byVendor.get(e.counterparty)!.push(e);
  }

  const rows = [...byVendor.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([proveedor, evts]) => {
      const totalsByDate: Record<string, number> = {};
      for (const e of evts) {
        totalsByDate[e.date] = (totalsByDate[e.date] ?? 0) + e.amount;
      }
      const cheques = [...evts]
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((e) => ({
          id: e.id,
          numeroCheque: String(e.meta?.numeroCheque ?? '—'),
          date: e.date,
          amount: e.amount,
        }));
      return { proveedor, total: evts.reduce((s, e) => s + e.amount, 0), totalsByDate, cheques };
    });

  const totalsByDate: Record<string, number> = {};
  for (const date of dates) {
    totalsByDate[date] = rows.reduce((s, r) => s + (r.totalsByDate[date] ?? 0), 0);
  }

  return { dates, columnGroups, rows, totalsByDate, grandTotal: rows.reduce((s, r) => s + r.total, 0) };
}

/** Tabla dinámica plana Proveedor + N° Cheque × Fecha para Cheques Rezagados
 *  — una fila por cheque, sin colapsar por proveedor, igual a la tabla
 *  dinámica de Excel de la que parte esta pestaña. */
export function buildRezagadosPivot(events: CashEvent[]): FlatChequePivot {
  const dates = [...new Set(events.map((e) => e.date))].sort();

  const columnGroups: { label: string; span: number }[] = [];
  for (const date of dates) {
    const label = `${monthNameEs(date)} ${yearOf(date)}`;
    const last = columnGroups[columnGroups.length - 1];
    if (last && last.label === label) last.span++;
    else columnGroups.push({ label, span: 1 });
  }

  const rows = [...events]
    .sort((a, b) => {
      const proveedor = a.counterparty.localeCompare(b.counterparty, 'es');
      if (proveedor !== 0) return proveedor;
      return (Number(a.meta?.numeroCheque) || 0) - (Number(b.meta?.numeroCheque) || 0);
    })
    .map((e) => ({
      proveedor: e.counterparty,
      numeroCheque: String(e.meta?.numeroCheque ?? '—'),
      date: e.date,
      amount: e.amount,
    }));

  const totalsByDate: Record<string, number> = {};
  for (const date of dates) {
    totalsByDate[date] = rows.filter((r) => r.date === date).reduce((s, r) => s + r.amount, 0);
  }

  return { dates, columnGroups, rows, totalsByDate, grandTotal: rows.reduce((s, r) => s + r.amount, 0) };
}
