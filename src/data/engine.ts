import type {
  BankAccount,
  CashAlert,
  CashEvent,
  DailyBucket,
  Filters,
  Kpis,
  WeeklyBucket,
} from '../types';
import { PROJECTION_DAYS } from '../config';
import { addDays, formatDateEs, todayISO, weekStart } from '../utils/dates';
import { formatMoney } from '../utils/format';

export function totalBankBalance(accounts: BankAccount[]): number {
  return accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
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
  const active = events.filter((e) => !e.excluded);
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

export function buildWeeklyBuckets(daily: DailyBucket[]): WeeklyBucket[] {
  const byWeek = new Map<string, DailyBucket[]>();
  for (const d of daily) {
    const ws = weekStart(d.date);
    if (!byWeek.has(ws)) byWeek.set(ws, []);
    byWeek.get(ws)!.push(d);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ws, days]) => {
      const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const cobranza = sorted.reduce((s, d) => s + d.cobranza, 0);
      const cheques = sorted.reduce((s, d) => s + d.cheques, 0);
      const pagosFijos = sorted.reduce((s, d) => s + d.pagosFijos, 0);
      return {
        weekStart: ws,
        weekEnd: last.date,
        label: `${formatDateEs(first.date)} – ${formatDateEs(last.date)}`,
        openingBalance: first.openingBalance,
        cobranza,
        cheques,
        pagosFijos,
        closingBalance: last.closingBalance,
        compromisosTotal: cheques + pagosFijos,
      };
    });
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
    .filter((e) => !e.excluded && e.kind === 'cheque' && e.date >= today && e.date <= proximaSemana)
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
