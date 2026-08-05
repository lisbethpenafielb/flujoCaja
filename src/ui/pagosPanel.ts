import type { CashEvent, ManualPago, PagoEstado } from '../types';
import { store } from '../state/store';
import { formatDateShortEs, todayISO } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { icon } from './icons';
import { BRAND, STATUS } from './palette';

const INPUT_STYLE = 'border:1px solid var(--gridline);background:var(--page);color:var(--ink-primary)';

function addForm(): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    placeholder: 'Ej. Arriendo bodega norte',
    class: 'text-sm rounded-lg px-3 py-2 outline-none w-full',
    style: INPUT_STYLE,
  }) as HTMLInputElement;

  const montoInput = h('input', {
    type: 'number',
    step: '0.01',
    placeholder: '0.00',
    class: 'text-sm rounded-lg px-3 py-2 outline-none tabular-nums text-right w-full',
    style: INPUT_STYLE,
  }) as HTMLInputElement;

  const fechaInput = h('input', {
    type: 'date',
    value: todayISO(),
    class: 'text-sm rounded-lg px-3 py-2 outline-none tabular-nums w-full',
    style: INPUT_STYLE,
  }) as HTMLInputElement;

  function submit(): void {
    const concepto = conceptoInput.value.trim();
    const monto = Number(montoInput.value);
    const fecha = fechaInput.value;
    if (!concepto || !isFinite(monto) || monto <= 0 || !fecha) return;
    store.addManualPago(concepto, monto, fecha);
  }

  return h('div', { class: 'card p-5 flex flex-col gap-3' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Agregar pago']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
        'Nómina, arriendos, servicios básicos, seguros u otro pago recurrente que PAGOS FIJOS.xlsx no cubre.',
      ]),
    ]),
    h('div', { class: 'grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end' }, [
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Concepto']),
        conceptoInput,
      ]),
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Monto']),
        montoInput,
      ]),
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Fecha']),
        fechaInput,
      ]),
      h(
        'button',
        {
          class: 'inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-2',
          style: `background:${BRAND.primary};color:#fff`,
          onclick: submit,
        },
        [icon('plus', { size: 15 }), 'Agregar']
      ),
    ]),
  ]);
}

function estadoSelect(pago: ManualPago): HTMLElement {
  const sel = h('select', {
    class: 'text-sm font-medium rounded-lg px-2.5 py-1.5 outline-none',
    style:
      pago.estado === 'pagado'
        ? `border:1px solid ${STATUS.good}55;background:${STATUS.good}1a;color:${STATUS.good}`
        : `border:1px solid ${STATUS.warning}55;background:${STATUS.warning}1a;color:#8a6200`,
    onchange: (e: Event) => store.updateManualPago(pago.id, { estado: (e.target as HTMLSelectElement).value as PagoEstado }),
  }) as HTMLSelectElement;
  for (const [value, label] of [
    ['pendiente', 'Pendiente'],
    ['pagado', 'Pagado'],
  ] as [PagoEstado, string][]) {
    const o = h('option', { value }, [label]) as HTMLOptionElement;
    if (value === pago.estado) o.selected = true;
    sel.appendChild(o);
  }
  return sel;
}

function pagoRow(pago: ManualPago): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    value: pago.concepto,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => store.updateManualPago(pago.id, { concepto: (e.target as HTMLInputElement).value }),
  });

  const montoInput = h('input', {
    type: 'number',
    step: '0.01',
    value: String(pago.monto),
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums text-right w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => {
      const num = Number((e.target as HTMLInputElement).value);
      if (isFinite(num) && num > 0) store.updateManualPago(pago.id, { monto: num });
    },
  });

  const fechaInput = h('input', {
    type: 'date',
    value: pago.fecha,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => store.updateManualPago(pago.id, { fecha: (e.target as HTMLInputElement).value }),
  });

  const deleteBtn = h(
    'button',
    {
      class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
      style: `width:32px;height:32px;color:${STATUS.critical}`,
      title: 'Eliminar pago',
      onclick: () => store.removeManualPago(pago.id),
    },
    [icon('trash', { size: 15 })]
  );

  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-center py-2.5' }, [
    conceptoInput,
    montoInput,
    fechaInput,
    estadoSelect(pago),
    deleteBtn,
  ]);
}

function excelPagoRow(e: CashEvent): HTMLElement {
  return h('div', { class: 'grid grid-cols-[2fr_1fr_1fr] gap-3 items-center py-2.5 text-sm' }, [
    h('span', { style: 'color:var(--ink-primary)' }, [e.category]),
    h('span', { class: 'tabular-nums text-right', style: 'color:var(--ink-primary)' }, [formatMoney(e.amount)]),
    h('span', { class: 'tabular-nums', style: 'color:var(--ink-muted)' }, [formatDateShortEs(e.date)]),
  ]);
}

export function renderPagosPanel(pagos: ManualPago[], excelPagosFijos: CashEvent[]): HTMLElement {
  const pendientes = pagos.filter((p) => p.estado === 'pendiente');
  const totalPendiente = pendientes.reduce((s, p) => s + p.monto, 0) + excelPagosFijos.reduce((s, e) => s + e.amount, 0);

  const sorted = [...pagos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  return h('div', { class: 'flex flex-col gap-4' }, [
    addForm(),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'flex items-center justify-between mb-2' }, [
        h('div', {}, [
          h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Pagos manuales']),
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
            'Un pago "Pagado" deja de proyectarse en el Flujo; "Pendiente" aparece en la fecha indicada.',
          ]),
        ]),
        h('div', { class: 'text-right' }, [
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total pendiente (manual + Excel)']),
          h('p', { class: 'font-semibold tabular-nums', style: `font-size:16px;color:${BRAND.primary}` }, [formatMoney(totalPendiente)]),
        ]),
      ]),
      sorted.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, ['Todavía no agregas ningún pago manual.'])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, sorted.map(pagoRow)),
    ]),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'mb-2' }, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Pagos fijos desde Excel']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
          'PAGOS FIJOS.xlsx (convenio IESS) — de solo lectura, siempre pendiente, no se puede marcar como pagado aquí.',
        ]),
      ]),
      excelPagosFijos.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, ['No hay pagos fijos cargados desde Excel.'])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, excelPagosFijos.map(excelPagoRow)),
    ]),
  ]);
}
