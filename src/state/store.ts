import type { BankAccount, CashEvent, Filters, LoadedDataset } from '../types';
import { loadBankAccounts, saveBankAccounts } from './bankAccounts';
import { todayISO, addDays } from '../utils/dates';

export type SyncStatus = 'idle' | 'authenticating' | 'loading' | 'ready' | 'error';

interface State {
  bankAccounts: BankAccount[];
  dataset: LoadedDataset | null;
  filters: Filters;
  syncStatus: SyncStatus;
  syncError: string | null;
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

class Store {
  private state: State = {
    bankAccounts: loadBankAccounts(),
    dataset: null,
    filters: defaultFilters(),
    syncStatus: 'idle',
    syncError: null,
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

  setDataset(events: CashEvent[], excludedEvents: CashEvent[], warnings: string[]): void {
    this.state.dataset = { events, excludedEvents, loadedAt: new Date(), warnings };
    this.state.syncStatus = 'ready';
    this.state.syncError = null;
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
}

export const store = new Store();
export type { State };
