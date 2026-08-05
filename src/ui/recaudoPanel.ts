import type { CashEvent, ExcelEstadoOverrides, ManualRecaudo } from '../types';
import { store } from '../state/store';
import { formatDateShortEs, todayISO } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { renderEstadoSelect } from './estadoSelect';
import { icon } from './icons';
import { BRAND, STATUS } from './palette';

const INPUT_STYLE = 'border:1px solid var(--gridline);background:var(--page);color:var(--ink-primary)';

function addForm(): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    placeholder: 'Ej. Cliente ABC — factura 4521',
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
    store.addManualRecaudo(concepto, monto, fecha);
  }

  return h('div', { class: 'card p-5 flex flex-col gap-3' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Agregar recaudo']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
        'Cobro proyectado que no viene de PROYECCION DE CARTERA.xlsx, o un ajuste manual a la proyección.',
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
        h('label', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, ['Fecha proyectada']),
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

function recaudoRow(recaudo: ManualRecaudo): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    value: recaudo.concepto,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => store.updateManualRecaudo(recaudo.id, { concepto: (e.target as HTMLInputElement).value }),
  });

  const montoInput = h('input', {
    type: 'number',
    step: '0.01',
    value: String(recaudo.monto),
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums text-right w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => {
      const num = Number((e.target as HTMLInputElement).value);
      if (isFinite(num) && num > 0) store.updateManualRecaudo(recaudo.id, { monto: num });
    },
  });

  const fechaInput = h('input', {
    type: 'date',
    value: recaudo.fecha,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => store.updateManualRecaudo(recaudo.id, { fecha: (e.target as HTMLInputElement).value }),
  });

  const deleteBtn = h(
    'button',
    {
      class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
      style: `width:32px;height:32px;color:${STATUS.critical}`,
      title: 'Eliminar recaudo',
      onclick: () => store.removeManualRecaudo(recaudo.id),
    },
    [icon('trash', { size: 15 })]
  );

  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-center py-2.5' }, [
    conceptoInput,
    montoInput,
    fechaInput,
    renderEstadoSelect(recaudo.estado, (estado) => store.updateManualRecaudo(recaudo.id, { estado })),
    deleteBtn,
  ]);
}

function excelRecaudoRow(e: CashEvent, excelEstados: ExcelEstadoOverrides): HTMLElement {
  const estado = excelEstados[e.id] ?? 'pendiente';
  return h('div', { class: 'grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center py-2.5 text-sm' }, [
    h('span', { style: 'color:var(--ink-primary)' }, [e.counterparty]),
    h('span', { class: 'tabular-nums text-right', style: 'color:var(--ink-primary)' }, [formatMoney(e.amount)]),
    h('span', { class: 'tabular-nums', style: 'color:var(--ink-muted)' }, [formatDateShortEs(e.date)]),
    renderEstadoSelect(estado, (v) => store.setExcelEstado(e.id, v)),
  ]);
}

export function renderRecaudoPanel(recaudos: ManualRecaudo[], excelRecaudo: CashEvent[], excelEstados: ExcelEstadoOverrides): HTMLElement {
  const pendientes = recaudos.filter((r) => r.estado === 'pendiente');
  const excelPendientes = excelRecaudo.filter((e) => (excelEstados[e.id] ?? 'pendiente') === 'pendiente');
  const totalPendiente = pendientes.reduce((s, r) => s + r.monto, 0) + excelPendientes.reduce((s, e) => s + e.amount, 0);

  const sorted = [...recaudos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  return h('div', { class: 'flex flex-col gap-4' }, [
    addForm(),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'flex items-center justify-between mb-2' }, [
        h('div', {}, [
          h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Recaudo manual']),
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
            'Un recaudo "Pagado" (ya cobrado) deja de proyectarse en el Flujo; "Pendiente" aparece en la fecha indicada.',
          ]),
        ]),
        h('div', { class: 'text-right' }, [
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total pendiente (manual + Excel)']),
          h('p', { class: 'font-semibold tabular-nums', style: `font-size:16px;color:${BRAND.primary}` }, [formatMoney(totalPendiente)]),
        ]),
      ]),
      sorted.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, ['Todavía no agregas ningún recaudo manual.'])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, sorted.map(recaudoRow)),
    ]),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'mb-2' }, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Recaudo proyectado desde Excel']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
          'PROYECCION DE CARTERA.xlsx — el monto viene del Excel, pero podés marcar cada renglón como pagado (ya cobrado) para sacarlo del Flujo sin editar el archivo origen.',
        ]),
      ]),
      excelRecaudo.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, ['No hay recaudo cargado desde Excel.'])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, excelRecaudo.map((e) => excelRecaudoRow(e, excelEstados))),
    ]),
  ]);
}
