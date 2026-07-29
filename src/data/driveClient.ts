import { getAccessToken, requestAccessToken } from '../auth/googleAuth';
import { SOURCE_FOLDER_ID } from '../config';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

async function authorizedFetch(url: string): Promise<Response> {
  let token = getAccessToken() ?? (await requestAccessToken(false).catch(() => requestAccessToken(true)));
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    // token vencido a mitad de sesión: reintenta una vez con consentimiento silencioso
    token = await requestAccessToken(false);
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }
  return res;
}

/** Busca el archivo más reciente que coincide con `name`, primero en la carpeta
 *  conocida y si no aparece, en todo Drive. Así el dashboard sigue funcionando
 *  aunque el archivo se reemplace por uno con un ID nuevo. */
export async function findFileByName(name: string): Promise<DriveFile> {
  const escaped = name.replace(/'/g, "\\'");
  const scoped = `name = '${escaped}' and '${SOURCE_FOLDER_ID}' in parents and trashed = false`;
  const global = `name = '${escaped}' and trashed = false`;

  for (const q of [scoped, global]) {
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=5`;
    const res = await authorizedFetch(url);
    if (!res.ok) throw new Error(`Drive API error (${res.status}) buscando "${name}"`);
    const data = (await res.json()) as { files: DriveFile[] };
    if (data.files?.length) return data.files[0];
  }
  throw new Error(`No se encontró "${name}" en Google Drive`);
}

/** Descarga el binario del archivo (xlsx) como ArrayBuffer. */
export async function downloadFileBytes(fileId: string): Promise<ArrayBuffer> {
  const res = await authorizedFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`);
  return res.arrayBuffer();
}

export interface FetchedWorkbook {
  name: string;
  modifiedTime: string;
  bytes: ArrayBuffer;
}

export async function fetchWorkbookByName(name: string): Promise<FetchedWorkbook> {
  const file = await findFileByName(name);
  const bytes = await downloadFileBytes(file.id);
  return { name: file.name, modifiedTime: file.modifiedTime, bytes };
}
