// Set de iconos compartido — trazo único, discreto, sin relleno. Un solo
// lugar para todo el ícono de la app, así el estilo visual queda consistente
// entre menú, filtros, tarjetas KPI y alertas.
import { h } from './dom';

const PATHS: Record<string, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  calendarDay: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><rect x="7" y="13" width="4" height="3.5" rx="0.5" fill="currentColor" stroke="none"/>',
  calendarRange: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7 14h3M14 14h3M7 17.5h10"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3.5 2"/>',
  listChecks: '<path d="m3.5 6 1.5 1.5L8 4.5"/><path d="m3.5 13 1.5 1.5L8 11.5"/><path d="m3.5 20 1.5 1.5L8 18.5"/><path d="M12 6h9M12 13h9M12 20h9"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 16h18M9 4v16"/>',
  bank: '<path d="M3 21h18M4 10h16M6 10V21M10 10V21M14 10V21M18 10V21M12 3 2 8h20L12 3Z"/>',
  bell: '<path d="M9.5 19a2.5 2.5 0 0 0 5 0"/><path d="M4.6 16.3C4 17 4.3 18 5.3 18h13.4c1 0 1.3-1 .7-1.7-1-1.1-1.9-2.5-1.9-6.1a5.5 5.5 0 0 0-11 0c0 3.6-.9 5-1.9 6.1Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.36"/><path d="M21 4v6h-6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  filter: '<path d="M4 5h16M7 12h10M10.5 19h3"/>',
  building: '<path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5V21"/><path d="M2 21h20M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
  tag: '<path d="M20.6 12.6 12 21.2a2 2 0 0 1-2.8 0L3 15a2 2 0 0 1 0-2.8L11.6 3.6A2 2 0 0 1 13 3H19a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4Z"/><circle cx="15.5" cy="8.5" r="1.25" fill="currentColor" stroke="none"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h13l-3 4.5L18 13H5"/>',
  trendUp: '<path d="M4 17 10 11l4 4 6-8"/><path d="M15 7h5v5"/>',
  trendDown: '<path d="M4 7l6 6 4-4 6 8"/><path d="M15 17h5v-5"/>',
  inflow: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  outflowCheck: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h5"/>',
  scale: '<path d="M12 3v18M5 21h14M6 7l-3.5 7a3.5 3.5 0 0 0 7 0L6 7Z"/><path d="M18 7l-3.5 7a3.5 3.5 0 0 0 7 0L18 7Z"/><path d="M4 7h4M16 7h4M12 7H9M12 7h3"/>',
  droplet: '<path d="M12 2c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12Z"/>',
  alertOctagon: '<path d="M7.9 3h8.2L21 7.9v8.2L16.1 21H7.9L3 16.1V7.9L7.9 3Z"/><path d="M12 8v5M12 16.5h.01"/>',
  alertTriangle: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  externalArrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  checkCircle: '<path d="M20 6 9 17l-5-5"/>',
};

export function iconSvg(name: keyof typeof PATHS, size = 16, strokeWidth = 2): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? ''}</svg>`;
}

export function icon(name: keyof typeof PATHS, opts: { size?: number; strokeWidth?: number; class?: string; style?: string } = {}): HTMLElement {
  return h('span', {
    class: `inline-flex items-center justify-center flex-shrink-0 ${opts.class ?? ''}`,
    style: opts.style ?? '',
    html: iconSvg(name, opts.size ?? 16, opts.strokeWidth ?? 2),
  });
}

export type IconName = keyof typeof PATHS;
