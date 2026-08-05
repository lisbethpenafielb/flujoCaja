import type { CashEvent, ExcelEstadoOverrides, PagoEstado } from '../types';
import { formatDateShortEs, todayISO } from '../utils/dates';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { renderEstadoSelect } from './estadoSelect';
import { icon } from './icons';
import { BRAND, STATUS } from './palette';

const INPUT_STYLE = 'border:1px solid var(--gridline);background:var(--page);color:var(--ink-primary)';

/** Forma común a ManualPago y ManualRecaudo (ver types.ts) — Pagos y Proyección
 *  de Recaudo son, en la UI, el mismo patrón "lista editable + estado
 *  pendiente/pagado" aplicado a egresos e ingresos respectivamente. Este
 *  componente factoriza esa UI una sola vez en vez de mantener dos copias. */
export interface ManualEntry {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  estado: PagoEstado;
}

export interface ManualEntryPanelConfig {
  /** Minúscula, para textos como "Eliminar pago" / "Eliminar recaudo". */
  entryLabel: string;
  addTitle: string;
  addDescription: string;
  conceptoPlaceholder: string;
  fechaLabel: string;
  listTitle: string;
  listDescription: string;
  emptyMessage: string;
  excelTitle: string;
  excelDescription: string;
  excelEmptyMessage: string;
  /** Campo de CashEvent a mostrar como "concepto" en la fila de Excel:
   *  Pagos usa la categoría (IESS, etc.), Recaudo usa el cliente/contraparte. */
  excelLabelField: 'category' | 'counterparty';
  onAdd: (concepto: string, monto: number, fecha: string) => void;
  onUpdate: (id: string, partial: Partial<Pick<ManualEntry, 'concepto' | 'monto' | 'fecha' | 'estado'>>) => void;
  onRemove: (id: string) => void;
  onSetExcelEstado: (eventId: string, estado: PagoEstado) => void;
}

function addForm(cfg: ManualEntryPanelConfig): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    placeholder: cfg.conceptoPlaceholder,
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
    cfg.onAdd(concepto, monto, fecha);
  }

  return h('div', { class: 'card p-5 flex flex-col gap-3' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, [cfg.addTitle]),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [cfg.addDescription]),
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
        h('label', { class: 'text-[11px] font-medium uppercase tracking-wide', style: 'color:var(--ink-muted)' }, [cfg.fechaLabel]),
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

function entryRow(entry: ManualEntry, cfg: ManualEntryPanelConfig): HTMLElement {
  const conceptoInput = h('input', {
    type: 'text',
    value: entry.concepto,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => cfg.onUpdate(entry.id, { concepto: (e.target as HTMLInputElement).value }),
  });

  const montoInput = h('input', {
    type: 'number',
    step: '0.01',
    value: String(entry.monto),
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums text-right w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => {
      const num = Number((e.target as HTMLInputElement).value);
      if (isFinite(num) && num > 0) cfg.onUpdate(entry.id, { monto: num });
    },
  });

  const fechaInput = h('input', {
    type: 'date',
    value: entry.fecha,
    class: 'text-sm rounded-lg px-2.5 py-1.5 outline-none tabular-nums w-full',
    style: INPUT_STYLE,
    onchange: (e: Event) => cfg.onUpdate(entry.id, { fecha: (e.target as HTMLInputElement).value }),
  });

  const deleteBtn = h(
    'button',
    {
      class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
      style: `width:32px;height:32px;color:${STATUS.critical}`,
      title: `Eliminar ${cfg.entryLabel}`,
      'aria-label': `Eliminar ${cfg.entryLabel}`,
      onclick: () => cfg.onRemove(entry.id),
    },
    [icon('trash', { size: 15 })]
  );

  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-center py-2.5' }, [
    conceptoInput,
    montoInput,
    fechaInput,
    renderEstadoSelect(entry.estado, (estado) => cfg.onUpdate(entry.id, { estado })),
    deleteBtn,
  ]);
}

function excelRow(e: CashEvent, excelEstados: ExcelEstadoOverrides, cfg: ManualEntryPanelConfig): HTMLElement {
  const estado = excelEstados[e.id] ?? 'pendiente';
  return h('div', { class: 'grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center py-2.5 text-sm' }, [
    h('span', { style: 'color:var(--ink-primary)' }, [e[cfg.excelLabelField]]),
    h('span', { class: 'tabular-nums text-right', style: 'color:var(--ink-primary)' }, [formatMoney(e.amount)]),
    h('span', { class: 'tabular-nums', style: 'color:var(--ink-muted)' }, [formatDateShortEs(e.date)]),
    renderEstadoSelect(estado, (v) => cfg.onSetExcelEstado(e.id, v)),
  ]);
}

export function renderManualEntryPanel(
  entries: ManualEntry[],
  excelEvents: CashEvent[],
  excelEstados: ExcelEstadoOverrides,
  cfg: ManualEntryPanelConfig
): HTMLElement {
  const pendientes = entries.filter((e) => e.estado === 'pendiente');
  const excelPendientes = excelEvents.filter((e) => (excelEstados[e.id] ?? 'pendiente') === 'pendiente');
  const totalPendiente = pendientes.reduce((s, e) => s + e.monto, 0) + excelPendientes.reduce((s, e) => s + e.amount, 0);

  const sorted = [...entries].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  return h('div', { class: 'flex flex-col gap-4' }, [
    addForm(cfg),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'flex items-center justify-between mb-2' }, [
        h('div', {}, [
          h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, [cfg.listTitle]),
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [cfg.listDescription]),
        ]),
        h('div', { class: 'text-right' }, [
          h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total pendiente (manual + Excel)']),
          h('p', { class: 'font-semibold tabular-nums', style: `font-size:16px;color:${BRAND.primary}` }, [formatMoney(totalPendiente)]),
        ]),
      ]),
      sorted.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, [cfg.emptyMessage])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, sorted.map((entry) => entryRow(entry, cfg))),
    ]),
    h('div', { class: 'card p-5 flex flex-col gap-1' }, [
      h('div', { class: 'mb-2' }, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, [cfg.excelTitle]),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [cfg.excelDescription]),
      ]),
      excelEvents.length === 0
        ? h('p', { class: 'text-sm p-6 text-center', style: 'color:var(--ink-muted)' }, [cfg.excelEmptyMessage])
        : h('div', { class: 'divide-y', style: 'border-color:var(--gridline)' }, excelEvents.map((e) => excelRow(e, excelEstados, cfg))),
    ]),
  ]);
}
