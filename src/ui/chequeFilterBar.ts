import type { CashEvent, ChequeFilters } from '../types';
import { store, type ChequeFilterScope } from '../state/store';
import { chequeMes, chequeAnio } from '../data/engine';
import { h } from './dom';

export type ChequeFilterDim = 'estado' | 'banco' | 'estatus2' | 'negociacion' | 'mes' | 'anio';

const DIM_LABEL: Record<ChequeFilterDim, string> = {
  estado: 'Estado',
  banco: 'Banco',
  estatus2: 'Estatus 2',
  negociacion: 'Negociación',
  mes: 'Mes',
  anio: 'Año',
};

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

function valuesFor(dim: ChequeFilterDim, events: CashEvent[]): (string | undefined)[] {
  switch (dim) {
    case 'estado':
      return events.map((e) => e.status);
    case 'banco':
      return events.map((e) => e.bank);
    case 'estatus2':
      return events.map((e) => String(e.meta?.estatusCobro ?? ''));
    case 'negociacion':
      return events.map((e) => String(e.meta?.negociacion ?? ''));
    case 'mes':
      return events.map(chequeMes);
    case 'anio':
      return events.map(chequeAnio);
  }
}

function select(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
  const sel = h('select', {
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none',
    style: 'border:1px solid var(--gridline);background:var(--surface);color:var(--ink-primary);min-width:160px',
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  sel.appendChild(h('option', { value: 'todos' }, ['Todos']));
  for (const opt of options) {
    const o = h('option', { value: opt }, [opt]) as HTMLOptionElement;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }
  return h('label', { class: 'flex flex-col gap-1' }, [
    h('span', { class: 'text-[11px] font-semibold uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [label]),
    sel,
  ]);
}

export function renderChequeFilterBar(
  scope: ChequeFilterScope,
  events: CashEvent[],
  filters: ChequeFilters,
  dims: ChequeFilterDim[]
): HTMLElement {
  const groups = dims.map((dim) =>
    select(DIM_LABEL[dim], filters[dim], uniqueSorted(valuesFor(dim, events)), (v) => store.setChequeFilters(scope, { [dim]: v }))
  );

  const resetBtn = h(
    'button',
    {
      class: 'text-xs font-medium rounded-lg px-3 py-2 self-end',
      style: 'color:var(--ink-secondary);border:1px solid var(--gridline)',
      onclick: () => store.resetChequeFilters(scope),
    },
    ['Limpiar filtros']
  );

  return h('div', { class: 'card p-4 flex flex-wrap items-end gap-3' }, [...groups, resetBtn]);
}
