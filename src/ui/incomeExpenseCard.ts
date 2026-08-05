import type { DailyBucket } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { STATUS } from './palette';

function barRow(label: string, amount: number, pct: number, color: string): HTMLElement {
  return h('div', { class: 'flex flex-col gap-1' }, [
    h('div', { class: 'flex items-center justify-between text-xs' }, [
      h('span', { style: 'color:var(--ink-secondary)' }, [label]),
      h('span', { class: 'tabular-nums font-semibold', style: `color:${color}` }, [formatMoney(amount)]),
    ]),
    h('div', { class: 'rounded-full overflow-hidden', style: 'height:8px;background:var(--page)' }, [
      h('div', { class: 'h-full rounded-full', style: `width:${pct}%;background:${color};transition:width 400ms ease` }),
    ]),
  ]);
}

/** Comparación Ingresos vs. Egresos proyectados del período — mismo patrón
 *  de barra que "Distribución por Banco", para que ambas tarjetas se lean
 *  como un mismo sistema visual. */
export function renderIncomeVsExpenseCard(daily: DailyBucket[]): HTMLElement {
  const ingresos = daily.reduce((s, d) => s + d.cobranza, 0);
  const egresos = daily.reduce((s, d) => s + d.cheques + d.pagosFijos, 0);
  const max = Math.max(ingresos, egresos, 1);

  return h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:14px;color:var(--ink-primary)' }, ['Ingresos vs. Egresos']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Proyectado en el período seleccionado']),
    ]),
    barRow('Ingresos', ingresos, (ingresos / max) * 100, STATUS.good),
    barRow('Egresos', egresos, (egresos / max) * 100, STATUS.critical),
  ]);
}
