import type { TreasuryMatrix, TreasuryRow } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { STATUS } from './palette';

const DETAIL_W = 224;
const REZAGADOS_W = 116;

// Sombra que marca el borde de las columnas "congeladas" (Detalle/Rezagados a la
// izquierda, Total a la derecha). Sin esto, al hacer scroll horizontal el texto de
// la columna de datos que queda debajo se corta a mitad de carácter sin ninguna
// pista visual de que es una columna fija superpuesta — parece un glitch de layout
// en vez de un panel congelado intencional (como el de Excel).
const FROZEN_EDGE_RIGHT = 'box-shadow:4px 0 6px -4px rgba(15,23,42,0.25)';
const FROZEN_EDGE_LEFT = 'box-shadow:-4px 0 6px -4px rgba(15,23,42,0.25)';

function fmt(v: number | null): string {
  if (v === null) return '—';
  if (v === 0) return '-';
  return formatMoney(v);
}

// `bg` (puede llevar transparencia) se usa en las columnas que se desplazan;
// `bgSolid` es su equivalente 100% opaco y es obligatorio en las 3 columnas
// congeladas (Detalle/Rezagados/Total) — un fondo semitransparente ahí deja
// "sangrar" el texto de las columnas que pasan por debajo al hacer scroll.
function rowStyle(kind: TreasuryRow['kind']): { label: string; value: string; bg?: string; bgSolid: string } {
  switch (kind) {
    case 'banco':
      return { label: 'color:var(--ink-primary)', value: 'color:var(--ink-primary)', bgSolid: 'var(--surface)' };
    case 'ingreso':
      return { label: 'color:#1d6b30;font-weight:600', value: 'color:#1d6b30', bgSolid: 'var(--surface)' };
    case 'egreso':
      return { label: 'color:#a3271f;font-weight:600', value: 'color:#a3271f', bgSolid: 'var(--surface)' };
    case 'saldoFinal':
      return {
        label: 'color:var(--ink-primary);font-weight:700',
        value: 'color:var(--ink-primary);font-weight:700',
        bg: '#0f4c810c',
        bgSolid: '#eaf1f7',
      };
    case 'saldoInicial':
      return {
        label: 'color:var(--ink-secondary);font-weight:600',
        value: 'color:var(--ink-secondary);font-weight:600',
        bg: '#1f293705',
        bgSolid: '#f7f8f9',
      };
    case 'flujoDisponible':
      return {
        label: 'color:var(--ink-primary);font-weight:700',
        value: 'color:var(--ink-primary);font-weight:700',
        bg: '#f9a82518',
        bgSolid: '#fdf2df',
      };
  }
}

export interface TreasuryMatrixOptions {
  /** Cuando se pasa, las filas marcadas `manual` (Préstamo Perú / Préstamos
   *  Terceros) muestran un input editable en cada columna de un solo día en
   *  vez de texto — esa información no viene de ningún Excel. */
  onManualEdit?: (category: string, date: string, value: number | null) => void;
  /** Cuando se pasa, la celda "Rezagados" de las filas `kind: 'banco'` se
   *  vuelve un input editable — reemplaza a la extinta pestaña Bancos. */
  onBankBalanceEdit?: (accountId: string, value: number | null) => void;
  /** false cuando Tesorería todavía no digitó ningún saldo bancario esta sesión:
   *  el total en 0 no es un saldo real, es la ausencia del dato. */
  bankBalanceKnown?: boolean;
}

