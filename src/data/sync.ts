import { SOURCE_FILES } from '../config';
import { requestAccessToken } from '../auth/googleAuth';
import { fetchWorkbookByName } from './driveClient';
import { parseChequesWorkbook } from './parsers/cheques';
import { parseCarteraWorkbook } from './parsers/cartera';
import { parsePagosFijosWorkbook } from './parsers/pagosFijos';
import { store } from '../state/store';
import type { CashEvent } from '../types';

export async function syncFromDrive(): Promise<void> {
  store.setSyncStatus('authenticating');
  try {
    await requestAccessToken(true);
  } catch (err) {
    store.setSyncStatus('error', err instanceof Error ? err.message : 'No se pudo autenticar con Google');
    return;
  }

  store.setSyncStatus('loading');
  const warnings: string[] = [];
  const allEvents: CashEvent[] = [];
  const allExcluded: CashEvent[] = [];

  try {
    const [cheques, cartera, pagosFijos] = await Promise.all([
      fetchWorkbookByName(SOURCE_FILES.cheques),
      fetchWorkbookByName(SOURCE_FILES.cartera),
      fetchWorkbookByName(SOURCE_FILES.pagosFijos),
    ]);

    const chequeEvents = parseChequesWorkbook(cheques.bytes, warnings);
    allEvents.push(...chequeEvents.filter((e) => !e.excluded));
    allExcluded.push(...chequeEvents.filter((e) => e.excluded));

    const carteraResult = parseCarteraWorkbook(cartera.bytes, warnings);
    allEvents.push(...carteraResult.events);
    allExcluded.push(...carteraResult.excluded);

    const pagosFijosEvents = parsePagosFijosWorkbook(pagosFijos.bytes, warnings);
    allEvents.push(...pagosFijosEvents);

    store.setDataset(allEvents, allExcluded, warnings);
  } catch (err) {
    store.setSyncStatus('error', err instanceof Error ? err.message : 'Error desconocido al sincronizar');
  }
}
