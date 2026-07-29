import type { AlertLevel, CashAlert } from '../types';
import { h } from './dom';
import { icon, type IconName } from './icons';
import { BRAND, STATUS } from './palette';

// La app solo genera 3 niveles de severidad (crítico/advertencia/info — ver
// buildAlerts en engine.ts, que no se modifica). Se presentan bajo el
// esquema ejecutivo de 4 prioridades pedido; "Media" queda disponible en el
// esquema visual pero hoy nunca se puebla, porque no existe una regla de
// negocio real que separe "alta" de "media" sin inventar un umbral nuevo.
type Priority = 'critica' | 'alta' | 'media' | 'informativa';

const LEVEL_TO_PRIORITY: Record<AlertLevel, Priority> = {
  critico: 'critica',
  advertencia: 'alta',
  info: 'informativa',
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; border: string; icon: IconName }> = {
  critica: { label: 'Crítica', color: STATUS.critical, bg: '#c6282808', border: '#c6282826', icon: 'alertOctagon' },
  alta: { label: 'Alta', color: '#946200', bg: '#f9a82508', border: '#f9a82530', icon: 'alertTriangle' },
  media: { label: 'Media', color: '#946200', bg: '#f9a82508', border: '#f9a82520', icon: 'alertCircle' },
  informativa: { label: 'Informativa', color: BRAND.primary, bg: '#0f4c8108', border: '#0f4c8122', icon: 'info' },
};

const PRIORITY_ORDER: Priority[] = ['critica', 'alta', 'media', 'informativa'];

function suggestedAction(alert: CashAlert): string {
  if (alert.id === 'saldo-negativo') return 'Diferir pagos no críticos o acelerar la gestión de cobranza.';
  if (alert.id === 'cobranza-insuficiente') return 'Priorizar el seguimiento de cartera vencida y clientes clave.';
  if (alert.id === 'pagos-fijos-exceden-disponibilidad') return 'Revisar el calendario de pagos fijos con Gerencia Financiera.';
  if (alert.id.startsWith('cheque-importante-')) return 'Confirmar disponibilidad de fondos antes de la fecha de cobro.';
  return 'Revisar el detalle en el Flujo de Caja.';
}

function alertCard(alert: CashAlert, priority: Priority, compact: boolean): HTMLElement {
  const meta = PRIORITY_META[priority];
  return h(
    'div',
    {
      class: 'rounded-lg flex items-start gap-3',
      style: `background:${meta.bg};border:1px solid ${meta.border};padding:${compact ? '10px 12px' : '14px 16px'}`,
    },
    [
      icon(meta.icon, { size: compact ? 16 : 18, strokeWidth: 1.75, style: `color:${meta.color};flex-shrink:0;margin-top:1px` }),
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-semibold', style: `font-size:${compact ? '12.5px' : '13.5px'};color:var(--ink-primary)` }, [alert.title]),
        h('p', { class: 'text-xs mt-0.5', style: 'color:var(--ink-secondary)' }, [alert.detail]),
        compact
          ? null
          : h('p', { class: 'text-xs mt-1.5 flex items-center gap-1.5 font-medium', style: `color:${meta.color}` }, [
              icon('arrowRight', { size: 12 }),
              suggestedAction(alert),
            ]),
      ]),
    ]
  );
}

function emptyState(): HTMLElement {
  return h('div', { class: 'card p-5 flex items-center gap-3', style: `border-color:${STATUS.good}40` }, [
    h(
      'span',
      { class: 'inline-flex items-center justify-center rounded-full', style: `width:32px;height:32px;background:${STATUS.good}18;color:${STATUS.good}` },
      [icon('checkCircle', { size: 17 })]
    ),
    h('div', {}, [
      h('p', { class: 'font-medium', style: 'font-size:14px;color:var(--ink-primary)' }, ['Sin alertas activas']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['El flujo proyectado no muestra riesgos en este momento.']),
    ]),
  ]);
}

export function renderAlerts(alerts: CashAlert[], opts: { compact?: boolean; title?: string } = {}): HTMLElement {
  const compact = opts.compact ?? false;

  if (alerts.length === 0) return emptyState();

  const byPriority = new Map<Priority, CashAlert[]>();
  for (const a of alerts) {
    const p = LEVEL_TO_PRIORITY[a.level];
    if (!byPriority.has(p)) byPriority.set(p, []);
    byPriority.get(p)!.push(a);
  }

  const sections = PRIORITY_ORDER.filter((p) => byPriority.has(p)).map((p) => {
    const meta = PRIORITY_META[p];
    const items = byPriority.get(p)!;
    return h('div', { class: 'flex flex-col gap-2' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-bold uppercase tracking-wide', style: `font-size:10.5px;color:${meta.color};letter-spacing:0.05em` }, [
          meta.label,
        ]),
        h('span', { class: 'pill', style: `background:${meta.color}16;color:${meta.color};font-size:10.5px;padding:1px 7px` }, [
          String(items.length),
        ]),
      ]),
      h('div', { class: 'flex flex-col gap-2' }, items.map((a) => alertCard(a, p, compact))),
    ]);
  });

  return h('div', { class: 'card p-5 flex flex-col gap-4' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, [opts.title ?? 'Alertas']),
      h('span', { class: 'pill', style: `background:${STATUS.critical}14;color:${STATUS.critical}` }, [String(alerts.length)]),
    ]),
    ...sections,
  ]);
}
