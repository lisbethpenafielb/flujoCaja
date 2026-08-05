import type { SyncStatus } from '../state/store';
import { h } from './dom';
import { icon, iconSvg, type IconName } from './icons';
import { BRAND, STATUS } from './palette';

const STATUS_META: Record<SyncStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'Sin conectar', color: '#9AA3AF' },
  authenticating: { label: 'Autenticando…', color: STATUS.warning, pulse: true },
  loading: { label: 'Sincronizando…', color: STATUS.warning, pulse: true },
  ready: { label: 'Conectado', color: STATUS.good },
  error: { label: 'Error de conexión', color: STATUS.critical },
};

function headerDivider(): HTMLElement {
  return h('span', { style: 'width:1px;align-self:stretch;background:var(--gridline)' });
}

function headerStat(iconName: IconName, label: string, value: string): HTMLElement {
  return h('div', { class: 'hidden lg:flex items-center gap-2' }, [
    h('span', { style: 'color:var(--ink-muted)', html: iconSvg(iconName, 15) }),
    h('div', { class: 'leading-tight' }, [
      h('p', { class: 'text-[10px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [label]),
      h('p', { class: 'text-xs font-semibold', style: 'color:var(--ink-primary)' }, [value]),
    ]),
  ]);
}

export function renderHeader(opts: {
  status: SyncStatus;
  lastSync: Date | null;
  onSync: () => void;
  googleConfigured: boolean;
  isDemo: boolean;
  onExitDemo: () => void;
}): HTMLElement {
  const meta = STATUS_META[opts.status];
  const busy = opts.status === 'authenticating' || opts.status === 'loading';

  const today = new Date();
  const fechaTexto = today.toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const fechaCapitalizada = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
  const horaActualizacion = opts.lastSync
    ? opts.lastSync.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const demoBadge = opts.isDemo
    ? h('span', { class: 'pill', style: `background:${STATUS.warning}1f;color:#8a6200` }, [
        h('span', { class: 'inline-block rounded-full', style: `width:7px;height:7px;background:${STATUS.warning}` }),
        'Modo demostración',
      ])
    : null;

  const exitDemoBtn = opts.isDemo
    ? h(
        'button',
        {
          class: 'text-xs font-medium rounded-lg px-3 py-1.5',
          style: 'border:1px solid var(--gridline);color:var(--ink-secondary)',
          onclick: opts.onExitDemo,
        },
        ['Salir de la demo']
      )
    : null;

  const statusPill = h('span', { class: 'pill', style: `background:${meta.color}1a;color:${meta.color}` }, [
    h('span', {
      class: 'inline-block rounded-full',
      style: `width:7px;height:7px;background:${meta.color}${meta.pulse ? ';animation:fade-in 1s ease-in-out infinite alternate' : ''}`,
    }),
    meta.label,
  ]);

  const syncBtn = h(
    'button',
    {
      class: 'inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors',
      style: busy ? 'background:var(--baseline);color:#fff;cursor:wait' : `background:${BRAND.primary};color:#fff;cursor:pointer`,
      disabled: busy || !opts.googleConfigured,
      title: opts.googleConfigured ? '' : 'Configura VITE_GOOGLE_CLIENT_ID (ver README) para habilitar la conexión',
      onclick: opts.onSync,
    },
    [icon('refresh', { size: 15 }), busy ? 'Sincronizando…' : 'Sincronizar']
  );

  return h(
    'header',
    {
      class: 'sticky top-0 z-20 flex items-center justify-between gap-4 px-6',
      style: `background:var(--surface);border-bottom:1px solid var(--gridline);height:64px`,
    },
    [
      h('div', { class: 'flex items-center gap-3' }, [
        h(
          'div',
          {
            class: 'flex items-center justify-center rounded-lg font-bold',
            style: `width:36px;height:36px;background:${BRAND.primary};color:#fff;font-size:13px;letter-spacing:0.02em`,
          },
          ['TCI']
        ),
        h('div', {}, [
          h('h1', { class: 'font-semibold leading-tight', style: 'font-size:15px;color:var(--ink-primary)' }, [
            'TCI Corporate Analytics',
          ]),
          h('p', { class: 'text-xs leading-tight', style: 'color:var(--ink-secondary)' }, ['Módulo Tesorería']),
        ]),
      ]),
      h('div', { class: 'flex items-center gap-4' }, [
        headerStat('calendar', 'Fecha', fechaCapitalizada),
        headerDivider(),
        headerStat('clock', 'Actualizado', horaActualizacion),
        headerDivider(),
        h('div', { class: 'hidden md:flex items-center gap-2' }, [
          h('span', {
            class: 'inline-flex items-center justify-center rounded-full',
            style: `width:26px;height:26px;background:${BRAND.primary}14;color:${BRAND.primary}`,
            html: iconSvg('user', 14),
          }),
          h('div', { class: 'leading-tight' }, [
            h('p', { class: 'text-[10px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Usuario']),
            h('p', { class: 'text-xs font-semibold', style: 'color:var(--ink-primary)' }, ['Tesorería']),
          ]),
        ]),
        headerDivider(),
        demoBadge,
        exitDemoBtn,
        opts.isDemo ? null : statusPill,
        opts.isDemo ? null : syncBtn,
      ]),
    ]
  );
}

export type TabId =
  | 'resumen'
  | 'diario'
  | 'mensual'
  | 'cheques'
  | 'tablaCheques'
  | 'recaudo'
  | 'pagos'
  | 'alertas'
  | 'configuracion';

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'resumen', label: 'Dashboard', icon: 'dashboard' },
  { id: 'diario', label: 'Flujo Diario', icon: 'calendarDay' },
  { id: 'mensual', label: 'Flujo Mensual', icon: 'calendarRange' },
  { id: 'cheques', label: 'Cheques', icon: 'listChecks' },
  { id: 'tablaCheques', label: 'Tabla Cheques', icon: 'table' },
  { id: 'recaudo', label: 'Proyección de Recaudo', icon: 'inflow' },
  { id: 'pagos', label: 'Pagos', icon: 'outflowCheck' },
  { id: 'alertas', label: 'Alertas', icon: 'bell' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings' },
];

export function renderTabs(active: TabId, onChange: (id: TabId) => void): HTMLElement {
  return h(
    'nav',
    { class: 'flex gap-1 px-6 overflow-x-auto scrollbar-thin', style: `background:${BRAND.primaryDark}` },
    TABS.map((t) =>
      h(
        'button',
        {
          class: 'inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-3 whitespace-nowrap border-b-2 transition-colors',
          style: t.id === active ? `color:#ffffff;border-color:#ffffff` : 'color:#a9c0d6;border-color:transparent',
          onclick: () => onChange(t.id),
        },
        [icon(t.icon, { size: 15, strokeWidth: 1.75 }), t.label]
      )
    )
  );
}
