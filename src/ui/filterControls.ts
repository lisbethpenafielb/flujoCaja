import { h } from './dom';
import { iconSvg, type IconName } from './icons';

export function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

const FIELD_HEIGHT = '34px';

/** Control de filtro compacto y con icono — mismo look en la barra de
 *  filtros global y en las 3 pestañas de cheques, para que la barra de
 *  filtros se lea como un único componente de la identidad ejecutiva. */
export function filterSelect(iconName: IconName, label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
  const sel = h('select', {
    class: 'text-[13px] font-medium outline-none bg-transparent pr-1',
    style: 'color:var(--ink-primary);min-width:0;max-width:150px;text-overflow:ellipsis',
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  sel.appendChild(h('option', { value: 'todos' }, ['Todos']));
  for (const opt of options) {
    const o = h('option', { value: opt }, [opt]) as HTMLOptionElement;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }

  return h(
    'label',
    {
      class: 'inline-flex items-center gap-2 rounded-lg px-3',
      style: `height:${FIELD_HEIGHT};border:1px solid var(--gridline);background:var(--page)`,
      title: label,
    },
    [h('span', { style: 'color:var(--ink-muted)', html: iconSvg(iconName, 14) }), sel]
  );
}

export function filterDate(iconName: IconName, label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const input = h('input', {
    type: 'date',
    value,
    class: 'text-[13px] font-medium outline-none tabular-nums bg-transparent',
    style: 'color:var(--ink-primary);min-width:0',
    onchange: (e: Event) => onChange((e.target as HTMLInputElement).value),
  });
  return h(
    'label',
    {
      class: 'inline-flex items-center gap-2 rounded-lg px-3',
      style: `height:${FIELD_HEIGHT};border:1px solid var(--gridline);background:var(--page)`,
      title: label,
    },
    [h('span', { style: 'color:var(--ink-muted)', html: iconSvg(iconName, 14) }), input]
  );
}

export function filterResetButton(onClick: () => void, label = 'Limpiar'): HTMLElement {
  return h(
    'button',
    {
      class: 'inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3',
      style: `height:${FIELD_HEIGHT};color:var(--ink-secondary);border:1px solid var(--gridline);background:var(--surface)`,
      onclick: onClick,
    },
    [label]
  );
}
