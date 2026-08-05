import type { BankAccount, CashEvent, ChequeFilters, Filters, LoadedDataset, ManualPago, ManualRecaudo } from '../types';
import { loadBankAccounts, saveBankAccounts } from './bankAccounts';
import { loadManualLoanEntries, saveManualLoanEntries, type ManualLoanEntries } from './manualLoans';
import { loadManualPagos, saveManualPagos } from './manualPagos';
import { loadManualRecaudos, saveManualRecaudos } from './manualRecaudos';
import { todayISO, addDays, currentMonthKey } from '../utils/dates';

export type SyncStatus = 'idle' | 'authenticating' | 'loading' | 'ready' | 'error';

export type ChequeFilterScope = 'rezagados' | 'diarios' | 'tabla';

interface State {
  bankAccounts: BankAccount[];
  dataset: LoadedDataset | null;
  filters: Filters;
  // Cada pestaña de cheques tiene su propio estado de filtros: comparten uno
  // solo produciría filtrado "fantasma" (un filtro puesto en una pestaña
  // afectando silenciosamente a otra que no muestra ese control).
  chequeFilters: Record<ChequeFilterScope, ChequeFilters>;
  // Flujo Mensual tiene su propio filtro (mes calendario), deliberadamente
  // desacoplado de `filters.dateFrom/dateTo` (esos son de Flujo Diario) para
  // que cambiar uno nunca afecte al otro.
  monthlyFilter: string;
  manualLoanEntries: ManualLoanEntries;
  manualPagos: ManualPago[];
  manualRecaudos: ManualRecaudo[];
  syncStatus: SyncStatus;
  syncError: string | null;
  isDemo: boolean;
}

type Listener = () => void;

function defaultFilters(): Filters {
  return {
    dateFrom: todayISO(),
    dateTo: addDays(todayISO(), 29),
    bank: 'todos',
    counterparty: 'todos',
    category: 'todos',
    status: 'todos',
  };
}

function defaultChequeFilters(): ChequeFilters {
  return {
    estado: 'todos',
    banco: 'todos',
    estatus2: 'todos',
    negociacion: 'todos',
    mes: 'todos',
    anio: 'todos',
    fechaInicio: '',
    fechaFin: '',
  };
}

class Store {
  private state: State = {
    bankAccounts: loadBankAccounts(),
    dataset: null,
    filters: defaultFilters(),
    chequeFilters: {
      rezagados: defaultChequeFilters(),
      diarios: defaultChequeFilters(),
      tabla: defaultChequeFilters(),
    },
    monthlyFilter: currentMonthKey(),
    manualLoanEntries: loadManualLoanEntries(),
    manualPagos: loadManualPagos(),
    manualRecaudos: loadManualRecaudos(),
    syncStatus: 'idle',
    syncError: null,
    isDemo: false,
  };

  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  get(): Readonly<State> {
    return this.state;
  }

  setBankBalance(id: string, balance: number | null): void {
    this.state.bankAccounts = this.state.bankAccounts.map((a) => (a.id === id ? { ...a, balance } : a));
    saveBankAccounts(this.state.bankAccounts);
    this.emit();
  }

  setSyncStatus(status: SyncStatus, error: string | null = null): void {
    this.state.syncStatus = status;
    this.state.syncError = error;
    this.emit();
  }

  setDataset(events: CashEvent[], excludedEvents: CashEvent[], warnings: string[], isDemo = false): void {
    this.state.dataset = { events, excludedEvents, loadedAt: new Date(), warnings };
    this.state.syncStatus = 'ready';
    this.state.syncError = null;
    this.state.isDemo = isDemo;
    this.emit();
  }

  exitDemo(): void {
    this.state.dataset = null;
    this.state.syncStatus = 'idle';
    this.state.isDemo = false;
    this.emit();
  }

  setFilters(partial: Partial<Filters>): void {
    this.state.filters = { ...this.state.filters, ...partial };
    this.emit();
  }

  resetFilters(): void {
    this.state.filters = defaultFilters();
    this.emit();
  }

  setChequeFilters(scope: ChequeFilterScope, partial: Partial<ChequeFilters>): void {
    this.state.chequeFilters = {
      ...this.state.chequeFilters,
      [scope]: { ...this.state.chequeFilters[scope], ...partial },
    };
    this.emit();
  }

  resetChequeFilters(scope: ChequeFilterScope): void {
    this.state.chequeFilters = { ...this.state.chequeFilters, [scope]: defaultChequeFilters() };
    this.emit();
  }

  setMonthlyFilter(month: string): void {
    this.state.monthlyFilter = month;
    this.emit();
  }

  setManualLoanEntry(category: string, date: string, amount: number | null): void {
    const byDate = { ...(this.state.manualLoanEntries[category] ?? {}) };
    if (amount === null || amount === 0) delete byDate[date];
    else byDate[date] = amount;
    this.state.manualLoanEntries = { ...this.state.manualLoanEntries, [category]: byDate };
    saveManualLoanEntries(this.state.manualLoanEntries);
    this.emit();
  }

  addManualPago(concepto: string, monto: number, fecha: string): void {
    const pago: ManualPago = {
      id: `pago-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      concepto,
      monto,
      fecha,
      estado: 'pendiente',
    };
    this.state.manualPagos = [...this.state.manualPagos, pago];
    saveManualPagos(this.state.manualPagos);
    this.emit();
  }

  updateManualPago(id: string, partial: Partial<Pick<ManualPago, 'concepto' | 'monto' | 'fecha' | 'estado'>>): void {
    this.state.manualPagos = this.state.manualPagos.map((p) => (p.id === id ? { ...p, ...partial } : p));
    saveManualPagos(this.state.manualPagos);
    this.emit();
  }

  removeManualPago(id: string): void {
    this.state.manualPagos = this.state.manualPagos.filter((p) => p.id !== id);
    saveManualPagos(this.state.manualPagos);
    this.emit();
  }

  addManualRecaudo(concepto: string, monto: number, fecha: string): void {
    const recaudo: ManualRecaudo = {
      id: `recaudo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      concepto,
      monto,
      fecha,
      estado: 'pendiente',
    };
    this.state.manualRecaudos = [...this.state.manualRecaudos, recaudo];
    saveManualRecaudos(this.state.manualRecaudos);
    this.emit();
  }

  updateManualRecaudo(id: string, partial: Partial<Pick<ManualRecaudo, 'concepto' | 'monto' | 'fecha' | 'estado'>>): void {
    this.state.manualRecaudos = this.state.manualRecaudos.map((r) => (r.id === id ? { ...r, ...partial } : r));
    saveManualRecaudos(this.state.manualRecaudos);
    this.emit();
  }

  removeManualRecaudo(id: string): void {
    this.state.manualRecaudos = this.state.manualRecaudos.filter((r) => r.id !== id);
    saveManualRecaudos(this.state.manualRecaudos);
    this.emit();
  }
}

export const store = new Store();
export type { State };
