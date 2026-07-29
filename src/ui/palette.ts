// Paleta validada (ver skill dataviz) — se referencia por rol, nunca se improvisa
// un color nuevo. Categorías en orden fijo: nunca se reordenan según el filtro activo.
export const CATEGORICAL = [
  '#2a78d6', // 1 azul — Cobranza / serie primaria
  '#eb6834', // 2 naranja — Cheques
  '#1baf7a', // 3 aqua — Pagos fijos
  '#eda100', // 4 amarillo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 rojo
];

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
};

export const SURFACE = {
  chart: '#fcfcfb',
  page: '#f9f9f7',
};

export const FLOW_COLORS = {
  cobranza: CATEGORICAL[0],
  cheques: CATEGORICAL[1],
  pagosFijos: CATEGORICAL[2],
};
