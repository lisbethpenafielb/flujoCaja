import type { PagoEstado } from '../types';
import { h } from './dom';
import { STATUS } from './palette';

/** Selector Pendiente/Pagado compartido — mismo look en filas manuales
 *  (Pagos, Recaudo) y en la anulación manual de renglones de Excel. */
export function renderEstadoSelect(estado: PagoEstado, onChange: (v: PagoEstado) => void): HTMLElement {
  const sel = h('select', {
    class: 'text-sm font-medium rounded-lg px-2.5 py-1.5 outline-none',
    style:
      estado === 'pagado'
        ? `border:1px solid ${STATUS.good}55;background:${STATUS.good}1a;color:${STATUS.good}`
        : `border:1px solid ${STATUS.warning}55;background:${STATUS.warning}1a;color:#8a6200`,
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value as PagoEstado),
  }) as HTMLSelectElement;
  for (const [value, label] of [
    ['pendiente', 'Pendiente'],
    ['pagado', 'Pagado'],
  ] as [PagoEstado, string][]) {
    const o = h('option', { value }, [label]) as HTMLOptionElement;
    if (value === estado) o.selected = true;
    sel.appendChild(o);
  }
  return sel;
}
