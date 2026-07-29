import type { Kpis } from '../types';
import { h } from './dom';
import { icon } from './icons';
import { STATUS } from './palette';

const RIESGO_META: Record<Kpis['riesgo'], { label: string; color: string; bg: string }> = {
  bajo: { label: 'RIESGO BAJO', color: STATUS.good, bg: '#2e7d3210' },
  medio: { label: 'RIESGO MEDIO', color: STATUS.warning, bg: '#f9a82514' },
  alto: { label: 'RIESGO ALTO', color: STATUS.critical, bg: '#c6282814' },
};

function recomendacion(riesgo: Kpis['riesgo'], negativeDays: number): string {
  if (riesgo === 'alto') {
    return negativeDays > 0
      ? 'Se recomienda diferir pagos no críticos o acelerar la gestión de cobranza para cubrir los días con saldo negativo.'
      : 'La cobertura de caja es insuficiente frente al ritmo de egresos. Revisar el calendario de pagos con Gerencia Financiera.';
  }
  if (riesgo === 'medio') {
    return 'La cobertura de caja está ajustada. Monitorear de cerca la cobranza y los cheques programados de la próxima semana.';
  }
  return 'La posición de caja proyectada cubre holgadamente los compromisos de pago del período.';
}

/** Tarjeta ejecutiva de riesgo — deliberadamente más grande que una tarjeta
 *  KPI estándar, para que sea el segundo elemento de mayor jerarquía visual
 *  del Dashboard después del gráfico principal. */
export function renderRiskCard(kpis: Kpis, negativeDays: number): HTMLElement {
  const meta = RIESGO_META[kpis.riesgo];

  return h(
    'div',
    {
      class: 'card flex items-center gap-5 px-6 py-5 animate-fade-in',
      style: `border-left:4px solid ${meta.color};background:linear-gradient(to right, ${meta.bg}, var(--surface) 22%)`,
    },
    [
      h(
        'span',
        {
          class: 'inline-flex items-center justify-center rounded-full flex-shrink-0',
          style: `width:52px;height:52px;background:${meta.color}1f;color:${meta.color}`,
        },
        [icon('alertTriangle', { size: 26, strokeWidth: 1.75 })]
      ),
      h('div', { class: 'flex-1 min-w-0' }, [
        h('p', { class: 'font-bold tracking-wide', style: `font-size:13px;color:${meta.color};letter-spacing:0.04em` }, [
          meta.label,
        ]),
        h('p', { class: 'font-semibold', style: 'font-size:19px;color:var(--ink-primary);margin-top:2px' }, [
          negativeDays > 0
            ? `${negativeDays} día${negativeDays === 1 ? '' : 's'} con saldo proyectado negativo`
            : 'Sin días con saldo proyectado negativo',
        ]),
        h('p', { class: 'text-sm', style: 'color:var(--ink-secondary);margin-top:4px;max-width:70ch' }, [
          recomendacion(kpis.riesgo, negativeDays),
        ]),
      ]),
      h('div', { class: 'hidden md:flex flex-col items-end flex-shrink-0 pl-4', style: 'border-left:1px solid var(--gridline)' }, [
        h('p', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Liquidez']),
        h('p', { class: 'font-bold tabular-nums', style: 'font-size:22px;color:var(--ink-primary)' }, [
          kpis.liquidezDias === null ? '—' : `${kpis.liquidezDias.toFixed(1)}d`,
        ]),
      ]),
    ]
  );
}
