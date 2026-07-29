import type { DailyBucket, WeeklyBucket } from '../types';
import { formatDateShortEs } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { STATUS } from './palette';

const STATUS_STYLE: Record<DailyBucket['status'], { bg: string; text: string; label: string }> = {
  negativo: { bg: 'rgba(208,59,59,0.08)', text: STATUS.critical, label: 'Negativo' },
  bajo: { bg: 'rgba(250,178,25,0.10)', text: '#8a6200', label: 'Bajo' },
  suficiente: { bg: 'transparent', text: STATUS.good, label: 'Suficiente' },
};

function th(label: string, align: 'left' | 'right' = 'right'): HTMLElement {
  return h(
    'th',
    {
      class: 'sticky top-0 bg-[var(--surface)] text-xs font-semibold uppercase tracking-wide py-2.5 px-3 border-b',
      style: `color:var(--ink-muted);border-color:var(--gridline);text-align:${align}`,
    },
    [label]
  );
}

function td(content: string, opts: { align?: 'left' | 'right'; extraClass?: string; color?: string } = {}): HTMLElement {
  const align = opts.align ?? 'right';
  return h(
    'td',
    {
      class: `tabular-nums text-sm py-2 px-3 ${opts.extraClass ?? ''}`,
      style: `text-align:${align}${opts.color ? `;color:${opts.color}` : ''}`,
    },
    [content]
  );
}

export function renderDailyTable(daily: DailyBucket[]): HTMLElement {
  const rows = daily.map((d) => {
    const style = STATUS_STYLE[d.status];
    return h('tr', { style: `background:${style.bg}`, class: 'border-b last:border-0' }, [
      td(formatDateShortEs(d.date), { align: 'left', extraClass: 'font-medium' }),
      td(formatMoney(d.openingBalance)),
      td(formatMoney(d.cobranza), { color: d.cobranza ? '#1baf7a' : 'var(--ink-muted)' }),
      td(formatMoney(d.cheques), { color: d.cheques ? '#eb6834' : 'var(--ink-muted)' }),
      td(formatMoney(d.pagosFijos), { color: d.pagosFijos ? '#4a3aa7' : 'var(--ink-muted)' }),
      td(formatMoney(d.closingBalance), { extraClass: 'font-semibold', color: style.text }),
      h('td', { class: 'py-2 px-3', style: 'text-align:right' }, [
        h(
          'span',
          {
            class: 'pill',
            style: `background:${d.status === 'suficiente' ? 'rgba(12,163,12,0.10)' : style.bg};color:${style.text}`,
          },
          [style.label]
        ),
      ]),
    ]);
  });

  return h('div', { class: 'card overflow-hidden' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px' }, ['Flujo de Caja Diario']),
      h('span', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [`${daily.length} días`]),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin', style: 'max-height:520px' }, [
      h('table', { class: 'w-full border-collapse' }, [
        h('thead', {}, [
          h('tr', {}, [
            th('Fecha', 'left'),
            th('Saldo Inicial'),
            th('Cobranza Esperada'),
            th('Cheques'),
            th('Pagos Fijos'),
            th('Saldo Final'),
            th('Estado'),
          ]),
        ]),
        h('tbody', {}, rows),
      ]),
    ]),
  ]);
}

export function renderWeeklyTable(weekly: WeeklyBucket[]): HTMLElement {
  const rows = weekly.map((w) =>
    h('tr', { class: 'border-b last:border-0' }, [
      td(w.label, { align: 'left', extraClass: 'font-medium' }),
      td(formatMoney(w.openingBalance)),
      td(formatMoney(w.cobranza)),
      td(formatMoney(w.cheques)),
      td(formatMoney(w.pagosFijos)),
      td(formatMoney(w.compromisosTotal), { extraClass: 'font-semibold' }),
      td(formatMoney(w.closingBalance), {
        extraClass: 'font-semibold',
        color: w.closingBalance < 0 ? STATUS.critical : 'var(--ink-primary)',
      }),
    ])
  );

  return h('div', { class: 'card overflow-hidden' }, [
    h('div', { class: 'px-5 py-4 flex items-center justify-between border-b', style: 'border-color:var(--gridline)' }, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px' }, ['Flujo de Caja Semanal']),
      h('span', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Compromisos totales por semana']),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin' }, [
      h('table', { class: 'w-full border-collapse' }, [
        h('thead', {}, [
          h('tr', {}, [
            th('Semana', 'left'),
            th('Saldo Inicial'),
            th('Cobranza'),
            th('Cheques'),
            th('Pagos Fijos'),
            th('Compromisos Totales'),
            th('Saldo Final'),
          ]),
        ]),
        h('tbody', {}, rows),
      ]),
    ]),
  ]);
}
