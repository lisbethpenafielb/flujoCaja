import type { CashEvent } from '../types';
import { formatDateShortEs } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';

function th(label: string, align: 'left' | 'right' = 'left'): HTMLElement {
  return h(
    'th',
    {
      class: 'sticky top-0 text-xs font-semibold uppercase tracking-wide py-2.5 px-3 border-b whitespace-nowrap',
      style: `background:var(--surface);color:var(--ink-muted);border-color:var(--gridline);text-align:${align}`,
    },
    [label]
  );
}

function td(content: string, align: 'left' | 'right' = 'left', extra = ''): HTMLElement {
  return h('td', { class: `text-sm py-2 px-3 whitespace-nowrap ${extra}`, style: `text-align:${align}` }, [content]);
}

export function renderChequeTable(events: CashEvent[], opts: { title: string; subtitle: string; emptyLabel: string }): HTMLElement {
  const total = events.reduce((s, e) => s + e.amount, 0);

  const rows = events.map((e) =>
    h('tr', { class: 'border-b last:border-0', style: 'border-color:var(--gridline)' }, [
      td(formatDateShortEs(e.date), 'left', 'font-medium tabular-nums'),
      td(e.counterparty),
      td(e.category),
      td(formatMoney(e.amount), 'right', 'tabular-nums font-medium'),
      td(e.bank ?? '—'),
      td(e.status),
      td(String(e.meta?.estatusCobro ?? '—')),
      td(String(e.meta?.negociacion ?? '—')),
    ])
  );

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, [opts.title]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [opts.subtitle]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [`${events.length} cheques`]),
        h('p', { class: 'font-semibold tabular-nums', style: 'font-size:16px' }, [formatMoney(total)]),
      ]),
    ]),
    events.length === 0
      ? h('p', { class: 'text-sm p-8 text-center', style: 'color:var(--ink-muted)' }, [opts.emptyLabel])
      : h('div', { class: 'overflow-auto scrollbar-thin', style: 'max-height:600px' }, [
          h('table', { class: 'w-full border-collapse' }, [
            h('thead', {}, [
              h('tr', {}, [
                th('Fecha'),
                th('Proveedor'),
                th('Categoría'),
                th('Monto', 'right'),
                th('Banco'),
                th('Estado'),
                th('Estatus 2'),
                th('Negociación'),
              ]),
            ]),
            h('tbody', {}, rows),
          ]),
        ]),
  ]);
}
