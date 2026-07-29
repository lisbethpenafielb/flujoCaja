import './style.css';
import { store } from './state/store';
import { syncFromDrive } from './data/sync';
import { isGoogleAuthConfigured } from './auth/googleAuth';
import {
  applyChequeFilters,
  applyFilters,
  buildAlerts,
  buildChequesPivot,
  buildChequeVendorPivot,
  buildDailyProjection,
  buildDayPeriods,
  buildManualLoanEvents,
  buildTreasuryMatrix,
  buildWeekPeriods,
  chequesRezagados,
  computeKpis,
  totalBankBalance,
} from './data/engine';
import { renderHeader, renderTabs, type TabId } from './ui/shell';
import { renderKpiCards } from './ui/kpiCards';
import { renderTreasuryMatrix } from './ui/treasuryMatrix';
import { renderChequeVendorPivot } from './ui/chequeVendorPivot';
import { renderChequesPivot } from './ui/chequesPivotTable';
import { renderChequeFilterBar } from './ui/chequeFilterBar';
import { renderAlerts } from './ui/alerts';
import { renderFilters } from './ui/filters';
import { renderBankPanel } from './ui/bankPanel';
import { renderEmptyState, renderWarningsBanner } from './ui/emptyState';
import { h, mount } from './ui/dom';
import { daysBetween, todayISO } from './utils/dates';
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

  const main = h('main', { class: 'flex-1 px-6 py-6 flex flex-col gap-5 max-w-[1700px] w-full mx-auto' });
  root.appendChild(main);

  const { dataset, bankAccounts, filters, chequeFilters, manualLoanEntries } = state;
  const openingBalance = totalBankBalance(bankAccounts);
  // Préstamo Perú / Préstamos Terceros no vienen de ningún Excel: se digitan a
  // mano y se mezclan aquí como eventos más, para que KPIs/alertas/matriz los
  // reflejen igual que un cheque real. Nunca se mezclan en las pestañas de
  // cheques (esas son, por definición, solo lo que trae BASE CHEQUES).
  const eventsWithManual = [...dataset.events, ...buildManualLoanEvents(manualLoanEntries)];
  const filtered = applyFilters(eventsWithManual, filters);
  const projectionDays = Math.max(1, daysBetween(filters.dateFrom, filters.dateTo) + 1);

  const warningsBanner = renderWarningsBanner(dataset.warnings);
  if (warningsBanner && activeTab === 'resumen') main.appendChild(warningsBanner);

  const CHEQUE_TABS: TabId[] = ['rezagados', 'chequesDiarios', 'tablaCheques'];
  if (activeTab !== 'bancos' && !CHEQUE_TABS.includes(activeTab)) {
    main.appendChild(renderFilters(dataset.events, filters));
  }

  if (activeTab === 'resumen') {
    const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, projectionDays);
    const kpis = computeKpis(daily, openingBalance);
    const alerts = buildAlerts(daily, filtered);
    main.appendChild(renderKpiCards(kpis));
    main.appendChild(renderAlerts(alerts));
  } else if (activeTab === 'diario') {
    const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, projectionDays);
    const kpis = computeKpis(daily, openingBalance);
    main.appendChild(renderKpiCards(kpis, { compact: true }));
    // Sin límite inferior de fecha: los eventos anteriores a "Desde" deben
    // seguir disponibles para poder caer en la columna REZAGADOS (backlog).
    const forMatrix = applyFilters(eventsWithManual, { ...filters, dateFrom: '' });
    const periods = buildDayPeriods(filters.dateFrom, filters.dateTo);
    const matrix = buildTreasuryMatrix(forMatrix, bankAccounts, periods);
    main.appendChild(
      renderTreasuryMatrix(matrix, 'Flujo de Caja Diario', 'Bancos + movimientos por día, con arrastre de saldo', {
        onManualEdit: (category, date, value) => store.setManualLoanEntry(category, date, value),
      })
    );
  } else if (activeTab === 'semanal') {
    const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, projectionDays);
    const kpis = computeKpis(daily, openingBalance);
    main.appendChild(renderKpiCards(kpis, { compact: true }));
    const forMatrix = applyFilters(eventsWithManual, { ...filters, dateFrom: '' });
    const periods = buildWeekPeriods(filters.dateFrom, filters.dateTo);
    const matrix = buildTreasuryMatrix(forMatrix, bankAccounts, periods);
    main.appendChild(renderTreasuryMatrix(matrix, 'Flujo de Caja Semanal', 'Bancos + movimientos por semana, con arrastre de saldo'));
  } else if (activeTab === 'rezagados') {
    const allCheques = dataset.events.filter((e) => e.kind === 'cheque');
    const baseRezagados = chequesRezagados(allCheques, todayISO());
    const shown = applyChequeFilters(baseRezagados, chequeFilters.rezagados);
    main.appendChild(renderChequeFilterBar('rezagados', baseRezagados, chequeFilters.rezagados, ['estado', 'banco', 'estatus2', 'negociacion']));
    main.appendChild(
      renderChequeVendorPivot(buildChequeVendorPivot(shown), {
        title: 'Cheques Rezagados',
        subtitle: `Cheques con fecha anterior a hoy (${todayISO()}) aún no cobrados`,
        emptyLabel: 'No hay cheques rezagados con los filtros seleccionados.',
      })
    );
  } else if (activeTab === 'chequesDiarios') {
    const allCheques = dataset.events.filter((e) => e.kind === 'cheque').sort((a, b) => (a.date < b.date ? -1 : 1));
    const shown = applyChequeFilters(allCheques, chequeFilters.diarios);
    main.appendChild(
      renderChequeFilterBar('diarios', allCheques, chequeFilters.diarios, ['estado', 'mes', 'banco', 'negociacion', 'anio', 'semana'])
    );
    main.appendChild(
      renderChequeVendorPivot(buildChequeVendorPivot(shown), {
        title: 'Cheques Diarios',
        subtitle: 'Todos los cheques',
        emptyLabel: 'No hay cheques con los filtros seleccionados.',
      })
    );
  } else if (activeTab === 'tablaCheques') {
    const allCheques = dataset.events.filter((e) => e.kind === 'cheque');
    const shown = applyChequeFilters(allCheques, chequeFilters.tabla);
    main.appendChild(renderChequeFilterBar('tabla', allCheques, chequeFilters.tabla, ['estado', 'banco', 'negociacion', 'semana']));
    main.appendChild(renderChequesPivot(buildChequesPivot(shown)));
  } else if (activeTab === 'bancos') {
    main.appendChild(h('div', { class: 'max-w-2xl' }, [renderBankPanel(bankAccounts)]));
  } else if (activeTab === 'alertas') {
    const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, projectionDays);
    main.appendChild(renderAlerts(buildAlerts(daily, filtered)));
  }

  const footer = h('footer', { class: 'px-6 py-4 text-xs text-center', style: 'color:var(--ink-muted)' }, [
    'Transcomerinter Cía. Ltda. · Módulo de Tesorería · Datos desde Google Drive (solo lectura) · Saldos bancarios ingresados manualmente, válidos solo para esta sesión.',
  ]);
  root.appendChild(footer);
}

store.subscribe(render);
render();
