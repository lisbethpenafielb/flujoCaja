import type { CashEvent, DailyBucket } from '../types';
import { buildDailyProjection, computeKpis } from './engine';
import { daysBetween, todayISO } from '../utils/dates';

// Pronósticos a distintos horizontes — reutiliza buildDailyProjection y
// computeKpis (engine.ts) tal cual, solo variando el número de días. Ninguna
// fórmula financiera nueva: es el mismo motor corrido varias veces.

export const FORECAST_HORIZONS = [0, 7, 15, 30, 60, 90] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export interface HorizonForecast {
  horizon: ForecastHorizon;
  saldoEsperado: number;
  cobranzaEsperada: number;
  pagosProyectados: number;
  liquidezDias: number | null;
}

export function buildHorizonForecasts(
  events: CashEvent[],
  openingBalance: number,
  fromDate: string = todayISO()
): HorizonForecast[] {
  return FORECAST_HORIZONS.map((horizon) => {
    if (horizon === 0) {
      return { horizon, saldoEsperado: openingBalance, cobranzaEsperada: 0, pagosProyectados: 0, liquidezDias: null };
    }
    const daily = buildDailyProjection(events, openingBalance, fromDate, horizon);
    const kpis = computeKpis(daily, openingBalance);
    const last = daily[daily.length - 1];
    return {
      horizon,
      saldoEsperado: last ? last.closingBalance : openingBalance,
      cobranzaEsperada: kpis.cobranzaEsperada,
      pagosProyectados: kpis.chequesProgramados + kpis.pagosFijos,
      liquidezDias: kpis.liquidezDias,
    };
  });
}

export interface FirstDeficitForecast {
  date: string;
  amount: number;
  daysUntil: number;
}

/** Primer día con saldo proyectado negativo dentro de `daily` — mismo
 *  criterio que ya usa `buildAlerts` (engine.ts) y `deficitMagnitude`
 *  (derived.ts), aquí expuesto como fecha + monto + días faltantes. */
export function buildFirstDeficitForecast(daily: DailyBucket[], fromDate: string = todayISO()): FirstDeficitForecast | null {
  const first = daily.find((d) => d.closingBalance < 0);
  if (!first) return null;
  return { date: first.date, amount: first.closingBalance, daysUntil: daysBetween(fromDate, first.date) };
}
