import { h } from './dom';

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

export function chipGroup(opts: {
  label: string;
  active: string;
  options: string[];
  onSelect: (value: string) => void;
}): HTMLElement {
  const values = ['todos', ...opts.options];
  const chips = values.map((v) => {
    const isActive = v === opts.active;
    return h(
      'button',
      {
        class: 'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
        style: isActive
          ? 'background:var(--brand);color:#fff'
          : 'background:var(--page);color:var(--ink-secondary);border:1px solid var(--gridline)',
        onclick: () => opts.onSelect(v),
      },
      [v === 'todos' ? 'Todos' : v]
    );
  });

  return h('div', { class: 'flex flex-col gap-1.5' }, [
    h('span', { class: 'text-[11px] font-semibold uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [
      opts.label,
    ]),
    h('div', { class: 'flex flex-wrap gap-1.5' }, chips),
  ]);
}

export function chipGroupFromValues(opts: {
  label: string;
  active: string;
  values: (string | undefined)[];
  onSelect: (value: string) => void;
}): HTMLElement {
  return chipGroup({ label: opts.label, active: opts.active, options: uniqueSorted(opts.values), onSelect: opts.onSelect });
}
