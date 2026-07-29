import { store } from '../state/store';
import { buildDemoBankAccounts, buildDemoEvents } from './mockData';

export function loadDemoData(): void {
  const { events, warnings } = buildDemoEvents();
  const included = events.filter((e) => !e.excluded);
  const excluded = events.filter((e) => e.excluded);
  store.setDataset(included, excluded, warnings, true);
  for (const acc of buildDemoBankAccounts()) {
    store.setBankBalance(acc.id, acc.balance);
  }
}
