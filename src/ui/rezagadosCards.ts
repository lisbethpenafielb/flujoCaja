import type { CashEvent } from '../types';
import { formatDateShortEs } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { iconSvg } from './icons';
import { STATUS } from './palette';

function detailRow(label: string, value: string): HTMLElement {
  return h('div', {}, [
    h('p', { class: 'text-[10.5px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [label]),
    h('p', { class: 'text-sm font-medium truncate', style: 'color:var(--ink-primary)' }, [value]),
  ]);
}

function chequeDetail(e: CashEvent): HTMLElement {
  return h(
    'div',
    { class: 'grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 rounded-lg', style: 'background:var(--page);padding:12px 14px' },
    [
      detailRow('N° Cheque', String(e.meta?.numeroCheque ?? '—')),
      detailRow('Fecha', formatDateShortEs(e.date)),
      detailRow('Banco', e.bank ?? '—'),
      detailRow('Concepto', e.category),
      detailRow('Valor', formatMoney(e.amount)),
      detailRow('Estado', e.status),
      detailRow('Negociación', String(e.meta?.negociacion ?? '—')),
    ]
  );
}

/** Tarjetas de proveedor expandibles — a pedido explícito, sin apariencia de
 *  tabla dinámica. Agrupa el listado ya filtrado de Cheques Rezagados
 *  directamente por proveedor (agregación de presentación, no toca CashEvent
 *  ni el motor de cálculo). */
export function renderRezagadosCards(events: CashEvent[], opts: { subtitle: string; emptyLabel: string }): HTMLElement {
  const expanded = new Set<string>();
  const body = h('div', { class: 'flex flex-col gap-2.5' });

  const byProveedor = new Map<string, CashEvent[]>();
  for (const e of events) {
    if (!byProveedor.has(e.counterparty)) byProveedor.set(e.counterparty, []);
    byProveedor.get(e.counterparty)!.push(e);
  }
  const groups = [...byProveedor.entries()]
    .map(([proveedor, cheques]) => ({
      proveedor,
      cheques: cheques.sort((a, b) => (a.date < b.date ? -1 : 1)),
      total: cheques.reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const total = groups.reduce((s, g) => s + g.total, 0);

  function renderBody(): void {
    body.innerHTML = '';
    if (groups.length === 0) {
      body.appendChild(h('p', { class: 'text-sm p-8 text-center', style: 'color:var(--ink-muted)' }, [opts.emptyLabel]));
      return;
    }
    for (const g of groups) {
      const isOpen = expanded.has(g.proveedor);
      const card = h('div', { class: 'card overflow-hidden' }, [
        h(
          'button',
          {
            class: 'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left',
            onclick: () => {
              expanded.has(g.proveedor) ? expanded.delete(g.proveedor) : expanded.add(g.proveedor);
              renderBody();
            },
          },
          [
            h('div', { class: 'flex items-center gap-3 min-w-0' }, [
              h('span', {
                style: `color:var(--ink-muted);transition:transform 150ms ease;transform:rotate(${isOpen ? 90 : 0}deg);flex-shrink:0`,
                html: iconSvg('chevronRight', 15),
              }),
              h('div', { class: 'min-w-0' }, [
                h('p', { class: 'font-semibold truncate', style: 'font-size:13.5px;color:var(--ink-primary)' }, [g.proveedor]),
                h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
                  `${g.cheques.length} cheque${g.cheques.length === 1 ? '' : 's'}`,
                ]),
              ]),
            ]),
            h('span', { class: 'tabular-nums font-semibold flex-shrink-0', style: 'font-size:14.5px;color:var(--ink-primary)' }, [
              formatMoney(g.total),
            ]),
          ]
        ),
        isOpen
          ? h('div', { class: 'flex flex-col gap-2 px-4 pb-4', style: 'border-top:1px solid var(--gridline);padding-top:12px' }, [
              ...g.cheques.map(chequeDetail),
            ])
          : null,
      ]);
      body.appendChild(card);
    }
  }

  renderBody();

  return h('div', { class: 'card p-5 flex flex-col gap-4' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Cheques Rezagados']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [opts.subtitle]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [`${groups.length} proveedores`]),
        h('p', { class: 'font-semibold tabular-nums', style: `font-size:16px;color:${STATUS.critical}` }, [formatMoney(total)]),
      ]),
    ]),
    body,
  ]);
}
