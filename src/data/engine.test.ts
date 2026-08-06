import { describe, expect, it } from 'vitest';
import type { BankAccount, CashEvent, ExcelEstadoOverrides, ManualPago, ManualRecaudo } from '../types';
import { daysBetween } from '../utils/dates';
import {
  applyFilters,
  buildAlerts,
  buildDailyProjection,
  buildDayPeriods,
  buildManualLoanEvents,
  buildManualPagoEvents,
  buildManualRecaudoEvents,
  buildMonthWeekPeriods,
  buildTreasuryMatrix,
  chequesRezagados,
  computeKpis,
  filterByExcelEstado,
  totalBankBalance,
} from './engine';

function mkEvent(overrides: Partial<CashEvent> & Pick<CashEvent, 'id' | 'kind' | 'date' | 'amount'>): CashEvent {
  return {
    counterparty: 'Proveedor X',
    category: 'GENERAL',
    status: 'Pendiente',
    confidence: 'confirmado',
    source: 'MANUAL',
    sourceSheet: 'manual',
    ...overrides,
  };
}

describe('totalBankBalance', () => {
  it('suma los saldos de todas las cuentas', () => {
    const accounts: BankAccount[] = [
      { id: 'a', name: 'A', bankName: 'Banco A', balance: 100 },
      { id: 'b', name: 'B', bankName: 'Banco B', balance: 50.5 },
    ];
    expect(totalBankBalance(accounts)).toBe(150.5);
  });

  it('trata un saldo null como 0 (cuenta aún sin digitar)', () => {
    const accounts: BankAccount[] = [{ id: 'a', name: 'A', bankName: 'Banco A', balance: null }];
    expect(totalBankBalance(accounts)).toBe(0);
  });
});

describe('buildDailyProjection', () => {
  it('arrastra el saldo de cierre de un día como saldo inicial del siguiente', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cobranza', date: '2026-01-01', amount: 100 }),
      mkEvent({ id: '2', kind: 'cheque', date: '2026-01-02', amount: 40 }),
    ];
    const daily = buildDailyProjection(events, 1000, '2026-01-01', 3);
    expect(daily).toHaveLength(3);
    expect(daily[0].openingBalance).toBe(1000);
    expect(daily[0].closingBalance).toBe(1100);
    expect(daily[1].openingBalance).toBe(1100);
    expect(daily[1].closingBalance).toBe(1060);
    expect(daily[2].openingBalance).toBe(1060);
    expect(daily[2].closingBalance).toBe(1060);
  });

  it('excluye cheques ya COBRADOS: su efecto ya está en el saldo bancario manual', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 500, meta: { estatusCobro: 'COBRADO' } }),
    ];
    const daily = buildDailyProjection(events, 1000, '2026-01-01', 1);
    expect(daily[0].cheques).toBe(0);
    expect(daily[0].closingBalance).toBe(1000);
  });

  it('excluye eventos marcados excluded (cartera dada de baja/legal/etc.)', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cobranza', date: '2026-01-01', amount: 500, excluded: true }),
    ];
    const daily = buildDailyProjection(events, 1000, '2026-01-01', 1);
    expect(daily[0].cobranza).toBe(0);
    expect(daily[0].closingBalance).toBe(1000);
  });

  it('marca el día como negativo cuando el saldo de cierre es menor a 0', () => {
    const events: CashEvent[] = [mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 200 })];
    const daily = buildDailyProjection(events, 100, '2026-01-01', 1);
    expect(daily[0].closingBalance).toBe(-100);
    expect(daily[0].status).toBe('negativo');
  });
});

describe('computeKpis', () => {
  it('marca riesgo alto cuando hay al menos un día con saldo negativo', () => {
    const daily = buildDailyProjection(
      [mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 200 })],
      100,
      '2026-01-01',
      1
    );
    const kpis = computeKpis(daily, 100);
    expect(kpis.riesgo).toBe('alto');
  });

  it('marca riesgo bajo cuando el saldo nunca baja y la liquidez alcanza para varios días', () => {
    const daily = buildDailyProjection([], 100000, '2026-01-01', 5);
    const kpis = computeKpis(daily, 100000);
    expect(kpis.riesgo).toBe('bajo');
    expect(kpis.liquidezDias).toBeNull();
  });
});

