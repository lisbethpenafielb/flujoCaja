import type { VendorPivot } from '../types';
import { dayOfMonth } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';

const CHEVRON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

function fmt(v: number | undefined): string {
  if (!v) return '';
  return formatMoney(v);
}

export function renderChequeVendorPivot(pivot: VendorPivot, opts: { title: string; subtitle: string; emptyLabel: string }): HTMLElement {
  const expanded = new Set<string>();
  const tbody = h('tbody', {});

  function toggle(proveedor: string): void {
    expanded.has(proveedor) ? expanded.delete(proveedor) : expanded.add(proveedor);
    renderBody();
  }

  function td(content: string, opts2: { bold?: boolean; align?: 'left' | 'right'; sticky?: boolean } = {}): HTMLElement {
    const align = opts2.align ?? 'right';
    return h(
      'td',
      {
        class: `text-sm px-3 py-2 whitespace-nowrap tabular-nums ${opts2.sticky ? 'sticky left-0' : ''}`,
        style: `text-align:${align};background:${opts2.sticky ? 'var(--surface)' : 'transparent'};${opts2.bold ? 'font-weight:600' : ''}`,
      },
      [content]
    );
  }

  function renderBody(): void {
    tbody.innerHTML = '';

    for (const row of pivot.rows) {
      const isOpen = expanded.has(row.proveedor);
      tbody.appendChild(
        h(
          'tr',
          { class: 'border-b cursor-pointer', style: 'border-color:var(--gridline);background:var(--page)', onclick: () => toggle(row.proveedor) },
          [
            td(row.proveedor, { align: 'left', bold: true, sticky: true }),
            ...pivot.dates.map((d) => td(fmt(row.totalsByDate[d]))),
            td(formatMoney(row.total), { bold: true }),
          ]
        )
      );

      // El ícono de despliegue se agrega directamente en la celda del proveedor.
      const firstRow = tbody.lastElementChild as HTMLElement;
      const nameCell = firstRow.firstElementChild as HTMLElement;
      nameCell.classList.add('flex', 'items-center', 'gap-2');
      const chev = h('span', {
        style: `display:inline-flex;transition:transform 150ms ease;transform:rotate(${isOpen ? 90 : 0}deg);color:var(--ink-muted)`,
        html: CHEVRON,
      });
      nameCell.prepend(chev);

      if (!isOpen) continue;

      for (const cheque of row.cheques) {
        tbody.appendChild(
          h('tr', { class: 'border-b', style: 'border-color:var(--gridline)' }, [
            td(`↳ Cheque #${cheque.numeroCheque}`, { align: 'left', sticky: true }),
            ...pivot.dates.map((d) => td(d === cheque.date ? formatMoney(cheque.amount) : '')),
            td(formatMoney(cheque.amount)),
          ])
        );
      }
    }

    tbody.appendChild(
      h('tr', { style: 'background:var(--page);border-top:2px solid var(--gridline)' }, [
        td('Total general', { align: 'left', bold: true, sticky: true }),
        ...pivot.dates.map((d) => td(fmt(pivot.totalsByDate[d]), { bold: true })),
        td(formatMoney(pivot.grandTotal), { bold: true }),
      ])
    );
  }

  renderBody();

  const headRow1 = h('tr', {}, [
    h('th', { class: 'sticky left-0 top-0 z-10 px-3 py-2', style: 'background:var(--surface)' }, []),
    ...pivot.columnGroups.map((g) =>
      h(
        'th',
        {
          colspan: g.span,
          class: 'sticky top-0 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 text-center whitespace-nowrap',
          style: 'background:#0f2942;color:#fff;border-left:1px solid rgba(255,255,255,0.15)',
        },
        [g.label]
      )
    ),
    h('th', { class: 'sticky top-0 px-3 py-1.5', style: 'background:var(--surface)' }, []),
  ]);

  const headRow2 = h('tr', {}, [
    h(
      'th',
      {
        class: 'sticky left-0 z-10 text-xs font-semibold uppercase tracking-wide px-3 py-2 text-left whitespace-nowrap',
        style: 'top:33px;background:var(--surface);color:var(--ink-muted);border-bottom:1px solid var(--gridline)',
      },
      ['Proveedor']
    ),
    ...pivot.dates.map((d) =>
      h(
        'th',
        {
          class: 'text-xs font-semibold px-3 py-2 text-right whitespace-nowrap',
          style: 'top:33px;position:sticky;background:var(--surface);color:var(--ink-muted);border-bottom:1px solid var(--gridline)',
        },
        [dayOfMonth(d)]
      )
    ),
    h(
      'th',
      {
        class: 'text-xs font-semibold uppercase tracking-wide px-3 py-2 text-right whitespace-nowrap',
        style: 'top:33px;position:sticky;background:#e7e6e2;color:var(--ink-secondary);border-bottom:1px solid var(--gridline)',
      },
      ['Total general']
    ),
  ]);

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, [opts.title]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [`${opts.subtitle} — clic en un proveedor para ver sus cheques`]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total general']),
        h('p', { class: 'font-semibold tabular-nums', style: 'font-size:16px' }, [formatMoney(pivot.grandTotal)]),
      ]),
    ]),
    pivot.rows.length === 0
      ? h('p', { class: 'text-sm p-8 text-center', style: 'color:var(--ink-muted)' }, [opts.emptyLabel])
      : h('div', { class: 'overflow-auto scrollbar-thin', style: 'max-height:640px' }, [
          h('table', { class: 'border-collapse' }, [h('thead', {}, [headRow1, headRow2]), tbody]),
        ]),
  ]);
}
