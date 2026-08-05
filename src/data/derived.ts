import type { DailyBucket, Kpis } from '../types';
import { formatDateEs } from '../utils/dates';

// Funciones de solo lectura sobre datos que engine.ts ya calculó
// (buildDailyProjection/computeKpis) — nunca recalculan una cifra
// financiera nueva ni tocan la lógica de proyección; solo componen texto
// o derivan un número auxiliar a partir de lo que el motor ya produjo.

/** Comentario tipo Controller para el panel "Resumen ejecutivo" del
 *  Dashboard — se regenera solo, ya que se arma en cada `render()` a partir
 *  de `kpis`/`daily` (ambos recalculados en cada cambio de estado). */
export function buildExecutiveSummary(kpis: Kpis, daily: DailyBucket[]): string {
  const liquidezTxt =
    kpis.liquidezDias === null
      ? 'La liquidez no se puede proyectar por falta de egresos programados en el período.'
      : `La liquidez proyectada es de ${kpis.liquidezDias.toFixed(1)} días.`;

  const negativeDays = daily.filter((d) => d.closingBalance < 0);
  const totalCobranza = daily.reduce((s, d) => s + d.cobranza, 0);
  const totalEgresos = daily.reduce((s, d) => s + d.cheques + d.pagosFijos, 0);
  const cobranzaInsuficiente = totalEgresos > 0 && totalCobranza < totalEgresos;

  if (negativeDays.length > 0) {
    const first = negativeDays[0];
    const razon = cobranzaInsuficiente
      ? 'los pagos programados superan la cobranza esperada'
      : 'el saldo bancario actual no alcanza a cubrir los compromisos acumulados';
    const recomendacion = cobranzaInsuficiente
      ? 'acelerar la recuperación de cartera'
      : 'revisar y reprogramar los pagos no prioritarios';
    return `${liquidezTxt} El saldo comienza a ser negativo el ${formatDateEs(first.date)} debido a que ${razon}. Se recomienda ${recomendacion}.`;
  }

  if (kpis.riesgo === 'medio') {
    return `${liquidezTxt} La cobertura está ajustada — se recomienda monitorear de cerca la cobranza y los pagos programados de los próximos días.`;
  }

  return `${liquidezTxt} El flujo proyectado cubre holgadamente los compromisos de pago del período; no se identifican riesgos de liquidez en este momento.`;
}

/** Saldo más negativo del período — el monto adicional que haría falta,
 *  en el punto más bajo, para que el flujo se mantenga en positivo.
 *  `null` cuando ningún día proyecta saldo negativo. */
export function deficitMagnitude(daily: DailyBucket[]): number | null {
  const negatives = daily.filter((d) => d.closingBalance < 0).map((d) => d.closingBalance);
  return negatives.length ? Math.min(...negatives) : null;
}

/** % de los egresos del período que la cobranza proyectada alcanza a
 *  cubrir. `null` cuando no hay egresos programados (no hay nada que
 *  "cubrir" — evita fabricar un porcentaje sin base). */
export function coverageRatio(daily: DailyBucket[]): number | null {
  const totalCobranza = daily.reduce((s, d) => s + d.cobranza, 0);
  const totalEgresos = daily.reduce((s, d) => s + d.cheques + d.pagosFijos, 0);
  return totalEgresos > 0 ? (totalCobranza / totalEgresos) * 100 : null;
}
