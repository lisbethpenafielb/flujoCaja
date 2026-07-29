import type { TreasuryMatrix, TreasuryRow } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { STATUS } from './palette';

function fmt(v: number | null): string {
  if (v === null) return '—';
  if (v === 0) return '-';
  return formatMoney(v);
}

function rowStyle(kind: TreasuryRow['kind']): { label: string; value: string; bg?: string } {
  switch (kind) {
    case 'banco':
      return { label: 'color:var(--ink-primary)', value: 'color:var(--ink-primary)' };
    case 'ingreso':
      return { label: 'color:#0d6b2f;font-weight:600', value: 'color:#0d6b2f' };
    case 'egreso':
      return { label: 'color:#a3271f;font-weight:600', value: 'color:#a3271f' };
    case 'saldoFinal':
      return { label: 'color:var(--ink-primary);font-weight:700', value: 'color:var(--ink-primary);font-weight:700', bg: 'rgba(42,120,214,0.06)' };
    case 'saldoInicial':
      return { label: 'color:var(--ink-secondary);font-weight:600', value: 'color:var(--ink-secondary);font-weight:600', bg: 'rgba(11,11,11,0.02)' };
    case 'flujoDisponible':
      return { label: 'color:var(--ink-primary);font-weight:700', value: 'color:var(--ink-primary);font-weight:700', bg: 'rgba(250,178,25,0.10)' };
  }
}

export function renderTreasuryMatrix(matrix: TreasuryMatrix, title: string, subtitle: string): HTMLElement {
  const { periods, totalRezagadosBancos, rows } = matrix;

  const headCell = (text: string, opts: { bg?: string; color?: string; align?: 'left' | 'right' } = {}) =>
    h(
      'th',
      {
        class: 'text-xs font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap',
        style: `background:${opts.bg ?? 'var(--surface)'};color:${opts.color ?? 'var(--ink-muted)'};text-align:${opts.align ?? 'right'};border-bottom:1px solid var(--gridline)`,
      },
      [text]
    );

  const headerRow = h('tr', {}, [
    headCell('Detalle', { align: 'left', bg: 'var(--page)', color: 'var(--ink-secondary)' }),
    headCell('Rezagados', { bg: '#fdf0c8', color: '#7a5b00' }),
    ...periods.map((p) => headCell(p.label, { bg: '#f3e3f0', color: '#7a2e63' })),
    headCell('Total', { bg: '#e7e6e2', color: 'var(--ink-secondary)' }),
  ]);

  const bodyRows = rows.map((row) => {
    const style = rowStyle(row.kind);
    const cells = [
      h(
        'td',
        {
          class: 'text-sm px-3 py-2 whitespace-nowrap sticky left-0',
          style: `${style.label};background:${style.bg ?? 'var(--surface)'}`,
        },
        [row.label]
      ),
      h('td', { class: 'tabular-nums text-sm px-3 py-2 text-right', style: `${style.value};background:${style.bg ?? 'transparent'}` }, [
        fmt(row.rezagados),
      ]),
      ...row.values.map((v) =>
        h('td', { class: 'tabular-nums text-sm px-3 py-2 text-right', style: `${style.value};background:${style.bg ?? 'transparent'}` }, [
          fmt(v),
        ])
      ),
      h(
        'td',
        {
          class: 'tabular-nums text-sm px-3 py-2 text-right font-semibold',
          style: `${style.value};background:${row.kind === 'flujoDisponible' ? 'rgba(250,178,25,0.22)' : style.bg ?? 'transparent'}`,
        },
        [fmt(row.total)]
      ),
    ];
    return h('tr', { class: 'border-b last:border-0', style: 'border-color:var(--gridline)' }, cells);
  });

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, [title]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [subtitle]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total bancos (rezagados)']),
        h('p', { class: 'font-semibold tabular-nums', style: `font-size:18px;color:${totalRezagadosBancos < 0 ? STATUS.critical : 'var(--ink-primary)'}` }, [
          formatMoney(totalRezagadosBancos),
        ]),
      ]),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin' }, [
      h('table', { class: 'border-collapse w-full' }, [h('thead', {}, [headerRow]), h('tbody', {}, bodyRows)]),
    ]),
  ]);
}
