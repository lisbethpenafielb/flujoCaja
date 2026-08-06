# CLAUDE.md — Tesorería · Transcomerinter (Módulo Flujo de Caja)

Este archivo es para vos, agente de Claude Code, cuando retomes este proyecto
en la máquina local del usuario. Léelo completo antes de tocar código.

## Qué es esto

App web 100% estática (sin backend) que consolida en tiempo real tres
archivos Excel de Google Drive (**BASE CHEQUES**, **05.PROYECCION DE
CARTERA**, **PAGOS FIJOS**) y calcula flujo de caja diario, semanal y a 30
días para el área de Tesorería de Transcomerinter Cía. Ltda. Se conecta a
Google Drive vía OAuth desde el navegador (solo lectura), sin credenciales
compartidas ni servidor propio.

Para el detalle funcional completo (pestañas, reglas de negocio, columnas de
Excel, datos de ingreso manual, limitaciones conocidas de las fuentes) **el
README.md de este mismo repo es la fuente de verdad** — no la dupliques acá,
léelo antes de hacer cambios funcionales.

## Stack técnico

- **TypeScript + Vite**, sin framework de UI (DOM manipulado a mano en `src/ui/`)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Vitest** para el motor de cálculo (`src/data/engine.test.ts`)
- Librería `xlsx` (SheetJS) para parsear los Excel descargados de Drive
- Sin base de datos ni backend: todo corre en el navegador; persistencia de
  datos manuales solo en `sessionStorage`

## Arquitectura (por qué está organizado así)

```
src/
  types.ts             Modelo semántico único (CashEvent, DailyBucket, Kpis...)
  config.ts             Nombres de archivos fuente, cuentas bancarias, umbrales
  auth/googleAuth.ts     OAuth con Google Identity Services (solo lectura Drive)
  data/
    driveClient.ts       Búsqueda + descarga de los 3 archivos por nombre
    xlsxUtils.ts          Utilidades de lectura de Excel basadas en encabezados
    parsers/              Un parser por archivo fuente -> CashEvent[]
    engine.ts             Proyección diaria/semanal, matriz de tesorería, KPIs,
                           alertas, pivote de cheques (Año › Mes › Día)
    sync.ts                Orquesta auth + descarga + parseo + store
  state/
    store.ts               Estado central + pub/sub (sin framework)
    sessionStorageJson.ts   Helper compartido de persistencia en sessionStorage
    bankAccounts.ts, manualLoans.ts, manualPagos.ts, manualRecaudos.ts,
    excelEstados.ts         Datos de ingreso manual (ver README, sección
                             "Datos de ingreso manual")
  ui/                      Render funcional (KPIs, tablas, matriz, filtros...)
```

Regla de oro del diseño: **el motor de cálculo (`data/engine.ts`) y la UI
nunca leen columnas de Excel directamente** — solo consumen `CashEvent`, el
modelo semántico común. Un módulo nuevo (nómina, impuestos, etc.) se integra
escribiendo un parser que produzca `CashEvent[]`, sin tocar el motor ni la
UI. Mantené esta separación al agregar funcionalidad.

## Cómo arrancar en esta máquina

```bash
npm install
cp .env.example .env
# completar VITE_GOOGLE_CLIENT_ID en .env (ver README.md, sección
# "Conectar con Google Drive (OAuth)")
npm run dev
```

## Comandos

```bash
npm run dev       # servidor de desarrollo (Vite)
npm test          # motor de cálculo (vitest)
npm run build     # tsc + build de producción -> dist/
npm run preview   # sirve dist/ localmente para verificar el build
```

Corré `npm test` y `npm run build` antes de dar por terminado cualquier
cambio en `src/data/engine.ts` o en los parsers — son el corazón numérico de
la app y tienen tests dedicados.

## Desplegar en Cloudflare Pages

La app es estática (`dist/`), así que Cloudflare Pages es la opción natural.
Dos caminos, elegí el que ya tenga el usuario configurado:

### Opción A — Conectar el repo de Git (recomendado, deploys automáticos)

1. Subí este proyecto a un repositorio de GitHub/GitLab (`git init`, commit,
   `git remote add origin ...`, `git push`).
2. En el dashboard de Cloudflare (https://dash.cloudflare.com) → **Workers &
   Pages → Create → Pages → Connect to Git** y elegí el repo.
3. Configuración de build:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** (Settings → Environment variables), en
   Production y Preview: agregar `VITE_GOOGLE_CLIENT_ID` con el Client ID de
   OAuth de Google (mismo valor que en `.env` local, ver README.md).
5. Deploy. Cloudflare te da una URL `*.pages.dev`.
6. **Importante**: agregar esa URL final (y el dominio custom si lo hay) a
   los "Authorized JavaScript origins" del OAuth Client ID en Google Cloud
   Console — si no, el login de Google falla en producción aunque el deploy
   esté bien.

### Opción B — Deploy directo con Wrangler (sin conectar Git)

```bash
npm install -g wrangler        # o usar npx wrangler
npm run build
npx wrangler pages deploy dist --project-name=tesoreria-flujo-caja
```

La primera vez, `wrangler` va a pedir login (`wrangler login`) y crear el
proyecto de Pages si no existe. Las variables de entorno (`VITE_GOOGLE_CLIENT_ID`)
en este camino se configuran igual desde el dashboard de Cloudflare, sección
Settings del proyecto de Pages (las env vars de Vite se inyectan en **build
time**, así que tienen que estar seteadas antes de correr el build, ya sea
localmente en `.env` o en Cloudflare si el build corre ahí).

### Nota sobre variables de entorno de Vite

`VITE_GOOGLE_CLIENT_ID` se incrusta en el bundle en tiempo de build (prefijo
`VITE_` = expuesto al cliente, es esperado para un Client ID de OAuth
público). Si cambiás el valor, hay que rebuildear/redeployar — no alcanza con
cambiar la env var y refrescar la página en un build ya generado.

## Cosas a NO hacer

- No agregues backend/servidor propio: la app es intencionalmente
  client-only (auth directa del navegador a Google Drive).
- No hagas persistente en localStorage/backend lo que hoy vive en
  `sessionStorage` (saldos bancarios, préstamos y pagos/recaudos manuales)
  sin que Tesorería lo pida explícitamente — es una decisión de producto
  documentada en el README ("Datos de ingreso manual"), no un descuido.
- No cambies las columnas por letra que lee `src/data/parsers/cheques.ts`
  (`COL` al inicio del archivo) sin confirmar con Tesorería que la
  estructura de BASE CHEQUES cambió — están fijadas por letra a propósito
  porque los encabezados no son estables.
- No subas `.env` (contiene el Client ID de OAuth) — ya está en
  `.gitignore`, no lo saques de ahí.

## Estado del proyecto / contacto

- Empresa: Transcomerinter Cía. Ltda., área Tesorería.
- Usuaria de referencia: lisbethpenafiel.b@gmail.com (usuario de prueba OAuth
  mientras el consent screen esté en modo "External / Testing").
- Repo de origen de este export: `lisbethpenafielb/flujocaja` en GitHub,
  rama de desarrollo `claude/tesoreria-transcomerinter-module-akkozg`.
