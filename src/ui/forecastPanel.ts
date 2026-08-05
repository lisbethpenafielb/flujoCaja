import type { FirstDeficitForecast, HorizonForecast } from '../data/forecast';
import { formatDateEs } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { icon } from './icons';
import { BRAND, STATUS } from './palette';

const HORIZON_LABELS: Record<number, string> = {
  0: 'Hoy',
  7: '7 días',
  15: '15 días',
  30: '30 días',
  60: '60 días',
  90: '90 días',
};

function fmtLiquidez(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(1)}d`;
}

function deficitStrip(deficit: FirstDeficitForecast | null): HTMLElement {
  if (!deficit) {
    return h(
      'div',
      {
        class: 'px-5 py-3 flex items-center gap-2 text-sm',
        style: `background:${STATUS.good}0a;color:${STATUS.good};border-top:1px solid var(--gridline)`,
      },
      [icon('checkCircle', { size: 15 }), 'No se proyecta déficit dentro de los próximos 90 días.']
    );
  }
  return h(
    'div',
    {
      class: 'px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm',
      style: `background:${STATUS.critical}0a;border-top:1px solid var(--gridline)`,
    },
    [
      h('span', { class: 'font-semibold flex items-center gap-1.5', style: `color:${STATUS.critical}` }, [
        icon('alertTriangle', { size: 14 }),
        'Primer déficit proyectado:',
      ]),
      h('span', { style: 'color:var(--ink-secondary)' }, [`Fecha ${formatDateEs(deficit.date)}`]),
      h('span', { style: 'color:var(--ink-secondary)' }, [`Monto ${formatMoney(deficit.amount)}`]),
      h('span', { style: 'color:var(--ink-secondary)' }, [`Faltan ${deficit.daysUntil} día(s)`]),
    ]
  );
}

/** Pronósticos de liquidez, saldo, cobranza y pagos a 0/7/15/30/60/90 días —
 *  siempre calculados desde hoy, independiente del filtro de fechas de
 *  Flujo Diario (una vista estructural, no filtrable). */
export function renderForecastPanel(forecasts: HorizonForecast[], deficit: FirstDeficitForecast | null): HTMLElement {
  const rows: { label: string; get: (f: HorizonForecast) => string }[] = [
    { label: 'Saldo esperado', get: (f) => formatMoney(f.saldoEsperado) },
    { label: 'Cobranza esperada', get: (f) => (f.horizon === 0 ? '—' : formatMoney(f.cobranzaEsperada)) },
    { label: 'Pagos proyectados', get: (f) => (f.horizon === 0 ? '—' : formatMoney(f.pagosProyectados)) },
    { label: 'Liquidez proyectada', get: (f) => (f.horizon === 0 ? '—' : fmtLiquidez(f.liquidezDias)) },
  ];

  const headRow = h('tr', {}, [
    h(
      'th',
      { class: 'text-xs font-semibold uppercase tracking-wide px-3 py-2.5 text-left whitespace-nowrap', style: `background:${BRAND.primaryDark};color:#fff` },
      ['Indicador']
    ),
    ...forecasts.map((f) =>
      h(
        'th',
        { class: 'text-xs font-semibold px-3 py-2.5 text-right whitespace-nowrap', style: `background:${BRAND.primaryDark};color:#fff` },
        [HORIZON_LABELS[f.horizon] ?? `${f.horizon} días`]
      )
    ),
  ]);

  const bodyRows = rows.map((r) =>
    h('tr', { class: 'tm-row border-b last:border-0', style: 'border-color:var(--gridline)' }, [
      h('td', { class: 'text-sm px-3 py-2.5 font-medium whitespace-nowrap', style: 'color:var(--ink-secondary);background:var(--page)' }, [
        r.label,
      ]),
      ...forecasts.map((f) =>
        h('td', { class: 'tabular-nums text-sm px-3 py-2.5 text-right' }, [r.get(f)])
      ),
    ])
  );

  return h('div', { class: 'card overflow-hidden flex flex-col animate-fade-in' }, [
    h('div', { class: 'px-5 py-4 border-b', style: 'border-color:var(--gridline)' }, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Pronósticos']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
        'Liquidez, saldo, cobranza y pagos proyectados — siempre desde hoy, a distintos horizontes',
      ]),
    ]),
    h('div', { class: 'overflow-auto scrollbar-thin' }, [
      h('table', { class: 'border-collapse w-full' }, [h('thead', {}, [headRow]), h('tbody', {}, bodyRows)]),
    ]),
    deficitStrip(deficit),
  ]);
}