export function renderTreasuryMatrix(matrix: TreasuryMatrix, title: string, subtitle: string, opts: TreasuryMatrixOptions = {}): HTMLElement {
  const { periods, totalRezagadosBancos, rows } = matrix;

  const headCell = (
    text: string,
    cellOpts: { bg?: string; color?: string; align?: 'left' | 'right'; sticky?: 'left' | 'left2' | 'right' } = {}
  ) => {
    const stickyStyle =
      cellOpts.sticky === 'left'
        ? `position:sticky;left:0;z-index:20;width:${DETAIL_W}px;min-width:${DETAIL_W}px`
        : cellOpts.sticky === 'left2'
        ? `position:sticky;left:${DETAIL_W}px;z-index:20;width:${REZAGADOS_W}px;min-width:${REZAGADOS_W}px;${FROZEN_EDGE_RIGHT}`
        : cellOpts.sticky === 'right'
        ? `position:sticky;right:0;z-index:20;${FROZEN_EDGE_LEFT}`
        : '';
    return h(
      'th',
      {
        class: `text-[11px] font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap${cellOpts.sticky ? ' tm-sticky-col' : ''}`,
        style: `background:${cellOpts.bg ?? 'var(--surface)'};color:${cellOpts.color ?? 'var(--ink-muted)'};text-align:${cellOpts.align ?? 'right'};border-bottom:1px solid var(--gridline);position:sticky;top:0;z-index:10;${stickyStyle}`,
      },
      [text]
    );
  };

  const headerRow = h('tr', {}, [
    headCell('Detalle', { align: 'left', bg: 'var(--page)', color: 'var(--ink-secondary)', sticky: 'left' }),
    headCell('Rezagados', { bg: '#fbedd1', color: '#946200', sticky: 'left2' }),
    ...periods.map((p) => headCell(p.label, { bg: '#eaf1f8', color: '#0F4C81' })),
    headCell('Total', { bg: '#e9edf2', color: 'var(--ink-secondary)', sticky: 'right' }),
  ]);

  function manualInput(category: string, date: string, value: number | null): HTMLElement {
    return h('input', {
      type: 'number',
      step: '0.01',
      placeholder: '0.00',
      value: value ? String(value) : '',
      class: 'tabular-nums text-sm text-right w-full rounded px-1.5 py-1 outline-none',
      style: 'border:1px solid var(--gridline);background:var(--surface);color:#a3271f;max-width:110px',
      // onchange (no oninput): cada edición re-renderiza toda la app (ver dom.ts:mount,
      // que hace innerHTML='' y reconstruye), así que reaccionar a cada tecla destruye
      // el input a mitad de la escritura y el usuario pierde el foco. onchange dispara
      // una sola vez, al salir del campo (blur) o con Enter, cuando ya no importa.
      onchange: (e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        const num = raw === '' ? null : Number(raw);
        opts.onManualEdit?.(category, date, num !== null && isFinite(num) ? num : null);
      },
    });
  }

  function bankBalanceInput(accountId: string, value: number | null): HTMLElement {
    return h('input', {
      type: 'number',
      step: '0.01',
      placeholder: '0.00',
      value: value === null ? '' : String(value),
      class: 'tabular-nums text-sm text-right w-full rounded px-1.5 py-1 outline-none',
      style: 'border:1px solid var(--gridline);background:var(--surface);color:var(--ink-primary);max-width:110px',
      // onchange, no oninput — mismo motivo que manualInput() arriba.
      onchange: (e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        const num = raw === '' ? null : Number(raw);
        opts.onBankBalanceEdit?.(accountId, num !== null && isFinite(num) ? num : null);
      },
    });
  }

  const bodyRows = rows.map((row) => {
    const style = rowStyle(row.kind);
    const editable = Boolean(row.manual && row.manualCategory && opts.onManualEdit);
    const bankEditable = Boolean(row.kind === 'banco' && row.bankAccountId && opts.onBankBalanceEdit);
    const bg = style.bg ?? 'var(--surface)';

    const valueCells = row.values.map((v, i) => {
      const period = periods[i];
      if (editable && period.start === period.end) {
        // Las filas de egreso guardan el valor en negativo para el cálculo;
        // el input siempre debe mostrar/aceptar el monto en positivo, igual
        // que Saldos Bancarios — el signo es un detalle interno de la matriz.
        return h('td', { class: 'px-1.5 py-1', style: `background:${bg}` }, [
          manualInput(row.manualCategory!, period.start, v === null ? null : Math.abs(v)),
        ]);
      }
      return h('td', { class: 'tabular-nums text-sm px-3 py-2.5 text-right', style: `${style.value};background:${bg}` }, [fmt(v)]);
    });

    const cells = [
      h(
        'td',
        {
          class: 'text-sm px-3 py-2.5 whitespace-nowrap tm-sticky-col',
          style: `${style.label};background:${style.bgSolid};position:sticky;left:0;z-index:5;width:${DETAIL_W}px;min-width:${DETAIL_W}px`,
        },
        [row.label]
      ),
      h(
        'td',
        {
          class: `tm-sticky-col ${bankEditable ? 'px-1.5 py-1' : 'tabular-nums text-sm px-3 py-2.5 text-right'}`,
          style: `${style.value};background:${style.bgSolid};position:sticky;left:${DETAIL_W}px;z-index:5;width:${REZAGADOS_W}px;min-width:${REZAGADOS_W}px;${FROZEN_EDGE_RIGHT}`,
        },
        [bankEditable ? bankBalanceInput(row.bankAccountId!, row.rezagados) : fmt(row.rezagados)]
      ),
      ...valueCells,
      h(
        'td',
        {
          class: 'tabular-nums text-sm px-3 py-2.5 text-right font-semibold tm-sticky-col',
          style: `${style.value};background:${row.kind === 'flujoDisponible' ? '#fbe8c6' : style.bgSolid};position:sticky;right:0;z-index:5;${FROZEN_EDGE_LEFT}`,
        },
        [fmt(row.total)]
      ),
    ];
    return h('tr', { class: 'tm-row border-b last:border-0', style: 'border-color:var(--gridline)' }, cells);
  });

  const hasManualRows = rows.some((r) => r.manual);
  const hints = [
    opts.onManualEdit && hasManualRows ? 'Préstamo Perú y Préstamos Terceros se digitan a mano' : null,
    opts.onBankBalanceEdit ? 'saldo de cada banco editable en su fila' : null,
  ].filter((h): h is string => h !== null);

  return h('div', { class: 'card overflow-hidden flex flex-col' }, [
    h('div', { class: 'px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b', style: 'border-color:var(--gridline)' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, [title]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
          hints.length ? `${subtitle} · ${hints.join(' · ')}` : subtitle,
        ]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total bancos (rezagados)']),
        h(
          'p',
          {
            class: 'font-semibold tabular-nums',
            style: `font-size:${opts.bankBalanceKnown === false ? '13px' : '18px'};color:${
              opts.bankBalanceKnown === false ? 'var(--ink-muted)' : totalRezagadosBancos < 0 ? STATUS.critical : 'var(--ink-primary)'
            }`,
          },
          [opts.bankBalanceKnown === false ? 'Información no disponible' : formatMoney(totalRezagadosBancos)]
        ),
      ]),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin', style: 'max-height:600px' }, [
      h('table', { class: 'border-collapse w-full' }, [h('thead', {}, [headerRow]), h('tbody', {}, bodyRows)]),
    ]),
  ]);
}