describe('buildAlerts', () => {
  it('genera la alerta de saldo negativo con la fecha del primer quiebre', () => {
    const events: CashEvent[] = [mkEvent({ id: '1', kind: 'cheque', date: '2026-01-02', amount: 500 })];
    const daily = buildDailyProjection(events, 100, '2026-01-01', 3);
    const alerts = buildAlerts(daily, events);
    const negAlert = alerts.find((a) => a.id === 'saldo-negativo');
    expect(negAlert).toBeDefined();
    expect(negAlert?.date).toBe('2026-01-02');
  });

  it('no genera alertas cuando el saldo se mantiene sano y la cobranza cubre los compromisos', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 100 }),
      mkEvent({ id: '2', kind: 'cobranza', date: '2026-01-01', amount: 100 }),
    ];
    const daily = buildDailyProjection(events, 100000, '2026-01-01', 1);
    const alerts = buildAlerts(daily, events);
    expect(alerts.find((a) => a.id === 'saldo-negativo')).toBeUndefined();
    expect(alerts.find((a) => a.id === 'cobranza-insuficiente')).toBeUndefined();
  });
});

describe('eventos manuales (Préstamos / Pagos / Recaudo)', () => {
  it('buildManualLoanEvents ignora entradas en 0 y arma un evento tipo cheque por fecha', () => {
    const events = buildManualLoanEvents({ 'PRESTAMO PERU': { '2026-01-01': 300, '2026-01-02': 0 } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'cheque', date: '2026-01-01', amount: 300, category: 'PRESTAMO PERU' });
  });

  it('buildManualPagoEvents solo incluye pagos pendientes', () => {
    const pagos: ManualPago[] = [
      { id: 'p1', concepto: 'Arriendo', monto: 200, fecha: '2026-01-01', estado: 'pendiente' },
      { id: 'p2', concepto: 'Seguro', monto: 100, fecha: '2026-01-01', estado: 'pagado' },
    ];
    const events = buildManualPagoEvents(pagos);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('pago-manual-p1');
    expect(events[0].kind).toBe('pago_fijo');
  });

  it('buildManualRecaudoEvents solo incluye recaudos pendientes', () => {
    const recaudos: ManualRecaudo[] = [
      { id: 'r1', concepto: 'Cliente A', monto: 500, fecha: '2026-01-01', estado: 'pendiente' },
      { id: 'r2', concepto: 'Cliente B', monto: 300, fecha: '2026-01-01', estado: 'pagado' },
    ];
    const events = buildManualRecaudoEvents(recaudos);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('cobranza');
  });
});

describe('filterByExcelEstado', () => {
  it('excluye eventos marcados como pagado a mano y conserva los sin override', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'pago_fijo', date: '2026-01-01', amount: 100 }),
      mkEvent({ id: '2', kind: 'pago_fijo', date: '2026-01-01', amount: 200 }),
    ];
    const overrides: ExcelEstadoOverrides = { '1': 'pagado' };
    const result = filterByExcelEstado(events, overrides);
    expect(result.map((e) => e.id)).toEqual(['2']);
  });
});

describe('applyFilters', () => {
  it('filtra por rango de fechas y por banco', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 10, bank: 'Pichincha' }),
      mkEvent({ id: '2', kind: 'cheque', date: '2026-01-15', amount: 10, bank: 'Guayaquil' }),
    ];
    const result = applyFilters(events, {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-10',
      bank: 'todos',
      counterparty: 'todos',
      category: 'todos',
      status: 'todos',
    });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });
});

describe('chequesRezagados', () => {
  it('incluye solo cheques con fecha anterior a hoy que siguen sin cobrar', () => {
    const events: CashEvent[] = [
      mkEvent({ id: '1', kind: 'cheque', date: '2026-01-01', amount: 10, meta: { estatusCobro: 'PENDIENTE' } }),
      mkEvent({ id: '2', kind: 'cheque', date: '2026-01-01', amount: 10, meta: { estatusCobro: 'COBRADO' } }),
      mkEvent({ id: '3', kind: 'cheque', date: '2026-02-01', amount: 10, meta: { estatusCobro: 'PENDIENTE' } }),
    ];
    const result = chequesRezagados(events, '2026-01-15');
    expect(result.map((e) => e.id)).toEqual(['1']);
  });
});

