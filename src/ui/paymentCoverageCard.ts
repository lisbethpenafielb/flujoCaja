import { h } from './dom';
import { icon } from './icons';
import { BRAND, STATUS } from './palette';

/** Cobertura de pagos: % de los egresos del período que la cobranza
 *  proyectada alcanza a cubrir (ver `coverageRatio` en src/data/derived.ts).
 *  Mismo patrón visual que una tarjeta KPI, para que se lea como parte del
 *  mismo sistema. */
export function renderPaymentCoverageCard(coveragePct: number | null): HTMLElement {
  const color = coveragePct === null ? BRAND.primary : coveragePct >= 100 ? STATUS.good : coveragePct >= 80 ? STATUS.warning : STATUS.critical;
  const label = coveragePct === null ? '—' : `${coveragePct.toFixed(0)}%`;
  const helper =
    coveragePct === null
      ? 'Sin egresos programados en el período.'
      : coveragePct >= 100
      ? 'La cobranza proyectada cubre los pagos del período.'
      : 'La cobranza proyectada no alcanza a cubrir los pagos del período.';

  return h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('span', { class: 'text-sm font-medium', style: 'color:var(--ink-secondary)' }, ['Cobertura de Pagos']),
      h(
        'span',
        {
          class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
          style: `width:38px;height:38px;background:${color}14;color:${color}`,
        },
        [icon('scale', { size: 19 })]
      ),
    ]),
    h('div', { class: 'tabular-nums font-semibold', style: `font-size:26px;letter-spacing:-0.02em;color:${color}` }, [label]),
    h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [helper]),
  ]);
}
