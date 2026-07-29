import type { CashAlert } from '../types';
import { h } from './dom';
import { STATUS } from './palette';

const LEVEL_STYLE: Record<CashAlert['level'], { bg: string; border: string; text: string; icon: string }> = {
  critico: {
    bg: 'rgba(208,59,59,0.06)',
    border: 'rgba(208,59,59,0.25)',
    text: STATUS.critical,
    icon: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  },
  advertencia: {
    bg: 'rgba(250,178,25,0.08)',
    border: 'rgba(250,178,25,0.30)',
    text: '#8a6200',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  },
  info: {
    bg: 'rgba(42,120,214,0.06)',
    border: 'rgba(42,120,214,0.22)',
    text: '#184f95',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  },
};

export function renderAlerts(alerts: CashAlert[]): HTMLElement {
  if (alerts.length === 0) {
    return h('div', { class: 'card p-5 flex items-center gap-3', style: 'border-color:rgba(12,163,12,0.25)' }, [
      h('span', {
        class: 'inline-flex items-center justify-center rounded-full',
        style: 'width:32px;height:32px;background:rgba(12,163,12,0.10);color:#0ca30c',
        html:
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      }),
      h('div', {}, [
        h('p', { class: 'font-medium', style: 'font-size:14px' }, ['Sin alertas activas']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['El flujo proyectado no muestra riesgos en este momento.']),
      ]),
    ]);
  }

  const items = alerts.map((a) => {
    const s = LEVEL_STYLE[a.level];
    return h(
      'div',
      { class: 'flex items-start gap-3 p-4 rounded-xl', style: `background:${s.bg};border:1px solid ${s.border}` },
      [
        h('span', {
          style: `color:${s.text};flex-shrink:0`,
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>`,
        }),
        h('div', {}, [
          h('p', { class: 'font-medium', style: `font-size:13.5px;color:${s.text}` }, [a.title]),
          h('p', { class: 'text-xs mt-0.5', style: 'color:var(--ink-secondary)' }, [a.detail]),
        ]),
      ]
    );
  });

  return h('div', { class: 'card p-5 flex flex-col gap-3' }, [
    h('div', { class: 'flex items-center justify-between' }, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px' }, ['Alertas']),
      h('span', { class: 'pill', style: 'background:rgba(208,59,59,0.10);color:#d03b3b' }, [`${alerts.length}`]),
    ]),
    h('div', { class: 'flex flex-col gap-2' }, items),
  ]);
}
