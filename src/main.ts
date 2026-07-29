import './style.css';
import { store } from './state/store';
import { syncFromDrive } from './data/sync';
import { isGoogleAuthConfigured } from './auth/googleAuth';
import { applyFilters, buildAlerts, buildDailyProjection, buildWeeklyBuckets, computeKpis, totalBankBalance } from './data/engine';
import { renderHeader, renderTabs, type TabId } from './ui/shell';
import { renderKpiCards } from './ui/kpiCards';
import { renderDailyTable, renderWeeklyTable } from './ui/tables';
import { renderCharts } from './ui/charts';
import { renderAlerts } from './ui/alerts';
import { renderFilters } from './ui/filters';
import { renderBankPanel } from './ui/bankPanel';
import { renderEmptyState, renderWarningsBanner } from './ui/emptyState';
import { h, mount } from './ui/dom';
import { daysBetween } from './utils/dates';
import { loadDemoData } from './demo/loadDemo';

const app = document.getElementById('app')!;
let activeTab: TabId = 'resumen';

function setTab(id: TabId): void {
  activeTab = id;
  render();
}

function render(): void {
  const state = store.get();
  const googleConfigured = isGoogleAuthConfigured();

  mount(app, h('div', { class: 'flex flex-col min-h-screen' }));
  const root = app.firstElementChild as HTMLElement;

  root.appendChild(
    renderHeader({
      status: state.syncStatus,
      lastSync: state.dataset?.loadedAt ?? null,
      onSync: () => void syncFromDrive(),
      googleConfigured,
      isDemo: state.isDemo,
      onExitDemo: () => store.exitDemo(),
    })
  );

  if (!state.dataset) {
    root.appendChild(
      renderEmptyState(state.syncStatus, state.syncError, () => void syncFromDrive(), googleConfigured, loadDemoData)
    );
    return;
  }

  root.appendChild(renderTabs(activeTab, setTab));

  const main = h('main', { class: 'flex-1 px-6 py-6 flex flex-col gap-5 max-w-[1600px] w-full mx-auto' });
  root.appendChild(main);

  const { dataset, bankAccounts, filters } = state;
  const openingBalance = totalBankBalance(bankAccounts);
  const filtered = applyFilters(dataset.events, filters);
  const days = Math.max(1, daysBetween(filters.dateFrom, filters.dateTo) + 1);
  const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, days);
  const weekly = buildWeeklyBuckets(daily);
  const kpis = computeKpis(daily, openingBalance);
  const alerts = buildAlerts(daily, filtered);

  const warningsBanner = renderWarningsBanner(dataset.warnings);
  if (warningsBanner && activeTab === 'resumen') main.appendChild(warningsBanner);

  if (activeTab !== 'bancos') {
    main.appendChild(renderFilters(dataset.events, filters));
  }

  if (activeTab === 'resumen') {
    main.appendChild(renderKpiCards(kpis));
    main.appendChild(
      h('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-5' }, [
        h('div', { class: 'lg:col-span-2' }, [renderDailyTable(daily.slice(0, 10))]),
        renderAlerts(alerts.slice(0, 5)),
      ])
    );
  } else if (activeTab === 'diario') {
    main.appendChild(renderKpiCards(kpis));
    main.appendChild(renderDailyTable(daily));
  } else if (activeTab === 'semanal') {
    main.appendChild(renderKpiCards(kpis));
    main.appendChild(renderWeeklyTable(weekly));
  } else if (activeTab === 'graficos') {
    const chartsContainer = h('div');
    main.appendChild(chartsContainer);
    renderCharts(chartsContainer, daily, weekly, filtered);
  } else if (activeTab === 'bancos') {
    main.appendChild(h('div', { class: 'max-w-2xl' }, [renderBankPanel(bankAccounts)]));
  } else if (activeTab === 'alertas') {
    main.appendChild(renderAlerts(alerts));
  }

  const footer = h('footer', { class: 'px-6 py-4 text-xs text-center', style: 'color:var(--ink-muted)' }, [
    'Transcomerinter Cía. Ltda. · Módulo de Tesorería · Datos desde Google Drive (solo lectura) · Saldos bancarios ingresados manualmente, válidos solo para esta sesión.',
  ]);
  root.appendChild(footer);
}

store.subscribe(render);
render();
