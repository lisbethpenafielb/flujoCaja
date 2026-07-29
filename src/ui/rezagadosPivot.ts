import type { FlatChequePivot } from '../types';
import { dayOfMonth } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { BRAND } from './palette';

const PROVEEDOR_WIDTH = 260;
const NUMERO_WIDTH = 90;

function fmt(v: number | undefined): string {
  if (!v) return '';
  return formatMoney(v);
}

function td(
  content: string,
  opts: { bold?: boolean; align?: 'left' | 'right'; stickyLeft?: number; width?: number; truncate?: boolean } = {}
): HTMLElement {
  const align = opts.align ?? 'right';
  const sticky = opts.stickyLeft !== undefined;
  return h(
    'td',
    {
      class: `text-sm px-3 py-2 whitespace-nowrap tabular-nums ${sticky ? 'sticky z-[1]' : ''}`,
      style: `text-align:${align};background:${sticky ? 'var(--surface)' : 'transparent'};${opts.bold ? 'font-weight:600' : ''}${
        sticky ? `;left:${opts.stickyLeft}px` : ''
      }${opts.width !== undefined ? `;width:${opts.width}px;max-width:${opts.width}px` : ''}${
        opts.truncate ? ';overflow:hidden;text-overflow:ellipsis' : ''
      }`,
      title: opts.truncate ? content : undefined,
    },
    [content]
  );
}

/** Tabla dinámica plana Proveedor + N° Cheque × Fecha para Cheques Rezagados
 *  — cada cheque es su propia fila, sin agrupar/colapsar por proveedor,
 *  igual a la tabla dinámica de Excel de la que parte esta pestaña. */
export function renderRezagadosPivot(pivot: FlatChequePivot, opts: { subtitle: string; emptyLabel: string }): HTMLElement {
  const tbody = h(
    'tbody',
    {},
    pivot.rows
      .map((row) => [
        td(row.proveedor, { align: 'left', stickyLeft: 0, width: PROVEEDOR_WIDTH, truncate: true }),
        td(row.numeroCheque, { align: 'left', stickyLeft: PROVEEDOR_WIDTH, width: NUMERO_WIDTH }),
        ...pivot.dates.map((d) => td(d === row.date ? formatMoney(row.amount) : '')),
        td(formatMoney(row.amount), { bold: true }),
      ])
      .map((cells) => h('tr', { class: 'border-b', style: 'border-color:var(--gridline)' }, cells))
      .concat([
        h('tr', { style: 'background:var(--page);border-top:2px solid var(--gridline)' }, [
          td('Total general', { align: 'left', bold: true, stickyLeft: 0, width: PROVEEDOR_WIDTH }),
          td('', { stickyLeft: PROVEEDOR_WIDTH, width: NUMERO_WIDTH }),
          ...pivot.dates.map((d) => td(fmt(pivot.totalsByDate[d]), { bold: true })),
          td(formatMoney(pivot.grandTotal), { bold: true }),
        ]),
      ])
  );

  const headRow1 = h('tr', {}, [
    h('th', {
      class: 'sticky left-0 top-0 z-10 px-3 py-2',
      style: `background:var(--surface);width:${PROVEEDOR_WIDTH}px`,
    }, []),
    h('th', {
      class: 'sticky top-0 z-10 px-3 py-2',
      style: `background:var(--surface);left:${PROVEEDOR_WIDTH}px;width:${NUMERO_WIDTH}px`,
    }, []),
    ...pivot.columnGroups.map((g) =>
      h(
        'th',
        {
          colspan: g.span,
          class: 'sticky top-0 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 text-center whitespace-nowrap',
          style: `background:${BRAND.primaryDark};color:#fff;border-left:1px solid rgba(255,255,255,0.15)`,
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
        style: `top:33px;background:var(--surface);color:var(--ink-muted);border-bottom:1px solid var(--gridline);width:${PROVEEDOR_WIDTH}px`,
      },
      ['Proveedor']
    ),
    h(
      'th',
      {
        class: 'sticky z-10 text-xs font-semibold uppercase tracking-wide px-3 py-2 text-left whitespace-nowrap',
        style: `top:33px;left:${PROVEEDOR_WIDTH}px;background:var(--surface);color:var(--ink-muted);border-bottom:1px solid var(--gridline);width:${NUMERO_WIDTH}px`,
      },
      ['N° Cheque']
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
        style: 'top:33px;position:sticky;background:#e9edf2;color:var(--ink-secondary);border-bottom:1px solid var(--gridline)',
      },
      ['Total general']
    ),
  ]);

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, ['Cheques Rezagados']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [opts.subtitle]),
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
