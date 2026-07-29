import type { ChequesPivotYear } from '../types';
import { formatDateShortEs } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';

const CHEVRON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

function chevron(open: boolean): HTMLElement {
  const span = h('span', {
    style: `display:inline-flex;transition:transform 150ms ease;transform:rotate(${open ? 90 : 0}deg);color:var(--ink-muted)`,
    html: CHEVRON,
  });
  return span;
}

export function renderChequesPivot(pivot: ChequesPivotYear[]): HTMLElement {
  const expandedYears = new Set<string>(pivot.length === 1 ? [pivot[0].year] : []);
  const expandedMonths = new Set<string>();
  const expandedDays = new Set<string>();

  const totalGeneral = pivot.reduce((s, y) => s + y.total, 0);

  const body = h('div', { class: 'flex flex-col' });

  function row(opts: {
    label: string;
    total: number;
    depth: number;
    expandable: boolean;
    open: boolean;
    bold?: boolean;
    onClick?: () => void;
  }): HTMLElement {
    return h(
      'div',
      {
        class: `flex items-center justify-between px-3 py-2.5 border-b ${opts.onClick ? 'cursor-pointer' : ''}`,
        style: `border-color:var(--gridline);padding-left:${12 + opts.depth * 22}px;background:${
          opts.depth === 0 ? 'var(--page)' : 'var(--surface)'
        }`,
        onclick: opts.onClick,
      },
      [
        h('span', { class: 'flex items-center gap-2 text-sm', style: opts.bold ? 'font-weight:600' : '' }, [
          opts.expandable ? chevron(opts.open) : h('span', { style: 'width:14px;display:inline-block' }),
          opts.label,
        ]),
        h('span', { class: 'tabular-nums text-sm', style: opts.bold ? 'font-weight:600' : 'color:var(--ink-secondary)' }, [
          formatMoney(opts.total),
        ]),
      ]
    );
  }

  function dayDetail(events: ChequesPivotYear['months'][number]['days'][number]['events']): HTMLElement {
    return h(
      'div',
      { class: 'flex flex-col', style: 'background:var(--page);padding-left:78px' },
      events.map((e) =>
        h('div', { class: 'flex items-center justify-between px-3 py-1.5 border-b text-xs', style: 'border-color:var(--gridline)' }, [
          h('span', { style: 'color:var(--ink-secondary)' }, [`${e.counterparty} · ${e.category} · ${formatDateShortEs(e.date)}`]),
          h('span', { class: 'tabular-nums' }, [formatMoney(e.amount)]),
        ])
      )
    );
  }

  function renderTree(): void {
    body.innerHTML = '';
    for (const y of pivot) {
      body.appendChild(
        row({
          label: y.year,
          total: y.total,
          depth: 0,
          expandable: true,
          open: expandedYears.has(y.year),
          bold: true,
          onClick: () => {
            expandedYears.has(y.year) ? expandedYears.delete(y.year) : expandedYears.add(y.year);
            renderTree();
          },
        })
      );
      if (!expandedYears.has(y.year)) continue;

      for (const m of y.months) {
        const monthKey = `${y.year}-${m.month}`;
        body.appendChild(
          row({
            label: m.month,
            total: m.total,
            depth: 1,
            expandable: true,
            open: expandedMonths.has(monthKey),
            onClick: () => {
              expandedMonths.has(monthKey) ? expandedMonths.delete(monthKey) : expandedMonths.add(monthKey);
              renderTree();
            },
          })
        );
        if (!expandedMonths.has(monthKey)) continue;

        for (const d of m.days) {
          body.appendChild(
            row({
              label: formatDateShortEs(d.date),
              total: d.total,
              depth: 2,
              expandable: true,
              open: expandedDays.has(d.date),
              onClick: () => {
                expandedDays.has(d.date) ? expandedDays.delete(d.date) : expandedDays.add(d.date);
                renderTree();
              },
            })
          );
          if (expandedDays.has(d.date)) {
            body.appendChild(dayDetail(d.events));
          }
        }
      }
    }
    if (pivot.length === 0) {
      body.appendChild(
        h('p', { class: 'text-sm p-8 text-center', style: 'color:var(--ink-muted)' }, ['Sin cheques no cobrados en el rango filtrado.'])
      );
    }
  }

  renderTree();

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, ['Tabla de Cheques · Suma de No Cobrados']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Año › Mes › Día — clic para desplegar']),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total no cobrados']),
        h('p', { class: 'font-semibold tabular-nums', style: 'font-size:16px' }, [formatMoney(totalGeneral)]),
      ]),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin', style: 'max-height:640px' }, [body]),
  ]);
}
