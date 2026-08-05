// Helper compartido por los módulos de estado que persisten solo en
// sessionStorage (saldos bancarios, préstamos manuales, pagos/recaudo
// manuales, anulaciones de estado de Excel) — ninguno de estos valores viene
// de Excel ni se envía a un servidor; se pierden al cerrar la pestaña.

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // sessionStorage no disponible o corrupto: se ignora y se parte del valor por defecto.
  }
  return fallback;
}

export function saveJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Si el storage está lleno o bloqueado, el valor sigue vivo en memoria.
  }
}
