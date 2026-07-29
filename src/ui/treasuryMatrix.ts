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

export interface TreasuryMatrixOptions {
  /** Cuando se pasa, las filas marcadas `manual` (Préstamo Perú / Préstamos
   *  Terceros) muestran un input editable en cada columna de un solo día en
   *  vez de texto — esa información no viene de ningún Excel. */
  onManualEdit?: (category: string, date: string, value: number | null) => void;
}

export function renderTreasuryMatrix(matrix: TreasuryMatrix, title: string, subtitle: string, opts: TreasuryMatrixOptions = {}): HTMLElement {
  const { periods, totalRezagadosBancos, rows } = matrix;

  const headCell = (text: string, cellOpts: { bg?: string; color?: string; align?: 'left' | 'right' } = {}) =>
    h(
      'th',
      {
        class: 'text-xs font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap',
        style: `background:${cellOpts.bg ?? 'var(--surface)'};color:${cellOpts.color ?? 'var(--ink-muted)'};text-align:${cellOpts.align ?? 'right'};border-bottom:1px solid var(--gridline)`,
      },
      [text]
    );

  const headerRow = h('tr', {}, [
    headCell('Detalle', { align: 'left', bg: 'var(--page)', color: 'var(--ink-secondary)' }),
    headCell('Rezagados', { bg: '#fdf0c8', color: '#7a5b00' }),
    ...periods.map((p) => headCell(p.label, { bg: '#f3e3f0', color: '#7a2e63' })),
    headCell('Total', { bg: '#e7e6e2', color: 'var(--ink-secondary)' }),
  ]);

  function manualInput(category: string, date: string, value: number | null): HTMLElement {
    return h('input', {
      type: 'number',
      step: '0.01',
      placeholder: '0.00',
      value: value ? String(value) : '',
      class: 'tabular-nums text-sm text-right w-full rounded px-1.5 py-0.5 outline-none',
      style: 'border:1px solid var(--gridline);background:var(--surface);color:#a3271f;max-width:110px',
      oninput: (e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        const num = raw === '' ? null : Number(raw);
        opts.onManualEdit?.(category, date, num !== null && isFinite(num) ? num : null);
      },
    });
  }

  const bodyRows = rows.map((row) => {
    const style = rowStyle(row.kind);
    const editable = Boolean(row.manual && row.manualCategory && opts.onManualEdit);

    const valueCells = row.values.map((v, i) => {
      const period = periods[i];
      if (editable && period.start === period.end) {
        // Las filas de egreso guardan el valor en negativo para el cálculo;
        // el input siempre debe mostrar/aceptar el monto en positivo, igual
        // que Saldos Bancarios — el signo es un detalle interno de la matriz.
        return h('td', { class: 'px-1.5 py-1', style: `background:${style.bg ?? 'transparent'}` }, [
          manualInput(row.manualCategory!, period.start, v === null ? null : Math.abs(v)),
        ]);
      }
      return h(
        'td',
        { class: 'tabular-nums text-sm px-3 py-2 text-right', style: `${style.value};background:${style.bg ?? 'transparent'}` },
        [fmt(v)]
      );
    });

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
      ...valueCells,
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

  const hasManualRows = rows.some((r) => r.manual);

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px' }, [title]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
          opts.onManualEdit && hasManualRows ? `${subtitle} · Préstamo Perú y Préstamos Terceros se digitan a mano` : subtitle,
        ]),
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
