import type { CashEvent } from '../types';
import { addDays, todayISO } from '../utils/dates';

// Datos SIMULADOS para revisar diseño, navegación y funcionalidad sin depender
// de Google Drive. La forma (nombres de columnas, categorías, proveedores) se
// modeló sobre la estructura real de BASE CHEQUES, PROYECCION DE CARTERA y
// PAGOS FIJOS ya analizada — los valores son ficticios.

// PRNG determinístico simple para que la demo sea reproducible entre cargas.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260729);

const PROVEEDORES_CHEQUES = [
  { nombre: 'CONTINENTAL TIRE ANDINA S.A', categoria: 'LLANTAS' },
  { nombre: 'TDM IMPORTACIONES', categoria: 'MANTENIMIENTO' },
  { nombre: 'COMERCIAL CARLOS ROLDAN CIA. LTDA', categoria: 'COMPRA VEHÍCULO' },
  { nombre: 'AMERICANTRUCK S.C.C.', categoria: 'MANTENIMIENTO' },
  { nombre: 'INDUSUR INDUSTRIAL DEL SUR S.A.', categoria: 'MANTENIMIENTO' },
  { nombre: 'VELA BUSTOS SANTIAGO JEFFERSON', categoria: 'QUINCENAS' },
  { nombre: 'PAREDES BAEZ STEFAN MICHEEL', categoria: 'PRESTAMOS' },
];

const CLIENTES_CARTERA = [
  'HEINEKEN ECUADOR S.A.',
  'NOVOPAN DEL ECUADOR S.A.',
  'SOFTYS ECUADOR S.A.',
  'AGLOMERADOS COTOPAXI S.A.',
  'BIOPAK S.A.',
  'AGROAZUCAR ECUADOR S.A.',
  'ANTONIO PINO YCAZA CIA.LTDA.',
];

const CLIENTES_EXCLUIDOS = [
  { nombre: 'TCI-CONTABLE S.A.S.', estatus: 'RELACIONADA' },
  { nombre: 'EDESA SA', estatus: 'POR SOLUCIONAR' },
];

