import type { BankAccount } from '../types';
import { DEFAULT_BANK_ACCOUNTS } from '../config';

// EXCEPCIÓN explícita del módulo: los saldos bancarios NO vienen de ningún Excel.
// Tesorería los ingresa manualmente y solo viven durante la sesión del navegador
// (sessionStorage se borra al cerrar la pestaña/navegador — nunca se persiste en
// disco, base de datos ni se sincroniza con Drive).
const STORAGE_KEY = 'flujocaja.saldosBancarios.v1';

export function loadBankAccounts(): BankAccount[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as BankAccount[];
      // Reconcilia con la lista de cuentas configurada, por si cambió el catálogo.
      return DEFAULT_BANK_ACCOUNTS.map((def) => {
        const match = saved.find((s) => s.id === def.id);
        return { ...def, balance: match?.balance ?? null };
      });
    }
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte de cero.
  }
  return DEFAULT_BANK_ACCOUNTS.map((a) => ({ ...a, balance: null }));
}

export function saveBankAccounts(accounts: BankAccount[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
