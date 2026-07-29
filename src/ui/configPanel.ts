import { SOURCE_FILES } from '../config';
import { h } from './dom';
import { icon } from './icons';
import { BRAND } from './palette';

function infoRow(label: string, value: string): HTMLElement {
  return h('div', { class: 'flex items-center justify-between py-2.5', style: 'border-bottom:1px solid var(--gridline)' }, [
    h('span', { class: 'text-sm', style: 'color:var(--ink-secondary)' }, [label]),
    h('span', { class: 'text-sm font-medium', style: 'color:var(--ink-primary)' }, [value]),
  ]);
}

/** Pestaña informativa — no agrega configuración funcional nueva (ver
 *  restricciones de esta iteración: sin cambios de lógica ni arquitectura).
 *  Documenta las fuentes de datos y el estado de las excepciones manuales
 *  del módulo, para que Gerencia sepa de un vistazo de dónde sale cada dato. */
export function renderConfigPanel(): HTMLElement {
  return h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4' }, [
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'flex items-center gap-2.5 mb-2' }, [
        h('span', { class: 'inline-flex items-center justify-center rounded-lg', style: `width:32px;height:32px;background:${BRAND.primary}14;color:${BRAND.primary}` }, [
          icon('building', { size: 16 }),
        ]),
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Fuentes de datos']),
      ]),
      infoRow('Cheques', SOURCE_FILES.cheques),
      infoRow('Cartera / cobranza', SOURCE_FILES.cartera),
      infoRow('Pagos fijos', SOURCE_FILES.pagosFijos),
      infoRow('Origen', 'Google Drive (solo lectura)'),
    ]),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'flex items-center gap-2.5 mb-2' }, [
        h('span', { class: 'inline-flex items-center justify-center rounded-lg', style: `width:32px;height:32px;background:${BRAND.primary}14;color:${BRAND.primary}` }, [
          icon('user', { size: 16 }),
        ]),
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Datos de ingreso manual']),
      ]),
      infoRow('Saldos bancarios (6 bancos)', 'Sesión del navegador'),
      infoRow('Préstamo Perú / Préstamos Terceros', 'Sesión del navegador'),
      infoRow('Persistencia', 'No se guarda en Excel ni en servidor'),
      h('p', { class: 'text-xs pt-3', style: 'color:var(--ink-muted)' }, [
        'Estos valores se pierden al cerrar la pestaña — es la única excepción a "todo viene de Excel" del módulo.',
      ]),
    ]),
  ]);
}
