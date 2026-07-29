import type { Kpis } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { iconSvg, type IconName } from './icons';
import { BRAND, STATUS } from './palette';

export interface KpiTrend {
  /** % de variación frente al período de comparación (ya redondeado). */
  percent: number;
  /** Etiqueta de comparación, ej. "vs semana anterior". */
  caption: string;
  /** Si un aumento es una buena noticia (cobranza) o mala (egresos). */
  goodDirection: 'up' | 'down';
}

interface KpiCardOpts {
  label: string;
  value: string;
  iconName: IconName;
  accent: string;
  trend?: KpiTrend | null;
  caption?: string;
}

/** Variación porcentual entre dos montos ya calculados por el motor
 *  (no recalcula nada financiero, solo compara dos resultados existentes).
 *  Devuelve null cuando no hay base de comparación real (evita fabricar
 *  porcentajes engañosos con base cero). */
export function computeTrend(current: number, previous: number, caption: string, goodDirection: 'up' | 'down'): KpiTrend | null {
  if (!previous) return null;
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return { percent, caption, goodDirection };
}

function trendIcon(name: keyof typeof PATHS_UP_DOWN, size: number): string {
  return iconSvg(name, size);
}
const PATHS_UP_DOWN = { trendUp: 'trendUp', trendDown: 'trendDown' } as const;

function kpiIcon(name: IconName, color: string, size: number): HTMLElement {
  return h('span', {
    class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
    style: `width:${size}px;height:${size}px;background:${color}14;color:${color}`,
    html: iconSvg(name, Math.round(size * 0.5)),
  });
}

function kpiCard(opts: KpiCardOpts, compact: boolean): HTMLElement {
  const trendChip = opts.trend
    ? (() => {
        const isGood = (opts.trend!.percent >= 0 ? 'up' : 'down') === opts.trend!.goodDirection;
        const color = isGood ? STATUS.good : STATUS.critical;
        const dir = opts.trend!.percent >= 0 ? 'trendUp' : 'trendDown';
        return h('div', { class: 'flex items-center gap-1.5' }, [
          h('span', { style: `color:${color}`, html: trendIcon(dir as keyof typeof PATHS_UP_DOWN, compact ? 11 : 13) }),
          h('span', { class: 'font-semibold tabular-nums', style: `color:${color};font-size:${compact ? '11px' : '12.5px'}` }, [
            `${opts.trend!.percent > 0 ? '+' : ''}${opts.trend!.percent}%`,
          ]),
          h('span', { style: `color:var(--ink-muted);font-size:${compact ? '11px' : '12.5px'}` }, [opts.trend!.caption]),
        ]);
      })()
    : opts.caption
    ? h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [opts.caption])
    : null;

  if (compact) {
    return h('div', { class: 'card card-hover px-3.5 py-3 flex items-center gap-3 animate-fade-in' }, [
      kpiIcon(opts.iconName, opts.accent, 30),
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'text-[11px] font-medium truncate', style: 'color:var(--ink-secondary)' }, [opts.label]),
        h('p', { class: 'tabular-nums font-semibold truncate', style: 'font-size:15px;letter-spacing:-0.01em' }, [opts.value]),
      ]),
    ]);
  }

  return h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('span', { class: 'text-sm font-medium', style: 'color:var(--ink-secondary)' }, [opts.label]),
      kpiIcon(opts.iconName, opts.accent, 38),
    ]),
    h('div', { class: 'tabular-nums font-semibold', style: 'font-size:26px;letter-spacing:-0.02em;color:var(--ink-primary)' }, [
      opts.value,
    ]),
    trendChip,
  ]);
}

export interface KpiExtras {
  /** Comparación del período actual contra el período previo de igual
   *  longitud (calculada llamando otra vez a buildDailyProjection sin tocar
   *  su lógica — ver main.ts). Ausente cuando no aplica (ej. Saldo Bancario
   *  es un valor manual sin serie histórica; no se fabrica un porcentaje). */
  cobranzaTrend?: KpiTrend | null;
  chequesPendientes?: number;
}

export function renderKpiCards(kpis: Kpis, opts: { compact?: boolean; extras?: KpiExtras } = {}): HTMLElement {
  const compact = opts.compact ?? false;
  const extras = opts.extras ?? {};

  const cards: KpiCardOpts[] = [
    {
      label: 'Saldo Bancario',
      value: formatMoney(kpis.saldoBancario),
      iconName: 'bank',
      accent: BRAND.primary,
      caption: 'Consolidado, 6 bancos',
    },
    {
      label: 'Cobranza Esperada',
      value: formatMoney(kpis.cobranzaEsperada),
      iconName: 'inflow',
      accent: STATUS.good,
      trend: extras.cobranzaTrend,
      caption: extras.cobranzaTrend ? undefined : 'Próximos días',
    },
    {
      label: 'Cheques Programados',
      value: formatMoney(kpis.chequesProgramados),
      iconName: 'outflowCheck',
      accent: '#0F4C81',
      caption: extras.chequesPendientes !== undefined ? `${extras.chequesPendientes} pendientes` : 'Próximos días',
    },
    {
      label: 'Pagos Fijos',
      value: formatMoney(kpis.pagosFijos),
      iconName: 'scale',
      accent: STATUS.warning,
      caption: 'Deuda IESS (ver aviso)',
    },
    {
      label: 'Saldo Neto Proyectado',
      value: formatMoney(kpis.saldoNetoProyectado),
      iconName: 'trendUp',
      accent: kpis.saldoNetoProyectado < 0 ? STATUS.critical : STATUS.good,
      caption: kpis.saldoNetoProyectado < 0 ? 'Déficit proyectado' : 'Superávit proyectado',
    },
    {
      label: 'Liquidez',
      value: kpis.liquidezDias === null ? '—' : `${kpis.liquidezDias.toFixed(1)} días`,
      iconName: 'droplet',
      accent: BRAND.primary,
      caption: 'Cobertura estimada',
    },
  ];

  return h(
    'div',
    {
      class: compact
        ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4',
    },
    cards.map((c) => kpiCard(c, compact))
  );
}
