// Paleta cerrada de la identidad TCI Corporate Analytics — nunca introducir
// un tono fuera de esta lista. Se referencia por rol en todos los componentes.
export const BRAND = {
  primary: '#0F4C81',
  primaryDark: '#0B3A63',
  secondary: '#2E7D32',
};

export const STATUS = {
  good: '#2E7D32',
  warning: '#F9A825',
  critical: '#C62828',
};

export const INK = {
  primary: '#1F2937',
  secondary: '#6B7280',
  muted: '#9AA3AF',
  gridline: '#E5E7EB',
  baseline: '#D1D5DB',
};

export const SURFACE = {
  card: '#FFFFFF',
  page: '#F4F6F9',
};

// Único set de series usado por el gráfico del dashboard: la paleta del
// cliente solo trae primario/secundario/advertencia/error, así que las
// series de la app se limitan a esos cuatro roles (nunca colores ad-hoc).
export const SERIES = {
  saldo: BRAND.primary,
  positivo: STATUS.good,
  negativo: STATUS.critical,
  proyeccion: STATUS.warning,
};