const BANCOS = ['PICHINCHA', 'PRODUBANCO', 'GUAYAQUIL', 'AUSTRO', 'INTERNACIONAL', 'LOJA'];
const NEGOCIACIONES = ['SIL-BEL', 'JC-MT', 'AR-PP', 'SIN NEGOCIACION'];
const ESTADOS = ['ENTREGADO', 'PAGADO', 'PROTESTADO'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export function buildDemoBankAccounts(): { id: string; balance: number }[] {
  return [
    { id: 'pichincha', balance: 18500 },
    { id: 'produbanco', balance: 9200 },
    { id: 'guayaquil', balance: 6100 },
    { id: 'austro', balance: 4300 },
    { id: 'internacional', balance: 2650 },
    { id: 'loja', balance: 1100 },
  ];
}

function makeCheque(opts: {
  id: number;
  date: string;
  proveedor: { nombre: string; categoria: string };
  amount: number;
  cobrado: boolean;
}): CashEvent {
  const { id, date, proveedor, amount, cobrado } = opts;
  return {
    id: `demo-cheque-${id}`,
    kind: 'cheque',
    date,
    amount,
    counterparty: proveedor.nombre,
    category: proveedor.categoria,
    status: pick(ESTADOS, id),
    confidence: 'confirmado',
    bank: pick(BANCOS, id),
    source: 'BASE CHEQUES',
    sourceSheet: 'demo',
    meta: {
      numeroCheque: String(636000 + id),
      firmante: 'SIL-BEL',
      negociacion: pick(NEGOCIACIONES, id + 1),
      estatusCobro: cobrado ? 'COBRADO' : 'PENDIENTE',
      fechaCobro: cobrado ? date : undefined,
    },
  };
}

export function buildDemoEvents(): { events: CashEvent[]; warnings: string[] } {
  const today = todayISO();
  const events: CashEvent[] = [];
  let id = 0;

  // Historial de cheques (para que "Cheques Rezagados" y la "Tabla de Cheques"
  // muestren varios meses/años en su pivote Año > Mes > Día).
  const historicOffsets = [-410, -395, -370, -220, -205, -190, -60, -45, -30, -20, -12, -6, -3, -1];
  for (const offset of historicOffsets) {
    const date = addDays(today, offset);
    const proveedor = pick(PROVEEDORES_CHEQUES, id);
    const cobrado = rand() > 0.35;
    events.push(makeCheque({ id: id++, date, proveedor, amount: Math.round((300 + rand() * 3800) * 100) / 100, cobrado }));
  }

  // Cheques categorías especiales (para ver las filas POR DEVOLVER A
  // ALMACENERA / PRESTAMO PERÚ / PRESTAMOS TERCEROS en el Flujo de Caja).
  events.push(
    makeCheque({ id: id++, date: addDays(today, -8), proveedor: { nombre: 'ALMACENERA GUAYAQUIL S.A.', categoria: 'POR DEVOLVER A ALMACENERA' }, amount: 2200, cobrado: false }),
    makeCheque({ id: id++, date: addDays(today, 9), proveedor: { nombre: 'INVERSIONES LIMA PERU', categoria: 'PRESTAMO PERU' }, amount: 5400, cobrado: false }),
    makeCheque({ id: id++, date: addDays(today, 17), proveedor: { nombre: 'VARIOS TERCEROS', categoria: 'PRESTAMOS TERCEROS' }, amount: 1800, cobrado: false })
  );

  for (let i = 0; i < 45; i++) {
    const date = addDays(today, i);

    // Cheques futuros: 2-3 por semana, con una ráfaga fuerte en la semana 3
    // para forzar un quiebre de saldo y así ver el semáforo en rojo/amarillo.
    const semana3 = i >= 15 && i <= 21;
    if (i % 2 === 0 || semana3) {
      const n = semana3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const proveedor = pick(PROVEEDORES_CHEQUES, id + k);
        const amount = Math.round((semana3 ? 3500 + rand() * 6000 : 400 + rand() * 3200) * 100) / 100;
        events.push(makeCheque({ id: id++, date, proveedor, amount, cobrado: false }));
      }
    }

    // Cobranza: 2 de cada 3 días, distribuida entre clientes reales de cartera.
    if (i % 3 !== 2) {
      const cliente = pick(CLIENTES_CARTERA, i);
      events.push({
        id: `demo-cobranza-${id++}`,
        kind: 'cobranza',
        date,
        amount: Math.round((900 + rand() * 4200) * 100) / 100,
        counterparty: cliente,
        category: 'Cartera transportistas',
        status: 'Vigente',
        confidence: i % 5 === 0 ? 'en_gestion' : 'confirmado',
        source: 'PROYECCION DE CARTERA',
        sourceSheet: 'demo',
      });
    }
  }

  // Pago fijo mensual (deuda IESS) — un solo evento consolidado, como en el archivo real.
  events.push({
    id: 'demo-pago-fijo-iess',
    kind: 'pago_fijo',
    date: addDays(today, 14),
    amount: 24939.73,
    counterparty: 'IESS',
    category: 'Deuda IESS (convenios)',
    status: 'Programado',
    confidence: 'confirmado',
    source: 'PAGOS FIJOS',
    sourceSheet: 'demo',
  });

  // Cartera excluida (relacionadas / por solucionar) — no entra al cálculo,
  // pero demuestra el mecanismo de exclusión automática del modelo de datos.
  CLIENTES_EXCLUIDOS.forEach((c, idx) => {
    events.push({
      id: `demo-excluido-${idx}`,
      kind: 'cobranza',
      date: addDays(today, 5 + idx * 3),
      amount: 1500 + idx * 800,
      counterparty: c.nombre,
      category: 'Cartera transportistas',
      status: c.estatus,
      confidence: 'no_confirmado',
      source: 'PROYECCION DE CARTERA',
      sourceSheet: 'demo',
      excluded: true,
      excludedReason: c.estatus === 'RELACIONADA' ? 'Parte relacionada (intercompañía)' : 'Por solucionar — alto riesgo de cobro',
    });
  });

  const warnings = [
    'MODO DEMOSTRACIÓN: estos datos son simulados y no provienen de Google Drive.',
    'PAGOS FIJOS.xlsx solo contiene la deuda IESS por convenio. Faltan nómina, arriendos, servicios básicos, seguros y otros pagos recurrentes.',
    'PROYECCION DE CARTERA: 2 cliente(s) fueron excluidos automáticamente por ser parte relacionada o estar "por solucionar".',
  ];

  return { events, warnings };
}
