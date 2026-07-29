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

// --- Filtros tipo "botón" para las pestañas de cheques ---------------------
// Distintos de `Filters` (fecha/banco/proveedor/categoría/estado, aplicados
// globalmente): estos son facetas específicas de BASE CHEQUES, compartidas
// entre las 3 pestañas de cheques (Rezagados, Diarios, Tabla) para que la
// selección persista al cambiar de pestaña.
export interface ChequeFilters {
  estado: string | 'todos';
  banco: string | 'todos';
  estatus2: string | 'todos';
  negociacion: string | 'todos';
  mes: string | 'todos';
  anio: string | 'todos';
  semana: string | 'todos';
}

// --- Flujo de Caja en formato matriz (filas = partidas, columnas = período) -
export interface TreasuryPeriod {
  key: string;
  label: string;
  start: string;
  end: string;
}

export type TreasuryRowKind = 'banco' | 'ingreso' | 'egreso' | 'saldoFinal' | 'saldoInicial' | 'flujoDisponible';

export interface TreasuryRow {
  label: string;
  kind: TreasuryRowKind;
  rezagados: number | null;
  values: (number | null)[];
  total: number | null;
}

export interface TreasuryMatrix {
  periods: TreasuryPeriod[];
  totalRezagadosBancos: number;
  rows: TreasuryRow[];
}

// --- Tabla dinámica de cheques (Año > Mes > Día, suma de no cobrados) ------
export interface ChequesPivotDay {
  day: string;
  date: string;
  total: number;
  events: CashEvent[];
}

export interface ChequesPivotMonth {
  month: string;
  monthKey: string;
  total: number;
  days: ChequesPivotDay[];
}

export interface ChequesPivotYear {
  year: string;
  total: number;
  months: ChequesPivotMonth[];
}
