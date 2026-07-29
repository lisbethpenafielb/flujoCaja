import type { Kpis } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { STATUS } from './palette';

const ICONS: Record<string, string> = {
  bank: '<path d="M3 21h18M4 10h16M6 10V21M10 10V21M14 10V21M18 10V21M12 3 2 8h20L12 3Z"/>',
  inflow: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  outflowCheck: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h5"/>',
  outflowFixed: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  net: '<path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"/>',
  liquidity: '<path d="M12 2c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12Z"/>',
  risk: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
};

function icon(name: keyof typeof ICONS, color: string): HTMLElement {
  const span = h('span', {
    class: 'inline-flex items-center justify-center rounded-xl',
    style: `width:38px;height:38px;background:${color}1a;color:${color}`,
  });
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

function kpiCard(opts: {
  label: string;
  value: string;
  sub?: string;
  iconName: keyof typeof ICONS;
  color: string;
}): HTMLElement {
  return h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('span', { class: 'text-sm font-medium', style: 'color:var(--ink-secondary)' }, [opts.label]),
      icon(opts.iconName, opts.color),
    ]),
    h('div', { class: 'tabular-nums font-semibold', style: 'font-size:26px;letter-spacing:-0.02em' }, [
      opts.value,
    ]),
    opts.sub ? h('div', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [opts.sub]) : null,
  ]);
}

const RIESGO_LABEL: Record<Kpis['riesgo'], { label: string; color: string }> = {
  bajo: { label: 'Bajo', color: STATUS.good },
  medio: { label: 'Medio', color: STATUS.warning },
  alto: { label: 'Alto', color: STATUS.critical },
};

export function renderKpiCards(kpis: Kpis): HTMLElement {
  const riesgo = RIESGO_LABEL[kpis.riesgo];

  const cards = [
    kpiCard({
      label: 'Saldo Bancario',
      value: formatMoney(kpis.saldoBancario),
      sub: 'Consolidado, 6 bancos',
      iconName: 'bank',
      color: '#2a78d6',
    }),
    kpiCard({
      label: 'Cobranza Esperada',
      value: formatMoney(kpis.cobranzaEsperada),
      sub: 'Próximos 30 días',
      iconName: 'inflow',
      color: '#1baf7a',
    }),
    kpiCard({
      label: 'Cheques Programados',
      value: formatMoney(kpis.chequesProgramados),
      sub: 'Próximos 30 días',
      iconName: 'outflowCheck',
      color: '#eb6834',
    }),
    kpiCard({
      label: 'Pagos Fijos',
      value: formatMoney(kpis.pagosFijos),
      sub: 'Deuda IESS (ver aviso)',
      iconName: 'outflowFixed',
      color: '#4a3aa7',
    }),
    kpiCard({
      label: 'Saldo Neto Proyectado',
      value: formatMoney(kpis.saldoNetoProyectado),
      sub: 'Al día 30',
      iconName: 'net',
      color: kpis.saldoNetoProyectado < 0 ? STATUS.critical : '#2a78d6',
    }),
    kpiCard({
      label: 'Liquidez',
      value: kpis.liquidezDias === null ? '—' : `${kpis.liquidezDias.toFixed(1)} días`,
      sub: 'Cobertura de egresos con caja actual',
      iconName: 'liquidity',
      color: '#eda100',
    }),
  ];

  const riesgoCard = h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('span', { class: 'text-sm font-medium', style: 'color:var(--ink-secondary)' }, ['Semáforo de Riesgo']),
      icon('risk', riesgo.color),
    ]),
    h('div', { class: 'flex items-center gap-2' }, [
      h('span', {
        class: 'inline-block rounded-full',
        style: `width:14px;height:14px;background:${riesgo.color}`,
      }),
      h('span', { class: 'font-semibold', style: `font-size:26px;letter-spacing:-0.02em;color:${riesgo.color}` }, [
        riesgo.label,
      ]),
    ]),
    h('div', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
      kpis.riesgo === 'alto'
        ? 'Hay días con saldo proyectado negativo'
        : kpis.riesgo === 'medio'
        ? 'Cobertura de caja ajustada (< 7 días)'
        : 'Cobertura de caja saludable',
    ]),
  ]);

  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' }, [
    ...cards.slice(0, 3),
    riesgoCard,
    cards[3],
    cards[4],
    cards[5],
  ]);
}
