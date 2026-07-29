import type { CashEvent, Filters } from '../types';
import { store } from '../state/store';
import { h } from './dom';

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

function select(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
  const sel = h('select', {
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none',
    style: 'border:1px solid var(--gridline);background:var(--surface);color:var(--ink-primary);min-width:150px',
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  sel.appendChild(h('option', { value: 'todos' }, ['Todos']));
  for (const opt of options) {
    const o = h('option', { value: opt }, [opt]) as HTMLOptionElement;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }
  return h('label', { class: 'flex flex-col gap-1' }, [
    h('span', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [label]),
    sel,
  ]);
}

function dateInput(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const input = h('input', {
    type: 'date',
    value,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums',
    style: 'border:1px solid var(--gridline);background:var(--surface);color:var(--ink-primary)',
    onchange: (e: Event) => onChange((e.target as HTMLInputElement).value),
  });
  return h('label', { class: 'flex flex-col gap-1' }, [
    h('span', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [label]),
    input,
  ]);
}

export function renderFilters(allEvents: CashEvent[], filters: Filters): HTMLElement {
  const banks = uniqueSorted(allEvents.map((e) => e.bank));
  const counterparties = uniqueSorted(allEvents.map((e) => e.counterparty));
  const categories = uniqueSorted(allEvents.map((e) => e.category));
  const statuses = uniqueSorted(allEvents.map((e) => e.status));

  const resetBtn = h(
    'button',
    {
      class: 'text-xs font-medium rounded-lg px-3 py-2 self-end',
      style: 'color:var(--ink-secondary);border:1px solid var(--gridline)',
      onclick: () => store.resetFilters(),
    },
    ['Limpiar filtros']
  );

  return h('div', { class: 'card p-4 flex flex-wrap items-end gap-3' }, [
    dateInput('Desde', filters.dateFrom, (v) => store.setFilters({ dateFrom: v })),
    dateInput('Hasta', filters.dateTo, (v) => store.setFilters({ dateTo: v })),
    select('Banco', filters.bank, banks, (v) => store.setFilters({ bank: v })),
    select('Proveedor / Cliente', filters.counterparty, counterparties, (v) => store.setFilters({ counterparty: v })),
    select('Categoría', filters.category, categories, (v) => store.setFilters({ category: v })),
    select('Estado', filters.status, statuses, (v) => store.setFilters({ status: v })),
    resetBtn,
  ]);
}
