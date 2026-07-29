import type { BankAccount } from '../types';
import { store } from '../state/store';
import { formatMoney } from '../utils/format';
import { h } from './dom';
import { icon } from './icons';
import { BRAND } from './palette';

function accountRow(account: BankAccount): HTMLElement {
  const input = h('input', {
    type: 'number',
    step: '0.01',
    placeholder: '0.00',
    value: account.balance === null ? '' : String(account.balance),
    class: 'text-sm rounded-lg px-3 py-2 outline-none tabular-nums text-right w-full',
    style: 'border:1px solid var(--gridline);background:var(--page);color:var(--ink-primary)',
    oninput: (e: Event) => {
      const raw = (e.target as HTMLInputElement).value;
      const num = raw === '' ? null : Number(raw);
      store.setBankBalance(account.id, num !== null && isFinite(num) ? num : null);
    },
  }) as HTMLInputElement;

  return h('div', { class: 'flex items-center gap-3 py-3 px-1' }, [
    h('span', {
      class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
      style: `width:34px;height:34px;background:${BRAND.primary}14;color:${BRAND.primary}`,
    }, [icon('bank', { size: 16 })]),
    h('div', { class: 'flex-1 min-w-0' }, [
      h('p', { class: 'text-sm font-semibold truncate', style: 'color:var(--ink-primary)' }, [account.name]),
      h('p', { class: 'text-xs truncate', style: 'color:var(--ink-muted)' }, [account.bankName]),
    ]),
    h('div', { style: 'width:150px' }, [input]),
  ]);
}

export function renderBankPanel(accounts: BankAccount[]): HTMLElement {
  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const pending = accounts.filter((a) => a.balance === null).length;

  return h('div', { class: 'card p-5 flex flex-col gap-1' }, [
    h('div', { class: 'flex items-center justify-between mb-2' }, [
      h('div', {}, [
        h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Saldos Bancarios']),
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [
          'Ingreso manual · solo vive durante esta sesión · no proviene de Excel',
        ]),
      ]),
      h('div', { class: 'text-right' }, [
        h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, ['Total Disponible']),
        h('p', { class: 'font-semibold tabular-nums', style: `font-size:18px;color:${BRAND.primary}` }, [formatMoney(total)]),
      ]),
    ]),
    pending > 0
      ? h('p', { class: 'text-xs mb-1', style: 'color:#8a6200' }, [
          `${pending} de ${accounts.length} cuentas sin saldo ingresado — se asumen en $0 en los cálculos.`,
        ])
      : null,
    h('div', { class: 'divide-y overflow-auto scrollbar-thin', style: 'border-color:var(--gridline);max-height:420px' }, [
      ...accounts.map(accountRow),
    ]),
  ]);
}
