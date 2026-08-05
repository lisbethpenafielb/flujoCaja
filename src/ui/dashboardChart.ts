import type { DailyBucket } from '../types';
import { formatDateShortEs } from '../utils/dates';
import { formatMoney, formatMoneyCompact } from '../utils/format';
import { h } from './dom';
import { BRAND, INK, STATUS } from './palette';

const NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function linearRegression(values: number[]): (i: number) => number {
  const n = values.length;
  if (n < 2) return () => values[0] ?? 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return (i: number) => intercept + slope * i;
}

/** Curva suave tipo "monotone" simple (Catmull-Rom -> Bezier) para que la
 *  línea de saldo no se vea como segmentos rectos entre 30 puntos. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function renderDashboardChart(daily: DailyBucket[]): HTMLElement {
  const W = 960;
  const H = 420;
  const padL = 64;
  const padR = 20;
  const padT = 24;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = daily.map((d) => d.closingBalance);
  const n = values.length;
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;

  const xAt = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - ((v - min) / (max - min)) * plotH;
  const yZero = yAt(0);

  const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[n - 1].x} ${yZero} L ${points[0].x} ${yZero} Z`;

  const trend = linearRegression(values);
  const trendPath = `M ${xAt(0)} ${yAt(trend(0))} L ${xAt(n - 1)} ${yAt(trend(n - 1))}`;

  // Puntos críticos: el mínimo del período (y, si aplica, el primer día negativo).
  let minIdx = 0;
  values.forEach((v, i) => {
    if (v < values[minIdx]) minIdx = i;
  });
  const firstNegativeIdx = values.findIndex((v) => v < 0);

  const clipId = `chart-clip-${Math.random().toString(36).slice(2, 9)}`;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'w-full h-auto block', role: 'img', 'aria-label': 'Evolución proyectada del saldo de caja' });

  // Gridlines horizontales (4 franjas)
  const gridGroup = svgEl('g');
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const v = min + ((max - min) * s) / steps;
    const y = yAt(v);
    gridGroup.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, stroke: INK.gridline, 'stroke-width': 1 }));
    const label = svgEl('text', { x: padL - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: INK.muted, 'font-family': 'inherit' });
    label.textContent = formatMoneyCompact(v);
    gridGroup.appendChild(label);
  }
  svg.appendChild(gridGroup);

  // Línea base cero, resaltada
  svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: yZero, y2: yZero, stroke: INK.baseline, 'stroke-width': 1.25, 'stroke-dasharray': '3,3' }));

  // Clip del área para el sombreado por signo
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: clipId });
  clip.appendChild(svgEl('path', { d: areaPath }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const clipped = svgEl('g', { 'clip-path': `url(#${clipId})` });
  clipped.appendChild(svgEl('rect', { x: padL, y: padT, width: plotW, height: Math.max(0, yZero - padT), fill: `${BRAND.primary}1f` }));
  clipped.appendChild(
    svgEl('rect', { x: padL, y: yZero, width: plotW, height: Math.max(0, padT + plotH - yZero), fill: `${STATUS.critical}22` })
  );
  svg.appendChild(clipped);

  // Línea de tendencia (regresión lineal, discontinua, discreta)
  svg.appendChild(svgEl('path', { d: trendPath, fill: 'none', stroke: INK.muted, 'stroke-width': 1.5, 'stroke-dasharray': '5,4' }));

  // Línea principal de saldo proyectado
  const line = svgEl('path', {
    d: linePath,
    fill: 'none',
    stroke: BRAND.primary,
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  const len = 3000;
  line.style.strokeDasharray = String(len);
  line.style.strokeDashoffset = String(len);
  line.style.animation = 'draw-line 900ms cubic-bezier(0.16,1,0.3,1) forwards';
  line.style.setProperty('--line-length', String(len));
  svg.appendChild(line);

  // Punto crítico: el mínimo del período
  const minPoint = points[minIdx];
  const minColor = values[minIdx] < 0 ? STATUS.critical : BRAND.primary;
  svg.appendChild(svgEl('circle', { cx: minPoint.x, cy: minPoint.y, r: 4.5, fill: '#fff', stroke: minColor, 'stroke-width': 2.5 }));
  const minLabel = svgEl('text', {
    x: Math.min(Math.max(minPoint.x, padL + 40), W - padR - 40),
    y: minPoint.y + (values[minIdx] < 0 ? 18 : -12),
    'text-anchor': 'middle',
    'font-size': 10.5,
    'font-weight': 700,
    fill: minColor,
  });
  minLabel.textContent = `Mínimo ${formatMoneyCompact(values[minIdx])}`;
  svg.appendChild(minLabel);

  if (firstNegativeIdx >= 0 && firstNegativeIdx !== minIdx) {
    const p = points[firstNegativeIdx];
    svg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3.5, fill: STATUS.critical }));
  }

  // Eje X: fecha cada ~5 días
  const labelEvery = Math.max(1, Math.round(n / 6));
  daily.forEach((d, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return;
    const t = svgEl('text', { x: xAt(i), y: H - 8, 'text-anchor': 'middle', 'font-size': 10.5, fill: INK.muted });
    t.textContent = formatDateShortEs(d.date).replace(/^\w+,\s*/, '');
    svg.appendChild(t);
  });

  // --- Interacción: crosshair + tooltip -------------------------------------
  const crosshair = svgEl('g', { style: 'opacity:0;pointer-events:none' });
  const crosshairLine = svgEl('line', { y1: padT, y2: padT + plotH, stroke: INK.secondary, 'stroke-width': 1, 'stroke-dasharray': '2,2' });
  const crosshairDot = svgEl('circle', { r: 5, fill: BRAND.primary, stroke: '#fff', 'stroke-width': 2 });
  crosshair.appendChild(crosshairLine);
  crosshair.appendChild(crosshairDot);
  svg.appendChild(crosshair);

  const tooltip = h('div', {
    class: 'absolute pointer-events-none rounded-lg px-3 py-2 text-xs shadow-lg',
    style: 'background:var(--ink-primary);color:#fff;opacity:0;transition:opacity 120ms ease;z-index:5;white-space:nowrap',
  });

  const overlay = svgEl('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
  overlay.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    const idx = Math.round(((localX - padL) / plotW) * (n - 1));
    const clamped = Math.min(n - 1, Math.max(0, idx));
    const p = points[clamped];
    crosshair.setAttribute('style', 'opacity:1;pointer-events:none');
    crosshairLine.setAttribute('x1', String(p.x));
    crosshairLine.setAttribute('x2', String(p.x));
    crosshairDot.setAttribute('cx', String(p.x));
    crosshairDot.setAttribute('cy', String(p.y));
    crosshairDot.setAttribute('fill', values[clamped] < 0 ? STATUS.critical : BRAND.primary);

    const scaleXInv = rect.width / W;
    const pxLeft = p.x * scaleXInv;
    const scaleYInv = rect.height / H;
    const pxTop = p.y * scaleYInv;
    tooltip.style.opacity = '1';
    tooltip.style.left = `${Math.min(Math.max(pxLeft - 60, 0), rect.width - 130)}px`;
    tooltip.style.top = `${Math.max(pxTop - 54, 0)}px`;
    tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${formatDateShortEs(daily[clamped].date)}</div><div style="font-variant-numeric:tabular-nums">${formatMoney(values[clamped])}</div>`;
  });
  overlay.addEventListener('mouseleave', () => {
    crosshair.setAttribute('style', 'opacity:0;pointer-events:none');
    tooltip.style.opacity = '0';
  });
  svg.appendChild(overlay);

  const legend = h('div', { class: 'flex flex-wrap items-center gap-4 text-xs', style: 'color:var(--ink-secondary)' }, [
    h('span', { class: 'flex items-center gap-1.5' }, [
      h('span', { class: 'inline-block rounded-full', style: `width:8px;height:8px;background:${BRAND.primary}` }),
      'Saldo proyectado',
    ]),
    h('span', { class: 'flex items-center gap-1.5' }, [
      h('span', { class: 'inline-block', style: `width:12px;height:0;border-top:1.5px dashed ${INK.muted}` }),
      'Línea de tendencia',
    ]),
    h('span', { class: 'flex items-center gap-1.5' }, [
      h('span', { class: 'inline-block rounded-sm', style: `width:10px;height:10px;background:${STATUS.critical}33` }),
      'Días con saldo negativo',
    ]),
  ]);

  const container = h('div', { class: 'relative' }, [svg, tooltip]);
  return h('div', { class: 'flex flex-col gap-3' }, [container, legend]);
}
