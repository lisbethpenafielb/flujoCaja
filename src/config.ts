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

// Cuentas bancarias de Transcomerinter. El saldo es 100% manual y vive solo en la
// sesión del navegador (sessionStorage) — nunca se guarda en Excel ni se envía a
// ningún servidor. Editar aquí la lista de bancos/alias si cambia el número de cuentas.
export const DEFAULT_BANK_ACCOUNTS: { id: string; name: string; bankName: string }[] = [
  { id: 'cta-01', name: 'Cuenta Corriente 1', bankName: 'Banco Pichincha' },
  { id: 'cta-02', name: 'Cuenta Corriente 2', bankName: 'Banco Pichincha' },
  { id: 'cta-03', name: 'Cuenta Corriente 3', bankName: 'Banco Guayaquil' },
  { id: 'cta-04', name: 'Cuenta Corriente 4', bankName: 'Banco Guayaquil' },
  { id: 'cta-05', name: 'Cuenta Corriente 5', bankName: 'Produbanco' },
  { id: 'cta-06', name: 'Cuenta Corriente 6', bankName: 'Produbanco' },
  { id: 'cta-07', name: 'Cuenta Corriente 7', bankName: 'Banco Internacional' },
  { id: 'cta-08', name: 'Cuenta Corriente 8', bankName: 'Banco Internacional' },
  { id: 'cta-09', name: 'Cuenta Corriente 9', bankName: 'Banco Bolivariano' },
  { id: 'cta-10', name: 'Cuenta Corriente 10', bankName: 'Banco Bolivariano' },
  { id: 'cta-11', name: 'Cuenta Corriente 11', bankName: 'Banco del Pacífico' },
  { id: 'cta-12', name: 'Cuenta Corriente 12', bankName: 'Banco del Austro' },
  { id: 'cta-13', name: 'Cuenta Corriente 13', bankName: 'Cooperativa / Otro' },
];

// Umbrales del semáforo de riesgo diario, como múltiplo del promedio de egresos
// diarios (cheques + pagos fijos) de la proyección cargada.
export const RISK_THRESHOLDS = {
  bajoMultiplier: 0, // saldo < 0 => negativo (rojo)
  medioMultiplier: 1, // saldo < 1x egreso diario promedio => bajo (amarillo)
};

export const PROJECTION_DAYS = 30;
