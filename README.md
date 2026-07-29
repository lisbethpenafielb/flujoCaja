# Tesorería · Transcomerinter — Módulo de Flujo de Caja

Herramienta ejecutiva de tesorería para Transcomerinter Cía. Ltda. Consolida
en tiempo real **BASE CHEQUES**, **05.PROYECCION DE CARTERA** y **PAGOS FIJOS**
desde Google Drive, y calcula el flujo de caja diario, semanal y a 30 días.

No es un dashboard de Excel: es una capa de cálculo propia (motor de flujo de
caja) sobre datos que siempre se leen en vivo desde los archivos fuente. Las
excepciones son el saldo de los 6 bancos y las partidas Préstamo Perú /
Préstamos Terceros (ninguna de las dos existe en los Excel fuente), que
Tesorería ingresa manualmente y que viven solo mientras dura la sesión del
navegador.

## Pestañas

- **Resumen Ejecutivo** — KPIs, semáforo de riesgo y alertas.
- **Flujo Diario / Flujo Semanal** — Flujo de caja en formato matriz (filas =
  bancos + partidas de movimiento, columnas = día o semana), con columna
  REZAGADOS (backlog anterior a la fecha "Desde") y arrastre de saldo en
  cascada, igual a la plantilla de control que ya usa Tesorería. Las filas
  Préstamo Perú y Préstamos Terceros se digitan a mano por día en Flujo
  Diario (esa información no existe en BASE CHEQUES); Flujo Semanal solo
  muestra el acumulado, de solo lectura.
- **Cheques Rezagados** — cheques con fecha anterior a hoy aún no cobrados.
  Filtros: Estado, Banco, Estatus 2, Negociación.
- **Cheques Diarios** — todos los cheques, ordenados por fecha. Filtros:
  Estado, Mes, Banco, Negociación, Año, Semana.
- **Tabla de Cheques** — tabla dinámica Año › Mes › Día con la suma de
  cheques no cobrados; clic en un día para desplegar el detalle. Filtros:
  Estado, Banco, Negociación, Semana.
- **Saldos Bancarios** — ingreso manual de los 6 bancos (ver excepción abajo).
- **Alertas** — alertas automáticas del período filtrado.

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
    engine.ts            Proyección diaria/semanal, matriz de tesorería, KPIs,
                          alertas, pivote de cheques (Año › Mes › Día)
    sync.ts               Orquesta auth + descarga + parseo + store
  state/
    store.ts              Estado central + pub/sub (sin framework)
    bankAccounts.ts        Saldos bancarios (sessionStorage, no persistente)
  ui/                     Render funcional (KPIs, tablas, matriz, filtros...)
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
2. **BASE CHEQUES**: la columna `BANCO` coincide con los 6 bancos reales de
   Transcomerinter (Pichincha, Produbanco, Guayaquil, Austro, Internacional,
   Loja — este último es Banco de Loja). El Flujo de Caja usa esta columna
   solo como filtro/dato descriptivo del cheque; el saldo de cada banco en la
   matriz proviene siempre del ingreso manual en "Saldos Bancarios", nunca de
   BASE CHEQUES.
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

## Columnas de BASE CHEQUES (confirmadas por Tesorería)

`src/data/parsers/cheques.ts` lee estas columnas **por letra** (no por texto
de encabezado), porque Tesorería confirmó su posición exacta en el archivo:

| Columna | Campo | Uso |
|---|---|---|
| G | ESTADO | Estado del cheque (ENTREGADO/PAGADO/ANULADO/PROTESTADO...) |
| J | MES | Filtro "Mes" en Cheques Diarios |
| K | AÑO | Filtro "Año" en Cheques Diarios |
| Q | BANCO | Filtro "Banco" en las 3 pestañas de cheques |
| T | ESTATUS 2 | Filtro "Estatus 2" en Cheques Rezagados; también decide si un cheque está cobrado (ver más abajo) |
| W | NEGOCIACION | Filtro "Negociación" en las 3 pestañas de cheques |

Si Tesorería reorganiza las columnas de BASE CHEQUES, hay que actualizar el
objeto `COL` al inicio de `cheques.ts` con las nuevas letras.

## Datos de ingreso manual (excepciones del módulo)

Dos cosas **no provienen de ningún Excel** y se ingresan a mano; ambas viven
solo en `sessionStorage` del navegador y se pierden al cerrar la pestaña —
nunca se escriben en disco, en Excel ni se envían a ningún servidor:

- **Saldos de los 6 bancos** — pestaña "Saldos Bancarios".
- **Préstamo Perú y Préstamos Terceros** — celdas editables por día en la
  pestaña "Flujo Diario". Internamente se tratan como un cheque más (mismo
  motor de cálculo), pero nunca se mezclan con BASE CHEQUES en las pestañas
  de cheques (Rezagados, Diarios, Tabla) — esas son siempre 100% Excel.

## Cheques ya cobrados

Un cheque cuyo `ESTATUS 2` (columna `estatusCobro`) es `COBRADO` ya salió de
la cuenta — su efecto ya está reflejado en el saldo bancario que Tesorería
ingresa manualmente. Por eso el motor lo excluye de toda proyección hacia
adelante (Flujo Diario/Semanal, KPIs, Alertas) para no restarlo dos veces;
solo aparece en "Cheques Diarios" (que muestra el universo completo) y queda
fuera de "Cheques Rezagados" y "Tabla de Cheques" (ambas son, por
definición, cheques **no cobrados**).