describe('buildDayPeriods', () => {
  it('genera un período por día en el rango, inclusive', () => {
    const periods = buildDayPeriods('2026-01-01', '2026-01-03');
    expect(periods.map((p) => p.key)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
});

describe('buildMonthWeekPeriods', () => {
  // 2026-07-27 es lunes; 2026-08-02 es domingo (5 días en julio, 2 en agosto).
  it('una semana con mayoría de días en el mes anterior pertenece a ese mes, completa', () => {
    const julio = buildMonthWeekPeriods('2026-07');
    expect(julio.some((p) => p.start === '2026-07-27' && p.end === '2026-08-02')).toBe(true);

    const agosto = buildMonthWeekPeriods('2026-08');
    expect(agosto.some((p) => p.start === '2026-07-27')).toBe(false);
    // El primer día de agosto (sábado 01) queda cubierto por la semana de julio,
    // así que la primera semana de agosto propiamente dicha empieza el lunes siguiente.
    expect(agosto[0].start).toBe('2026-08-03');
  });

  // 2026-08-31 es lunes; 2026-09-06 es domingo (1 día en agosto, 6 en septiembre).
  it('una semana con mayoría de días en el mes siguiente pertenece a ese mes, completa', () => {
    const agosto = buildMonthWeekPeriods('2026-08');
    expect(agosto.some((p) => p.start === '2026-08-31')).toBe(false);
    expect(agosto[agosto.length - 1].end).toBe('2026-08-30');

    const septiembre = buildMonthWeekPeriods('2026-09');
    expect(septiembre.some((p) => p.start === '2026-08-31' && p.end === '2026-09-06')).toBe(true);
  });

  it('ninguna semana se corta: siempre son 7 días completos', () => {
    for (const p of buildMonthWeekPeriods('2026-08')) {
      expect(daysBetween(p.start, p.end)).toBe(6);
    }
  });

  it('las semanas quedan ordenadas por fecha de inicio', () => {
    const periods = buildMonthWeekPeriods('2026-08');
    const sortedKeys = [...periods.map((p) => p.key)].sort();
    expect(periods.map((p) => p.key)).toEqual(sortedKeys);
  });
});

describe('buildTreasuryMatrix', () => {
  it('acumula eventos anteriores al primer período en la columna de rezagados y arrastra el saldo día a día', () => {
    const bankAccounts: BankAccount[] = [{ id: 'pichincha', name: 'PICHINCHA', bankName: 'Banco Pichincha', balance: 1000 }];
    const events: CashEvent[] = [
      // anterior al período: debe caer en "rezagados", no en una columna de día.
      mkEvent({ id: '1', kind: 'cheque', date: '2025-12-20', amount: 100 }),
      mkEvent({ id: '2', kind: 'cobranza', date: '2026-01-02', amount: 300 }),
    ];
    const periods = buildDayPeriods('2026-01-01', '2026-01-02');
    const matrix = buildTreasuryMatrix(events, bankAccounts, periods);

    expect(matrix.totalRezagadosBancos).toBe(1000);

    const chequesRow = matrix.rows.find((r) => r.label === '(-) CHEQUES POSFECHADOS')!;
    expect(chequesRow.rezagados).toBe(-100);
    // Sin cheques en el rango de columnas -> cada valor es 0 * -1 === -0 en JS (mismo número, signo distinto).
    expect(chequesRow.values.every((v) => v === 0)).toBe(true);

    const recaudoRow = matrix.rows.find((r) => r.label === '(+) PROYECCIÓN RECAUDO')!;
    expect(recaudoRow.values).toEqual([0, 300]);

    const saldoFinalRow = matrix.rows.find((r) => r.label === '(=) SALDO FINAL')!;
    // 1000 (banco) - 100 (cheque rezagado) = 900 de arrastre inicial
    expect(saldoFinalRow.rezagados).toBe(900);

    const flujoDisponibleRow = matrix.rows.find((r) => r.label === '(=) FLUJO DISPONIBLE')!;
    // día 1: sin movimientos -> sigue en 900; día 2: +300 de recaudo -> 1200
    expect(flujoDisponibleRow.values).toEqual([900, 1200]);
  });
});
