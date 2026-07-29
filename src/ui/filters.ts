import type { CashEvent, Filters } from '../types';
import { store } from '../state/store';
import { currentMonthKey } from '../utils/dates';
import { h } from './dom';
import { filterDate, filterMonth, filterResetButton, filterSelect, uniqueSorted } from './filterControls';

export function renderFilters(allEvents: CashEvent[], filters: Filters): HTMLElement {
  const banks = uniqueSorted(allEvents.map((e) => e.bank));
  const counterparties = uniqueSorted(allEvents.map((e) => e.counterparty));
  const categories = uniqueSorted(allEvents.map((e) => e.category));
  const statuses = uniqueSorted(allEvents.map((e) => e.status));

  return h('div', { class: 'card px-4 py-2.5 flex flex-wrap items-center gap-2' }, [
    h('span', { class: 'text-[11px] font-semibold uppercase tracking-wide mr-1', style: 'color:var(--ink-muted)' }, ['Filtros']),
    filterDate('calendar', 'Desde', filters.dateFrom, (v) => store.setFilters({ dateFrom: v })),
    filterDate('calendar', 'Hasta', filters.dateTo, (v) => store.setFilters({ dateTo: v })),
    filterSelect('bank', 'Banco', filters.bank, banks, (v) => store.setFilters({ bank: v })),
    filterSelect('user', 'Proveedor / Cliente', filters.counterparty, counterparties, (v) => store.setFilters({ counterparty: v })),
    filterSelect('tag', 'Categoría', filters.category, categories, (v) => store.setFilters({ category: v })),
    filterSelect('flag', 'Estado', filters.status, statuses, (v) => store.setFilters({ status: v })),
    filterResetButton(() => store.resetFilters(), 'Limpiar filtros'),
  ]);
}

/** Filtro exclusivo de Flujo Mensual: un único selector de mes calendario,
 *  deliberadamente sin fecha/banco/proveedor — no comparte estado con
 *  `filters` (el de Flujo Diario), para que ese filtro nunca influya aquí. */
export function renderMonthFilter(month: string): HTMLElement {
  return h('div', { class: 'card px-4 py-2.5 flex flex-wrap items-center gap-2' }, [
    h('span', { class: 'text-[11px] font-semibold uppercase tracking-wide mr-1', style: 'color:var(--ink-muted)' }, ['Mes']),
    filterMonth('calendar', 'Mes', month, (v) => store.setMonthlyFilter(v)),
    filterResetButton(() => store.setMonthlyFilter(currentMonthKey()), 'Mes actual'),
  ]);
}
