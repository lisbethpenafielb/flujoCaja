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
  buildManualPagoEvents,
  buildManualRecaudoEvents,
  buildRezagadosPivot,
  buildTreasuryMatrix,
  buildWeekPeriods,
  chequesRezagados,
  computeKpis,
  filterByExcelEstado,
  totalBankBalance,
} from './data/engine';
import { buildExecutiveSummary, coverageRatio, deficitMagnitude } from './data/derived';
import { buildFirstDeficitForecast, buildHorizonForecasts } from './data/forecast';
import { renderHeader, renderTabs, type TabId } from './ui/shell';
import { computeTrend, renderKpiCards } from './ui/kpiCards';
import { renderRiskCard } from './ui/riskCard';
import { renderExecutiveSummary } from './ui/executiveSummary';
import { renderForecastPanel } from './ui/forecastPanel';
import { renderPaymentCoverageCard } from './ui/paymentCoverageCard';
import { renderIncomeVsExpenseCard } from './ui/incomeExpenseCard';
import { renderDashboardChart } from './ui/dashboardChart';
import { renderTreasuryMatrix } from './ui/treasuryMatrix';
import { renderWeeklySummaryCards } from './ui/weeklySummaryCards';
import { renderRezagadosPivot } from './ui/rezagadosPivot';
import { renderChequeVendorPivot } from './ui/chequeVendorPivot';
import { renderChequesPivot } from './ui/chequesPivotTable';
import { renderChequeFilterBar } from './ui/chequeFilterBar';
import { renderAlerts } from './ui/alerts';
import { renderFilters, renderMonthFilter } from './ui/filters';
import { renderPagosPanel } from './ui/pagosPanel';
import { renderRecaudoPanel } from './ui/recaudoPanel';
import { renderConfigPanel } from './ui/configPanel';
import { renderEmptyState, renderWarningsBanner } from './ui/emptyState';
import { h, mount } from './ui/dom';
import { BRAND } from './ui/palette';
import { addDays, daysBetween, monthBounds, monthKeyLabelEs, todayISO } from './utils/dates';
import { loadDemoData } from './demo/loadDemo';

const app = document.getElementById('app')!;
let activeTab: TabId = 'resumen';

function setTab(id: TabId): void {
  activeTab = id;
  renderSafe();
}

function renderErrorScreen(err: unknown): void {
  console.error('Error al renderizar el módulo de Tesorería:', err);
  const message = err instanceof Error ? err.message : String(err);
  mount(
    app,
    h('div', { class: 'flex flex-col items-center justify-center gap-3 text-center px-6', style: 'min-height:100vh' }, [
      h('h1', { style: 'font-size:18px;font-weight:600;color:var(--ink-primary)' }, ['Ocurrió un error inesperado']),
      h('p', { class: 'text-sm max-w-md', style: 'color:var(--ink-muted)' }, [
        'El módulo de Tesorería no pudo mostrar esta pantalla. Recargar la página suele resolverlo; si el error persiste, avisa a sistemas con este detalle:',
      ]),
      h('code', { class: 'text-xs px-3 py-2 rounded max-w-lg', style: 'background:var(--page);color:#a3271f;word-break:break-word' }, [message]),
      h(
        'button',
        {
          class: 'text-sm font-medium rounded-lg px-4 py-2 mt-2',
          style: `background:${BRAND.primary};color:#fff`,
          onclick: () => window.location.reload(),
        },
        ['Recargar']
      ),
    ])
  );
}

/** Envuelve render() para que un error en cualquier pestaña muestre un mensaje
 *  legible en vez de dejar la pantalla en blanco sin explicación. */
