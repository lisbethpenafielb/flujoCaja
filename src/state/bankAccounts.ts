import type { BankAccount } from '../types';
import { DEFAULT_BANK_ACCOUNTS } from '../config';
import { loadJson, saveJson } from './sessionStorageJson';

// EXCEPCIÓN explícita del módulo: los saldos bancarios NO vienen de ningún Excel.
// Tesorería los ingresa manualmente y solo viven durante la sesión del navegador
// (sessionStorage se borra al cerrar la pestaña/navegador — nunca se persiste en
// disco, base de datos ni se sincroniza con Drive).
const STORAGE_KEY = 'flujocaja.saldosBancarios.v1';

export function loadBankAccounts(): BankAccount[] {
  const saved = loadJson<BankAccount[] | null>(STORAGE_KEY, null);
  // Reconcilia con la lista de cuentas configurada, por si cambió el catálogo.
  return DEFAULT_BANK_ACCOUNTS.map((def) => {
    const match = saved?.find((s) => s.id === def.id);
    return { ...def, balance: match?.balance ?? null };
  });
}

export function saveBankAccounts(accounts: BankAccount[]): void {
  saveJson(STORAGE_KEY, accounts);
}
