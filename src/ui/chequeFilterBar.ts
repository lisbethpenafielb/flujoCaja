import type { CashEvent, ChequeFilters } from '../types';
import { store, type ChequeFilterScope } from '../state/store';
import { monthNameEs, yearOf, isoWeekLabel } from '../utils/dates';
import { chipGroupFromValues } from './filterChips';
import { h } from './dom';

export type ChequeFilterDim = 'estado' | 'banco' | 'estatus2' | 'negociacion' | 'mes' | 'anio' | 'semana';

const DIM_LABEL: Record<ChequeFilterDim, string> = {
  estado: 'Estado',
  banco: 'Banco',
  estatus2: 'Estatus 2',
  negociacion: 'Negociación',
  mes: 'Mes',
  anio: 'Año',
  semana: 'Semana',
};

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
      return events.map((e) => monthNameEs(e.date));
    case 'anio':
      return events.map((e) => yearOf(e.date));
    case 'semana':
      return events.map((e) => isoWeekLabel(e.date));
  }
}

export function renderChequeFilterBar(
  scope: ChequeFilterScope,
  events: CashEvent[],
  filters: ChequeFilters,
  dims: ChequeFilterDim[]
): HTMLElement {
  const groups = dims.map((dim) =>
    chipGroupFromValues({
      label: DIM_LABEL[dim],
      active: filters[dim],
      values: valuesFor(dim, events),
      onSelect: (v) => store.setChequeFilters(scope, { [dim]: v }),
    })
  );

  const resetBtn = h(
    'button',
    {
      class: 'text-xs font-medium rounded-lg px-3 py-1.5 self-start',
      style: 'color:var(--ink-secondary);border:1px solid var(--gridline)',
      onclick: () => store.resetChequeFilters(scope),
    },
    ['Limpiar']
  );

  return h('div', { class: 'card p-4 flex flex-wrap items-start gap-5' }, [...groups, resetBtn]);
}