function renderSafe(): void {
  try {
    render();
  } catch (err) {
    renderErrorScreen(err);
  }
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

  const { dataset, bankAccounts, filters, chequeFilters, manualLoanEntries, manualPagos, manualRecaudos, excelEstados, monthlyFilter } = state;
  const openingBalance = totalBankBalance(bankAccounts);
  // Préstamo Perú / Préstamos Terceros, los Pagos manuales y el Recaudo
  // manual no vienen de ningún Excel: se digitan a mano y se mezclan aquí
  // como eventos más, para que KPIs/alertas/matriz los reflejen igual que un
  // cheque real. Nunca se mezclan en las pestañas de cheques (esas son, por
  // definición, solo lo que trae BASE CHEQUES). Los renglones de Excel
  // (Pagos Fijos / Proyección de Cartera) marcados a mano como "pagado" se
  // excluyen aquí, antes de que alimenten el Flujo/KPIs/alertas.
  const eventsWithManual = [
    ...filterByExcelEstado(dataset.events, excelEstados),
    ...buildManualLoanEvents(manualLoanEntries),
    ...buildManualPagoEvents(manualPagos),
    ...buildManualRecaudoEvents(manualRecaudos),
  ];
  const filtered = applyFilters(eventsWithManual, filters);
  const projectionDays = Math.max(1, daysBetween(filters.dateFrom, filters.dateTo) + 1);

  const warningsBanner = renderWarningsBanner(dataset.warnings);
  if (warningsBanner && activeTab === 'resumen') main.appendChild(warningsBanner);

  const CHEQUE_TABS: TabId[] = ['cheques', 'tablaCheques'];
  const NO_FILTER_TABS: TabId[] = ['recaudo', 'pagos', 'configuracion', 'mensual'];
  if (!NO_FILTER_TABS.includes(activeTab) && !CHEQUE_TABS.includes(activeTab)) {
    main.appendChild(renderFilters(dataset.events, filters));
  }
  if (activeTab === 'mensual') {
    main.appendChild(renderMonthFilter(monthlyFilter));
  }

  if (activeTab === 'resumen') {
    const daily = buildDailyProjection(filtered, openingBalance, filters.dateFrom, projectionDays);
    const kpis = computeKpis(daily, openingBalance);
    const alerts = buildAlerts(daily, filtered);
    const negativeDays = daily.filter((d) => d.closingBalance < 0).length;

    // Comparación contra el período previo de igual longitud: se reutiliza
    // buildDailyProjection/computeKpis tal cual (misma lógica, sin tocar
    // engine.ts), solo con una ventana de fechas distinta. Todo lo que no
    // varía con la fecha (ej. saldo bancario manual) queda igual en ambas
    // corridas, así que ahí no se muestra un porcentaje inventado.
    const forComparison = applyFilters(eventsWithManual, { ...filters, dateFrom: '', dateTo: '' });
    const previousStart = addDays(filters.dateFrom, -projectionDays);
    const previousDaily = buildDailyProjection(forComparison, openingBalance, previousStart, projectionDays);
    const previousKpis = computeKpis(previousDaily, openingBalance);
    const cobranzaTrend = computeTrend(kpis.cobranzaEsperada, previousKpis.cobranzaEsperada, 'vs período anterior', 'up');
    const chequesTrend = computeTrend(kpis.chequesProgramados, previousKpis.chequesProgramados, 'vs período anterior', 'down');
    const pagosFijosTrend = computeTrend(kpis.pagosFijos, previousKpis.pagosFijos, 'vs período anterior', 'down');
    const saldoNetoTrend = computeTrend(kpis.saldoNetoProyectado, previousKpis.saldoNetoProyectado, 'vs período anterior', 'up');
    // Mismo universo de cheques que ya contribuyó a kpis.chequesProgramados
    // (DailyBucket.events ya viene filtrado por buildDailyProjection).
    const chequesPendientes = daily.reduce((n, d) => n + d.events.filter((e) => e.kind === 'cheque').length, 0);

    main.appendChild(renderExecutiveSummary(buildExecutiveSummary(kpis, daily)));
    // KPIs en columna angosta a la izquierda + gráfico principal a la
    // derecha — mismo contenido que antes, solo reordenado para que las
    // tarjetas no dominen el ancho completo y el gráfico gane protagonismo.
    main.appendChild(
      h('div', { class: 'grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 items-stretch' }, [
        h('div', {}, [
          renderKpiCards(kpis, { extras: { cobranzaTrend, chequesTrend, pagosFijosTrend, saldoNetoTrend, chequesPendientes } }),
        ]),
        h('div', { class: 'card p-5 flex flex-col' }, [
          h('div', { class: 'mb-4' }, [
            h('h3', { class: 'font-semibold', style: 'font-size:15px;color:var(--ink-primary)' }, ['Evolución Proyectada del Flujo de Caja']),
            h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [`Próximos ${projectionDays} días, saldo de cierre diario`]),
          ]),
          h('div', { class: 'flex-1 flex flex-col justify-start' }, [renderDashboardChart(daily)]),
        ]),
      ])
    );
    main.appendChild(renderRiskCard(kpis, negativeDays));
    main.appendChild(
      h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' }, [
        renderIncomeVsExpenseCard(daily),
        renderPaymentCoverageCard(coverageRatio(daily)),
      ])
    );
    main.appendChild(
      renderAlerts(alerts, { compact: true, horizontal: true, title: 'Alertas prioritarias', deficitAmount: deficitMagnitude(daily) })
    );

    // Pronósticos: siempre desde hoy y a horizontes fijos (0/7/15/30/60/90
    // días), deliberadamente independientes del filtro Desde/Hasta de
    // arriba — es una vista estructural, no una que se recorta con fechas.
    const forecastDaily90 = buildDailyProjection(eventsWithManual, openingBalance, todayISO(), 90);
    main.appendChild(
      renderForecastPanel(
        buildHorizonForecasts(eventsWithManual, openingBalance),
        buildFirstDeficitForecast(forecastDaily90)
      )
    );
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
        onBankBalanceEdit: (id, value) => store.setBankBalance(id, value),
      })
    );
  } else if (activeTab === 'mensual') {
    // Deliberadamente desacoplado de `filters` (Flujo Diario): el único
    // filtro aquí es el mes calendario elegido en `monthlyFilter`, así que
    // se recalcula todo (KPIs, tarjetas semanales, matriz) desde cero con
    // ese rango — nunca se mezcla con dateFrom/dateTo de otra pestaña.
    const { start: monthStart, end: monthEnd } = monthBounds(monthlyFilter);
    const daysInMonth = daysBetween(monthStart, monthEnd) + 1;
    const monthlyDaily = buildDailyProjection(eventsWithManual, openingBalance, monthStart, daysInMonth);
    const monthlyKpis = computeKpis(monthlyDaily, openingBalance);
    main.appendChild(renderKpiCards(monthlyKpis, { compact: true }));
    const periods = buildWeekPeriods(monthStart, monthEnd);
    main.appendChild(renderWeeklySummaryCards(monthlyDaily, periods));
    const matrix = buildTreasuryMatrix(eventsWithManual, bankAccounts, periods);
    main.appendChild(
      renderTreasuryMatrix(matrix, 'Flujo de Caja Mensual', `Semanas de ${monthKeyLabelEs(monthlyFilter)}, con arrastre de saldo`, {
        onBankBalanceEdit: (id, value) => store.setBankBalance(id, value),
      })
    );
  } else if (activeTab === 'cheques') {
    const allCheques = dataset.events.filter((e) => e.kind === 'cheque');

    const baseRezagados = chequesRezagados(allCheques, todayISO());
    const shownRezagados = applyChequeFilters(baseRezagados, chequeFilters.rezagados);
    main.appendChild(renderChequeFilterBar('rezagados', baseRezagados, chequeFilters.rezagados, ['estado', 'banco', 'estatus2', 'negociacion']));
    main.appendChild(
      renderRezagadosPivot(buildRezagadosPivot(shownRezagados), {
        subtitle: `Cheques con fecha anterior a hoy (${todayISO()}) aún no cobrados`,
        emptyLabel: 'No hay cheques rezagados con los filtros seleccionados.',
      })
    );

    const allChequesSorted = [...allCheques].sort((a, b) => (a.date < b.date ? -1 : 1));
    const shownDiarios = applyChequeFilters(allChequesSorted, chequeFilters.diarios);
    main.appendChild(
      renderChequeFilterBar('diarios', allChequesSorted, chequeFilters.diarios, [
        'estado',
        'banco',
        'fechaInicio',
        'fechaFin',
        'mes',
        'anio',
        'negociacion',
      ])
    );
    main.appendChild(
      renderChequeVendorPivot(buildChequeVendorPivot(shownDiarios), {
        title: 'Cheques Diarios',
        subtitle: 'Todos los cheques — usa Desde/Hasta para revisar, por ejemplo, la semana',
        emptyLabel: 'No hay cheques con los filtros seleccionados.',
      })
    );
  } else if (activeTab === 'tablaCheques') {
    const allCheques = dataset.events.filter((e) => e.kind === 'cheque');
    const shown = applyChequeFilters(allCheques, chequeFilters.tabla);
    main.appendChild(renderChequeFilterBar('tabla', allCheques, chequeFilters.tabla, ['estado', 'banco', 'negociacion']));
    main.appendChild(renderChequesPivot(buildChequesPivot(shown)));
  } else if (activeTab === 'recaudo') {
    const excelRecaudo = dataset.events.filter((e) => e.kind === 'cobranza' && e.source === 'PROYECCION DE CARTERA');
    main.appendChild(renderRecaudoPanel(manualRecaudos, excelRecaudo, excelEstados));
  } else if (activeTab === 'pagos') {
    const excelPagosFijos = dataset.events.filter((e) => e.kind === 'pago_fijo' && e.source === 'PAGOS FIJOS');
    main.appendChild(renderPagosPanel(manualPagos, excelPagosFijos, excelEstados));
  } else if (activeTab === 'configuracion') {
    main.appendChild(renderConfigPanel());
  }

  const footer = h('footer', { class: 'px-6 py-4 text-xs text-center', style: 'color:var(--ink-muted)' }, [
    'Transcomerinter Cía. Ltda. · Módulo de Tesorería · Datos desde Google Drive (solo lectura) · Saldos bancarios ingresados manualmente, válidos solo para esta sesión.',
  ]);
  root.appendChild(footer);
}

store.subscribe(renderSafe);
renderSafe();
