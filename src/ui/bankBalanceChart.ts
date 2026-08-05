import type { BankAccount } from '../types';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { BRAND } from './palette';

/** Distribución del saldo consolidado por banco — lectura, sin edición
 *  (para editar un saldo se usa la columna Rezagados del Flujo de Caja). */
export function renderBankBalanceDistribution(accounts: BankAccount[]): HTMLElement {
  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const rows = [...accounts]
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .map((a) => {
      const balance = a.balance ?? 0;
      const pct = total > 0 ? Math.max(0, (balance / total) * 100) : 0;
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('div', { class: 'flex items-center justify-between text-xs' }, [
          h('span', { style: 'color:var(--ink-secondary)' }, [a.name]),
          h('span', { class: 'tabular-nums font-semibold', style: 'color:var(--ink-primary)' }, [formatMoney(balance)]),
        ]),
        h('div', { class: 'rounded-full overflow-hidden', style: 'height:6px;background:var(--page)' }, [
          h('div', { class: 'h-full rounded-full', style: `width:${pct}%;background:${BRAND.primary};transition:width 400ms ease` }),
        ]),
      ]);
    });

  return h('div', { class: 'card card-hover p-5 flex flex-col gap-3 animate-fade-in' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:14px;color:var(--ink-primary)' }, ['Distribución por Banco']),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Saldo consolidado por cuenta']),
    ]),
    h('div', { class: 'flex flex-col gap-3' }, rows),
  ]);
}
