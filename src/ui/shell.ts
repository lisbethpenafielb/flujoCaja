import type { SyncStatus } from '../state/store';
import { h } from './dom';
import { STATUS } from './palette';

const STATUS_META: Record<SyncStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'Sin conectar', color: '#898781' },
  authenticating: { label: 'Autenticando…', color: STATUS.warning, pulse: true },
  loading: { label: 'Sincronizando…', color: STATUS.warning, pulse: true },
  ready: { label: 'Conectado', color: STATUS.good },
  error: { label: 'Error de conexión', color: STATUS.critical },
};

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

  const demoBadge = opts.isDemo
    ? h('span', { class: 'pill', style: `background:${STATUS.warning}22;color:#8a6200` }, [
        h('span', { class: 'inline-block rounded-full', style: `width:7px;height:7px;background:${STATUS.warning}` }),
        'Modo demostración · datos simulados',
      ])
    : null;

  const exitDemoBtn = opts.isDemo
    ? h(
        'button',
        {
          class: 'text-sm font-medium rounded-lg px-3 py-2',
          style: 'border:1px solid var(--gridline);color:var(--ink-secondary)',
          onclick: opts.onExitDemo,
        },
        ['Salir de la demo']
      )
    : null;

  const statusPill = h(
    'span',
    { class: 'pill', style: `background:${meta.color}1a;color:${meta.color}` },
    [
      h('span', {
        class: 'inline-block rounded-full',
        style: `width:7px;height:7px;background:${meta.color}${meta.pulse ? ';animation:fade-in 1s ease-in-out infinite alternate' : ''}`,
      }),
      meta.label,
    ]
  );

  const syncBtn = h(
    'button',
    {
      class: 'inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors',
      style: busy
        ? 'background:var(--baseline);color:#fff;cursor:wait'
        : 'background:var(--brand);color:#fff;cursor:pointer',
      disabled: busy || !opts.googleConfigured,
      title: opts.googleConfigured ? '' : 'Configura VITE_GOOGLE_CLIENT_ID (ver README) para habilitar la conexión',
      onclick: opts.onSync,
    },
    [
      h('span', {
        html:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.36"/><path d="M21 4v6h-6"/></svg>',
      }),
      busy ? 'Sincronizando…' : 'Sincronizar con Google Drive',
    ]
  );

  return h(
    'header',
    {
      class: 'sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-4',
      style: 'background:var(--surface);border-bottom:1px solid var(--gridline)',
    },
    [
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', {
          class: 'flex items-center justify-center rounded-xl font-bold',
          style: 'width:38px;height:38px;background:var(--brand);color:#fff;font-size:15px',
        }, ['TC']),
        h('div', {}, [
          h('h1', { class: 'font-semibold leading-tight', style: 'font-size:16px' }, [
            'Tesorería · Transcomerinter Cía. Ltda.',
          ]),
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Módulo de Flujo de Caja']),
        ]),
      ]),
      h('div', { class: 'flex items-center gap-3' }, [
        opts.lastSync && !opts.isDemo
          ? h('span', { class: 'text-xs hidden sm:inline', style: 'color:var(--ink-muted)' }, [
              `Última sincronización: ${opts.lastSync.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`,
            ])
          : null,
        demoBadge,
        exitDemoBtn,
        opts.isDemo ? null : statusPill,
        opts.isDemo ? null : syncBtn,
      ]),
    ]
  );
}

export type TabId = 'resumen' | 'diario' | 'semanal' | 'graficos' | 'bancos' | 'alertas';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'resumen', label: 'Resumen Ejecutivo' },
  { id: 'diario', label: 'Flujo Diario' },
  { id: 'semanal', label: 'Flujo Semanal' },
  { id: 'graficos', label: 'Proyección y Gráficos' },
  { id: 'bancos', label: 'Saldos Bancarios' },
  { id: 'alertas', label: 'Alertas' },
];

export function renderTabs(active: TabId, onChange: (id: TabId) => void): HTMLElement {
  return h(
    'nav',
    { class: 'flex gap-1 px-6 overflow-x-auto scrollbar-thin', style: 'background:var(--surface);border-bottom:1px solid var(--gridline)' },
    TABS.map((t) =>
      h(
        'button',
        {
          class: 'text-sm font-medium px-3.5 py-3 whitespace-nowrap border-b-2 transition-colors',
          style:
            t.id === active
              ? 'color:var(--brand);border-color:var(--brand)'
              : 'color:var(--ink-secondary);border-color:transparent',
          onclick: () => onChange(t.id),
        },
        [t.label]
      )
    )
  );
}
