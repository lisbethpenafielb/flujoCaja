import type { SyncStatus } from '../state/store';
import { h } from './dom';
import { icon } from './icons';
import { STATUS } from './palette';

export function renderEmptyState(
  status: SyncStatus,
  error: string | null,
  onSync: () => void,
  googleConfigured: boolean,
  onDemo: () => void
): HTMLElement {
  if (status === 'error') {
    return h('div', { class: 'card p-10 flex flex-col items-center text-center gap-3 max-w-xl mx-auto mt-10' }, [
      h(
        'span',
        {
          class: 'inline-flex items-center justify-center rounded-full',
          style: `width:48px;height:48px;background:${STATUS.critical}18;color:${STATUS.critical}`,
        },
        [icon('alertTriangle', { size: 24, strokeWidth: 1.75 })]
      ),
      h('h2', { class: 'font-semibold', style: 'font-size:16px;color:var(--ink-primary)' }, ['No se pudo sincronizar']),
      h('p', { class: 'text-sm', style: 'color:var(--ink-secondary)' }, [error ?? 'Error desconocido']),
      h(
        'button',
        {
          class: 'text-sm font-medium rounded-lg px-4 py-2 mt-2',
          style: 'background:var(--brand);color:#fff',
          onclick: onSync,
        },
        ['Reintentar']
      ),
    ]);
  }

  return h('div', { class: 'card p-10 flex flex-col items-center text-center gap-3 max-w-xl mx-auto mt-10' }, [
    h(
      'span',
      { class: 'inline-flex items-center justify-center rounded-full', style: 'width:48px;height:48px;background:var(--brand-tint);color:var(--brand)' },
      [icon('refresh', { size: 22, strokeWidth: 1.75 })]
    ),
    h('h2', { class: 'font-semibold', style: 'font-size:16px;color:var(--ink-primary)' }, ['Conecta Google Drive para comenzar']),
    h('p', { class: 'text-sm', style: 'color:var(--ink-secondary)' }, [
      'El dashboard lee en vivo BASE CHEQUES, PROYECCION DE CARTERA y PAGOS FIJOS directamente desde tu Drive. Ningún dato se ingresa manualmente aquí.',
    ]),
    !googleConfigured
      ? h('p', { class: 'text-xs mt-1', style: 'color:#8a6200' }, [
          'Falta configurar VITE_GOOGLE_CLIENT_ID — ver README.md antes de conectar.',
        ])
      : null,
    h(
      'button',
      {
        class: 'text-sm font-medium rounded-lg px-4 py-2 mt-2',
        style: googleConfigured ? 'background:var(--brand);color:#fff' : 'background:var(--baseline);color:#fff',
        disabled: !googleConfigured,
        onclick: onSync,
      },
      ['Conectar con Google Drive']
    ),
    h('div', { class: 'flex items-center gap-3 w-full mt-4', style: 'color:var(--ink-muted)' }, [
      h('div', { style: 'flex:1;height:1px;background:var(--gridline)' }),
      h('span', { class: 'text-xs' }, ['o']),
      h('div', { style: 'flex:1;height:1px;background:var(--gridline)' }),
    ]),
    h('button', { class: 'text-sm font-medium rounded-lg px-4 py-2 mt-1', style: 'border:1px solid var(--gridline);color:var(--ink-primary)', onclick: onDemo }, [
      'Ver demo con datos simulados',
    ]),
    h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
      'Explora diseño, navegación y funcionalidades sin conectar Drive. Los datos son ficticios.',
    ]),
  ]);
}

export function renderWarningsBanner(warnings: string[]): HTMLElement | null {
  if (warnings.length === 0) return null;
  return h('div', { class: 'card p-4 flex flex-col gap-1.5', style: `border-color:${STATUS.warning}59;background:${STATUS.warning}0f` }, [
    h('p', { class: 'text-xs font-semibold uppercase tracking-wide', style: 'color:#8a6200' }, ['Avisos del modelo de datos']),
    ...warnings.map((w) => h('p', { class: 'text-xs', style: 'color:var(--ink-secondary)' }, [`• ${w}`])),
  ]);
}
