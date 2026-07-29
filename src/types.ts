// Modelo semántico único del módulo de Tesorería.
// Todo parser (cheques, cartera, pagos fijos) traduce su Excel de origen a estos tipos,
// de modo que el motor de cálculo y la UI nunca dependen de nombres de columna de Excel.
// Esto permite integrar futuros módulos (nómina, impuestos, etc.) sin reescribir el core.

export type FlowKind = 'cobranza' | 'cheque' | 'pago_fijo';

export type FlowConfidence = 'confirmado' | 'en_gestion' | 'no_confirmado' | 'vencido';

export interface CashEvent {
  id: string;
  kind: FlowKind;
  /** Fecha en la que se espera el movimiento de caja (YYYY-MM-DD, hora local). */
  date: string;
  /** Monto absoluto (siempre positivo; el signo lo decide `kind`). */
  amount: number;
  counterparty: string;
  category: string;
  status: string;
  confidence: FlowConfidence;
  bank?: string;
  source: 'BASE CHEQUES' | 'PROYECCION DE CARTERA' | 'PAGOS FIJOS';
  sourceSheet: string;
  excluded?: boolean;
  excludedReason?: string;
  meta?: Record<string, string | number | undefined>;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  balance: number | null;
}

export interface DailyBucket {
  date: string;
  openingBalance: number;
  cobranza: number;
  cheques: number;
  pagosFijos: number;
  closingBalance: number;
  events: CashEvent[];
  status: 'negativo' | 'bajo' | 'suficiente';
}

export interface WeeklyBucket {
  weekStart: string;
  weekEnd: string;
  label: string;
  openingBalance: number;
  cobranza: number;
  cheques: number;
  pagosFijos: number;
  closingBalance: number;
  compromisosTotal: number;
}

export interface Kpis {
  saldoBancario: number;
  cobranzaEsperada: number;
  chequesProgramados: number;
  pagosFijos: number;
  saldoNetoProyectado: number;
  liquidezDias: number | null;
  riesgo: 'bajo' | 'medio' | 'alto';
}

export type AlertLevel = 'critico' | 'advertencia' | 'info';

export interface CashAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  date?: string;
}

export interface Filters {
  dateFrom: string;
  dateTo: string;
  bank: string | 'todos';
  counterparty: string | 'todos';
  category: string | 'todos';
  status: string | 'todos';
}

export interface LoadedDataset {
  events: CashEvent[];
  excludedEvents: CashEvent[];
  loadedAt: Date;
  warnings: string[];
}
