# Tesorería · Transcomerinter — Módulo de Flujo de Caja

Herramienta ejecutiva de tesorería para Transcomerinter Cía. Ltda. Consolida
en tiempo real **BASE CHEQUES**, **05.PROYECCION DE CARTERA** y **PAGOS FIJOS**
desde Google Drive, y calcula el flujo de caja diario, semanal y a 30 días.

No es un dashboard de Excel: es una capa de cálculo propia (motor de flujo de
caja) sobre datos que siempre se leen en vivo desde los archivos fuente. La
única excepción es el saldo de las 13 cuentas bancarias, que Tesorería ingresa
manualmente y que vive solo mientras dura la sesión del navegador.

## Arquitectura

```
src/
  types.ts            Modelo semántico único (CashEvent, DailyBucket, Kpis...)
  config.ts            Nombres de archivos fuente, cuentas bancarias, umbrales
  auth/googleAuth.ts    OAuth con Google Identity Services (solo lectura Drive)
  data/
    driveClient.ts      Búsqueda + descarga de los 3 archivos por nombre
    xlsxUtils.ts         Utilidades de lectura de Excel basadas en encabezados
    parsers/             Un parser por archivo fuente -> CashEvent[]
    engine.ts            Proyección diaria/semanal, KPIs, alertas
    sync.ts               Orquesta auth + descarga + parseo + store
  state/
    store.ts              Estado central + pub/sub (sin framework)
    bankAccounts.ts        Saldos bancarios (sessionStorage, no persistente)
  ui/                     Render funcional (KPIs, tablas, gráficos, filtros...)
```

**Por qué esta arquitectura:** el motor de cálculo (`data/engine.ts`) y la UI
nunca leen columnas de Excel directamente — solo consumen `CashEvent`, el
modelo semántico común. Así, integrar un futuro módulo (nómina, impuestos,
etc.) implica escribir un nuevo parser que produzca `CashEvent[]`, sin tocar
el motor de cálculo ni la interfaz.

## Requisitos previos

- Node.js 20+
- Una cuenta de Google con acceso a los 3 archivos en Drive

## Instalación

```bash
npm install
cp .env.example .env
```

## Conectar con Google Drive (OAuth) — una sola vez

La app se conecta directo desde el navegador a la API de Google Drive, con
permiso de **solo lectura**. No hay backend ni credenciales compartidas.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) y crea (o
   reutiliza) un proyecto.
2. **APIs & Services → Library**: habilita **Google Drive API**.
3. **APIs & Services → OAuth consent screen**: configúralo como "Internal" si
   Transcomerinter usa Google Workspace, o "External" en modo prueba
   agregando `lisbethpenafiel.b@gmail.com` como usuario de prueba.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo: **Web application**
   - Authorized JavaScript origins: agrega `http://localhost:5173` (desarrollo)
     y la URL donde publiques la app en producción (ej. `https://tu-dominio.com`)
   - No hace falta "Authorized redirect URIs" (se usa el flujo implícito de token)
5. Copia el **Client ID** generado (termina en `.apps.googleusercontent.com`)
   y pégalo en `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
6. Reinicia el servidor de desarrollo si estaba corriendo.

Sin este paso, el botón "Sincronizar con Google Drive" queda deshabilitado
pero el resto de la app funciona con la interfaz vacía.

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm run preview   # sirve dist/ localmente para verificar
```

`dist/` es una app 100% estática: se puede publicar en GitHub Pages, Netlify,
Vercel o cualquier hosting estático. Recuerda agregar esa URL final a los
"Authorized JavaScript origins" del Client ID de Google (paso 4 arriba).

## Nota de seguridad: paquete `xlsx`

El paquete `xlsx` (SheetJS) publicado en el registro de npm tiene dos
advisories conocidos (prototype pollution y ReDoS) que SheetJS ya no parcha
en npm por política del registro; el fix oficial solo se distribuye desde su
propio CDN (`https://cdn.sheetjs.com/...`). El riesgo real aquí es bajo: la
app solo procesa los 3 archivos corporativos que el propio usuario descarga
de su Drive autenticado, no archivos subidos por terceros. Aun así, se
recomienda instalar la versión parcheada cuando el entorno de red lo permita:

```bash
npm uninstall xlsx
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

## Mejoras propuestas al modelo de datos fuente

Antes de construir el módulo se analizó la estructura real de los 3 archivos.
Hallazgos que conviene corregir en el origen para un flujo de caja más preciso:

1. **PAGOS FIJOS.xlsx** hoy solo contiene el cronograma de convenios de deuda
   IESS. Faltan nómina, arriendos, servicios básicos, seguros, leasing, etc.
   El dashboard muestra un aviso explícito de esta limitación en el KPI
   "Pagos Fijos". Recomendado: ampliar el archivo a una tabla normalizada
   `Concepto, Categoría, Beneficiario, Periodicidad, Día de pago, Monto,
   Cuenta origen`.
2. **BASE CHEQUES**: la columna `BANCO` trae valores como "LOJA" que parecen
   ser plaza/sucursal, no uno de los 13 nombres reales de cuenta bancaria. Por
   eso el consolidado se maneja a nivel de "Total Disponible en Bancos" y no
   por cuenta individual. Para desglosar cheques por cuenta, `BANCO` debe
   normalizarse a los 13 nombres reales.
3. **PROYECCION DE CARTERA → RESUMEN**: la cobranza se agenda por día de la
   semana (LUNES/MARTES/...), sin fecha calendario. El motor resuelve esto a
   la próxima fecha real de ese día de la semana; sería más preciso agregar
   una columna `FECHA ESTIMADA DE COBRO` explícita.
4. **BASE CHEQUES → ESTADO**: mezcla catálogo cerrado con notas libres (ej.
   "PROTESTADO - SE REALIZA TRANSFERENCIA DEL PICHINCHA"). El parser clasifica
   por palabra clave; sería más robusto separar `ESTADO` (catálogo cerrado) de
   `OBSERVACIONES` (texto libre).
5. **PROYECCION DE CARTERA → legal / DETALLE LEGAL**: se usa para excluir
   automáticamente cartera de partes relacionadas, en proceso legal, dada de
   baja o cruces de cuentas (no generan caja real). "POR SOLUCIONAR" se
   conserva pero marcado como alto riesgo.
6. La columna `DIAS ANTI` de BASE CHEQUES trae una fórmula rota (texto literal
   "ERROR"); el parser la ignora.

## Saldos Bancarios (excepción del módulo)

Los saldos de las 13 cuentas bancarias **no provienen de ningún Excel**.
Tesorería los ingresa en la pestaña "Saldos Bancarios"; el valor vive en
`sessionStorage` del navegador y se pierde al cerrar la pestaña — nunca se
escribe en disco, en Excel ni se envía a ningún servidor.
