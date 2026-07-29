import type { SyncStatus } from '../state/store';
import { h } from './dom';

export function renderEmptyState(status: SyncStatus, error: string | null, onSync: () => void, googleConfigured: boolean): HTMLElement {
  if (status === 'error') {
    return h('div', { class: 'card p-10 flex flex-col items-center text-center gap-3 max-w-xl mx-auto mt-10' }, [
      h('span', {
        class: 'inline-flex items-center justify-center rounded-full',
        style: 'width:48px;height:48px;background:rgba(208,59,59,0.10);color:#d03b3b',
        html:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
      }),
      h('h2', { class: 'font-semibold', style: 'font-size:16px' }, ['No se pudo sincronizar']),
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
    h('span', {
      class: 'inline-flex items-center justify-center rounded-full',
      style: 'width:48px;height:48px;background:rgba(42,120,214,0.10);color:#2a78d6',
      html:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.36"/><path d="M21 4v6h-6"/></svg>',
    }),
    h('h2', { class: 'font-semibold', style: 'font-size:16px' }, ['Conecta Google Drive para comenzar']),
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
  ]);
}

export function renderWarningsBanner(warnings: string[]): HTMLElement | null {
  if (warnings.length === 0) return null;
  return h('div', { class: 'card p-4 flex flex-col gap-1.5', style: 'border-color:rgba(250,178,25,0.35);background:rgba(250,178,25,0.06)' }, [
    h('p', { class: 'text-xs font-semibold uppercase tracking-wide', style: 'color:#8a6200' }, ['Avisos del modelo de datos']),
    ...warnings.map((w) => h('p', { class: 'text-xs', style: 'color:var(--ink-secondary)' }, [`• ${w}`])),
  ]);
}
