import { GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from '../config';

// Envoltorio delgado sobre Google Identity Services (GIS). No hay backend propio:
// el token de acceso vive solo en memoria del navegador y se usa para llamar
// directamente a la API de Google Drive (drive.readonly). Nada se persiste.

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: unknown) => void;
          }): TokenClient;
        };
      };
    };
  }
}

interface TokenClient {
  requestAccessToken(opts?: { prompt?: string }): void;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

let accessToken: string | null = null;
let tokenExpiresAt = 0;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function hasValidToken(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiresAt;
}

export function getAccessToken(): string | null {
  return hasValidToken() ? accessToken : null;
}

/** Pide (o renueva) el token de acceso. Muestra el consentimiento de Google solo
 *  la primera vez o cuando el token expiró. */
export async function requestAccessToken(interactive = true): Promise<string> {
  if (!isGoogleAuthConfigured()) {
    throw new Error(
      'Falta configurar VITE_GOOGLE_CLIENT_ID. Ver README.md → "Conectar con Google Drive".'
    );
  }
  await loadGisScript();

  // El callback de GIS se define por invocación (necesita cerrar sobre `resolve`/
  // `reject` de esta llamada puntual), así que el cliente se recrea cada vez en vez
  // de reutilizar uno guardado — initTokenClient es liviano y no abre UI por sí solo.
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (resp: TokenResponse) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Autenticación con Google cancelada'));
          return;
        }
        accessToken = resp.access_token;
        // Los tokens de GIS suelen durar 1h; renovamos con margen de seguridad.
        tokenExpiresAt = Date.now() + 55 * 60 * 1000;
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(err instanceof Error ? err : new Error(String(err))),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}
