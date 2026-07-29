import { Chart, type ChartConfiguration } from 'chart.js/auto';
import type { CashEvent, DailyBucket, WeeklyBucket } from '../types';
import { formatDateShortEs, todayISO, addDays } from '../utils/dates';
import { formatMoneyCompact } from '../utils/format';
import { CATEGORICAL, FLOW_COLORS, INK, STATUS } from './palette';
import { h } from './dom';

const charts: Chart[] = [];

function destroyAll(): void {
  while (charts.length) charts.pop()?.destroy();
}

function baseFont() {
  return { family: 'system-ui, -apple-system, "Segoe UI", sans-serif' };
}

function chartCard(title: string, sub: string, canvasId: string, height = 260): { el: HTMLElement; canvas: HTMLCanvasElement } {
  const canvas = h('canvas', { id: canvasId }) as HTMLCanvasElement;
  const el = h('div', { class: 'card p-5 flex flex-col gap-3' }, [
    h('div', {}, [
      h('h3', { class: 'font-semibold', style: 'font-size:15px' }, [title]),
      h('p', { class: 'text-xs', style: 'color:var(--ink-muted)' }, [sub]),
    ]),
    h('div', { style: `height:${height}px` }, [canvas]),
  ]);
  return { el, canvas };
}

function gridOpts() {
  return { color: INK.gridline, drawTicks: false };
}

export function renderCharts(container: HTMLElement, daily: DailyBucket[], weekly: WeeklyBucket[], events: CashEvent[]): void {
  destroyAll();
  container.innerHTML = '';

  const grid = h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4' });
  container.appendChild(grid);

  // 1. Evolución del saldo diario
  {
    const { el, canvas } = chartCard('Evolución del Saldo Diario', 'Saldo proyectado día a día (30 días)', 'chart-saldo');
    grid.appendChild(el);
    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        labels: daily.map((d) => formatDateShortEs(d.date)),
        datasets: [
          {
            label: 'Saldo final',
            data: daily.map((d) => d.closingBalance),
            borderColor: FLOW_COLORS.cobranza,
            backgroundColor: 'rgba(42,120,214,0.10)',
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
        scales: {
          x: { grid: { display: false }, ticks: { font: baseFont(), color: INK.muted, maxRotation: 0, autoSkip: true } },
          y: {
            grid: gridOpts(),
            ticks: { font: baseFont(), color: INK.muted, callback: (v) => formatMoneyCompact(Number(v)) },
          },
        },
      },
    };
    charts.push(new Chart(canvas, cfg));
  }

  // 2. Cobranza vs Cheques (semanal)
  {
    const { el, canvas } = chartCard('Cobranza vs. Cheques', 'Comparación semanal', 'chart-cobranza-cheques');
    grid.appendChild(el);
    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: weekly.map((w) => w.label),
        datasets: [
          { label: 'Cobranza', data: weekly.map((w) => w.cobranza), backgroundColor: FLOW_COLORS.cobranza, borderRadius: 4 },
          { label: 'Cheques', data: weekly.map((w) => w.cheques), backgroundColor: FLOW_COLORS.cheques, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: baseFont(), color: INK.secondary, usePointStyle: true } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: baseFont(), color: INK.muted } },
          y: { grid: gridOpts(), ticks: { font: baseFont(), color: INK.muted, callback: (v) => formatMoneyCompact(Number(v)) } },
        },
      },
    };
    charts.push(new Chart(canvas, cfg));
  }

  // 3. Distribución de pagos por categoría
  {
    const { el, canvas } = chartCard('Distribución de Pagos por Categoría', 'Cheques + pagos fijos, 30 días', 'chart-categoria');
    grid.appendChild(el);
    const outflow = events.filter((e) => !e.excluded && (e.kind === 'cheque' || e.kind === 'pago_fijo'));
    const byCategory = new Map<string, number>();
    for (const e of outflow) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7).reduce((s, [, v]) => s + v, 0);
    const labels = top.map(([k]) => k);
    const data = top.map(([, v]) => v);
    if (rest > 0) {
      labels.push('Otros');
      data.push(rest);
    }
    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: CATEGORICAL, borderColor: '#fcfcfb', borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'right', labels: { font: baseFont(), color: INK.secondary, boxWidth: 10, usePointStyle: true } } },
      },
    };
    charts.push(new Chart(canvas, cfg));
  }

  // 4. Cheques próximos a vencer
  {
    const { el, canvas } = chartCard('Cheques Próximos a Vencer', 'Los 10 de mayor valor en los próximos 14 días', 'chart-cheques-vencer');
    grid.appendChild(el);
    const today = todayISO();
    const horizon = addDays(today, 14);
    const proximos = events
      .filter((e) => !e.excluded && e.kind === 'cheque' && e.date >= today && e.date <= horizon)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: proximos.map((e) => `${e.counterparty.slice(0, 18)} · ${formatDateShortEs(e.date)}`),
        datasets: [{ label: 'Monto', data: proximos.map((e) => e.amount), backgroundColor: FLOW_COLORS.cheques, borderRadius: 4 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: gridOpts(), ticks: { font: baseFont(), color: INK.muted, callback: (v) => formatMoneyCompact(Number(v)) } },
          y: { grid: { display: false }, ticks: { font: { ...baseFont(), size: 11 }, color: INK.secondary } },
        },
      },
    };
    charts.push(new Chart(canvas, cfg));
  }

  // 5. Disponibilidad proyectada (semanal)
  {
    const { el, canvas } = chartCard('Disponibilidad Proyectada', 'Saldo de cierre por semana', 'chart-disponibilidad');
    grid.appendChild(el);
    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: weekly.map((w) => w.label),
        datasets: [
          {
            label: 'Saldo de cierre',
            data: weekly.map((w) => w.closingBalance),
            backgroundColor: weekly.map((w) => (w.closingBalance < 0 ? STATUS.critical : FLOW_COLORS.pagosFijos)),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: baseFont(), color: INK.muted } },
          y: { grid: gridOpts(), ticks: { font: baseFont(), color: INK.muted, callback: (v) => formatMoneyCompact(Number(v)) } },
        },
      },
    };
    charts.push(new Chart(canvas, cfg));
  }
}
