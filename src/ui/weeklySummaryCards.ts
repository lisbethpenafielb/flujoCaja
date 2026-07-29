import type { DailyBucket, TreasuryPeriod } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { icon } from './icons';
import { STATUS } from './palette';

function statRow(iconName: Parameters<typeof icon>[0], label: string, value: string, color?: string): HTMLElement {
  return h('div', { class: 'flex items-center justify-between' }, [
    h('span', { class: 'flex items-center gap-1.5 text-xs', style: 'color:var(--ink-secondary)' }, [
      icon(iconName, { size: 13, style: 'color:var(--ink-muted)' }),
      label,
    ]),
    h('span', { class: 'tabular-nums font-semibold text-sm', style: `color:${color ?? 'var(--ink-primary)'}` }, [value]),
  ]);
}

/** Complementa (no reemplaza) la tabla de Flujo Semanal con una lectura más
 *  ejecutiva por semana. Los valores se derivan agregando `DailyBucket[]`
 *  (ya calculado por buildDailyProjection) por período — no hay ninguna
 *  fórmula financiera nueva, solo una suma/selección de datos existentes. */
export function renderWeeklySummaryCards(daily: DailyBucket[], periods: TreasuryPeriod[]): HTMLElement {
  const cards = periods.map((p) => {
    const days = daily.filter((d) => d.date >= p.start && d.date <= p.end);
    if (days.length === 0) return null;
    const ingresos = days.reduce((s, d) => s + d.cobranza, 0);
    const egresos = days.reduce((s, d) => s + d.cheques + d.pagosFijos, 0);
    const saldoFinal = days[days.length - 1].closingBalance;
    const avgOut = egresos / days.length;
    const liquidez = avgOut > 0 ? saldoFinal / avgOut : null;

    return h('div', { class: 'card card-hover p-4 flex flex-col gap-3 animate-fade-in' }, [
      h('p', { class: 'text-xs font-semibold uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [p.label]),
      h('div', { class: 'flex flex-col gap-2 pt-1', style: 'border-top:1px solid var(--gridline)' }, [
        statRow('inflow', 'Ingresos', formatMoney(ingresos), STATUS.good),
        statRow('outflowCheck', 'Egresos', formatMoney(egresos), STATUS.critical),
        statRow('scale', 'Saldo', formatMoney(saldoFinal), saldoFinal < 0 ? STATUS.critical : 'var(--ink-primary)'),
        statRow('droplet', 'Liquidez', liquidez === null ? '—' : `${liquidez.toFixed(1)} días`),
      ]),
    ]);
  });

  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3' }, cards);
}
