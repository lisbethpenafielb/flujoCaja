// Configuración del Módulo de Tesorería — Transcomerinter Cía. Ltda.
//
// GOOGLE_CLIENT_ID debe crearse UNA vez en Google Cloud Console (OAuth 2.0 Client ID,
// tipo "Web application"), agregando como "Authorized JavaScript origins" el dominio
// donde se sirva esta app (ej. http://localhost:5173 en desarrollo, y la URL de
// producción). Ver README.md para el paso a paso. Sin este valor la app funciona
// igual pero el botón "Conectar con Google Drive" quedará deshabilitado.
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

// Solo lectura: la app nunca escribe en Drive.
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

// Nombres exactos de los 3 archivos fuente. Se buscan por nombre (no por ID fijo) para
// que sigan encontrándose aunque Tesorería reemplace el archivo por una versión nueva.
export const SOURCE_FILES = {
  cheques: 'BASE CHEQUES.xlsx',
  cartera: '05.PROYECCION DE CARTERA.xlsx',
  pagosFijos: 'PAGOS FIJOS.xlsx',
} as const;

// Carpeta de Drive donde viven los 3 archivos (acelera la búsqueda; si no se
// encuentra ahí, el cliente hace una búsqueda global por nombre como respaldo).
export const SOURCE_FOLDER_ID = '18lkJxSVXPqq-UKuDPXvBn9DIZwFgSGUF';

// Bancos de Transcomerinter. El saldo es 100% manual y vive solo en la sesión
// del navegador (sessionStorage) — nunca se guarda en Excel ni se envía a
// ningún servidor. `name` es también la etiqueta corta usada como fila en el
// Flujo de Caja (formato matriz). Coincide con los 6 bancos reales de la
// plantilla de tesorería (Pichincha, Produbanco, Guayaquil, Austro,
// Internacional, Loja — este último es Banco de Loja, no una plaza/sucursal).
export const DEFAULT_BANK_ACCOUNTS: { id: string; name: string; bankName: string }[] = [
  { id: 'pichincha', name: 'PICHINCHA', bankName: 'Banco Pichincha' },
  { id: 'produbanco', name: 'PRODUBANCO', bankName: 'Produbanco' },
  { id: 'guayaquil', name: 'GUAYAQUIL', bankName: 'Banco de Guayaquil' },
  { id: 'austro', name: 'AUSTRO', bankName: 'Banco del Austro' },
  { id: 'internacional', name: 'INTERNACIONAL', bankName: 'Banco Internacional' },
  { id: 'loja', name: 'LOJA', bankName: 'Banco de Loja' },
];

// Categorías de egreso que se desglosan como filas propias en el Flujo de Caja
// (formato matriz), en vez de agruparse dentro de "Cheques Posfechados". El
// emparejamiento es por palabra clave contra CATEGORIA/DETALLE del cheque —
// ajustar aquí si Tesorería confirma otra nomenclatura en el Excel fuente.
export const SPECIAL_CHEQUE_ROWS: { label: string; keywords: string[] }[] = [
  { label: 'POR DEVOLVER A ALMACENERA', keywords: ['ALMACENERA'] },
  { label: 'PRESTAMO PERÚ', keywords: ['PRESTAMO PERU', 'PRÉSTAMO PERÚ', 'PRESTAMO PERÚ'] },
  { label: 'PRESTAMOS TERCEROS', keywords: ['PRESTAMOS TERCEROS', 'PRESTAMO TERCEROS'] },
];

// Umbrales del semáforo de riesgo diario, como múltiplo del promedio de egresos
// diarios (cheques + pagos fijos) de la proyección cargada.
export const RISK_THRESHOLDS = {
  bajoMultiplier: 0, // saldo < 0 => negativo (rojo)
  medioMultiplier: 1, // saldo < 1x egreso diario promedio => bajo (amarillo)
};

export const PROJECTION_DAYS = 30;
