import type { CashEvent, ChequeFilters } from '../types';
import { store, type ChequeFilterScope } from '../state/store';
import { chequeMes, chequeAnio } from '../data/engine';
import { h } from './dom';
import { filterDate, filterResetButton, filterSelect, uniqueSorted } from './filterControls';
import type { IconName } from './icons';

export type ChequeFilterDim = 'estado' | 'banco' | 'estatus2' | 'negociacion' | 'mes' | 'anio' | 'fechaInicio' | 'fechaFin';

const DIM_META: Record<ChequeFilterDim, { label: string; icon: IconName }> = {
  estado: { label: 'Estado', icon: 'flag' },
  banco: { label: 'Banco', icon: 'bank' },
  estatus2: { label: 'Estatus 2', icon: 'checkCircle' },
  negociacion: { label: 'Negociación', icon: 'tag' },
  mes: { label: 'Mes', icon: 'calendar' },
  anio: { label: 'Año', icon: 'calendar' },
  fechaInicio: { label: 'Desde', icon: 'calendar' },
  fechaFin: { label: 'Hasta', icon: 'calendar' },
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
      return events.map(chequeMes);
    case 'anio':
      return events.map(chequeAnio);
    case 'fechaInicio':
    case 'fechaFin':
      return [];
  }
}

export function renderChequeFilterBar(
  scope: ChequeFilterScope,
  events: CashEvent[],
  filters: ChequeFilters,
  dims: ChequeFilterDim[]
): HTMLElement {
  const groups = dims.map((dim) => {
    const meta = DIM_META[dim];
    if (dim === 'fechaInicio' || dim === 'fechaFin') {
      return filterDate(meta.icon, meta.label, filters[dim], (v) => store.setChequeFilters(scope, { [dim]: v }));
    }
    return filterSelect(meta.icon, meta.label, filters[dim], uniqueSorted(valuesFor(dim, events)), (v) => store.setChequeFilters(scope, { [dim]: v }));
  });

  return h('div', { class: 'card px-4 py-2.5 flex flex-wrap items-center gap-2' }, [
    h('span', { class: 'text-[11px] font-semibold uppercase tracking-wide mr-1', style: 'color:var(--ink-muted)' }, ['Filtros']),
    ...groups,
    filterResetButton(() => store.resetChequeFilters(scope)),
  ]);
}
