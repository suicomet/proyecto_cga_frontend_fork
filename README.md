# Frontend - Control de Producción

Frontend Angular del sistema de control de producción para panadería.

## Stack

- **Angular** 20.0.2
- **Cypress** 15.14.1 (E2E tests)
- **Jasmine + Karma** (Unit tests)
- **Mochawesome** (Reportes HTML de tests)

---

## Testing

### Resultados actuales — 15/15 tests pasando ✅

```
Test                            Tests    Estado
─────────────────────────────────────────────────────
login-2fa.cy.ts                    7    ✅  7/7   Login 2FA (paso 1, paso 2, errores, roles)
bodega.cy.ts                       3    ✅  3/3   Bodega (listado, validación stock)
produccion.cy.ts                   2    ✅  2/2   Producción (carga página, API jornadas)
clientes-saldos.cy.ts              1    ✅  1/1   Clientes (carga página)
reportes.cy.ts                     1    ✅  1/1   Reportes (carga página)
ventas.cy.ts                       1    ✅  1/1   Ventas (carga página)
─────────────────────────────────────────────────────
Total                             15    ✅ 15/15
```

### Cobertura de funcionalidades (tests offline con mocks)

| Test | Escenarios |
|---|---|
| **Login 2FA** | Paso 1 visible, campos vacíos, paso 2 al enviar credenciales, código incorrecto, credenciales inválidas, redirección por rol (Admin/Encargado) |
| **Bodega** | Listado de movimientos, validación de cantidad negativa |
| **Producción** | Carga de página, respuesta de API de jornadas |
| **Ventas** | Carga de página de pedidos |
| **Clientes** | Carga de página de saldos |
| **Reportes** | Carga de página de reportes |

---

## Cómo ejecutar los tests

### 1. Tests offline (con mocks, sin backend real)

**Requisito:** Tener el servidor Angular corriendo:
```bash
npx ng serve
```

**Abrir dashboard interactivo:**
```bash
npm run e2e:open
```

**Ejecutar en terminal (headless) con reporte HTML:**
```bash
npm run e2e:report
```

**Ver reporte HTML:**
```bash
start cypress\reports\mochawesome.html
```

### 2. Tests contra producción (con login manual)

Estos tests verifican que el sitio de producción responde correctamente.

**Configuración:** `cypress.config.prod.ts`
- `baseUrl`: `https://proyecto-cga-frontend.vercel.app`
- `specPattern`: `cypress/suite-produccion/**/*.cy.ts`

**Abrir dashboard (incluye login manual con 2FA real):**
```bash
npm run e2e:prod:open
```

**Ejecutar en terminal (solo smoke tests automáticos):**
```bash
npm run e2e:prod
```

**Ver reporte:**
```bash
start cypress\reports-prod\mochawesome.html
```

### 3. Unit tests (Jasmine + Karma)

```bash
npm run test          # Abre navegador con resultados
npm run test:ci       # Headless
npm run coverage      # Con reporte de cobertura
```

---

## Reportes generados

| Comando | Reporte generado | Cómo verlo |
|---|---|---|
| `npm run e2e:report` | `cypress/reports/mochawesome.html` | `start cypress\reports\mochawesome.html` |
| `npm run e2e:prod:open` | Dashboard interactivo | Ventana de Cypress |
| `npm run e2e:prod` | `cypress/reports-prod/mochawesome.html` | `start cypress\reports-prod\mochawesome.html` |
| `npm run coverage` | `coverage/frontend/index.html` | `start coverage\frontend\index.html` |

### Videos

Cada ejecución headless genera un video de los tests:
```
cypress/videos/login-2fa.cy.ts.mp4
cypress/videos/bodega.cy.ts.mp4
...
```

### Screenshots

Si un test falla, se captura automáticamente:
```
cypress/screenshots/<test-name>/<test-name> (failed).png
```

---

## Pruebas de backend

Los tests de backend se encuentran en el repositorio `backend/` y cubren 34 tests de la API REST (autenticación 2FA, bodega, producción, ventas, reportes).

```bash
cd backend
python manage.py test api.tests --keepdb --verbosity=2
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm start` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para producción |
| `npm test` | Unit tests (Jasmine + Karma) |
| `npm run test:ci` | Unit tests headless |
| `npm run coverage` | Unit tests con cobertura |
| `npm run e2e` | Cypress headless (offline) |
| `npm run e2e:open` | Cypress dashboard (offline) |
| `npm run e2e:report` | Cypress headless con reporte HTML |
| `npm run e2e:prod` | Cypress contra producción (headless) |
| `npm run e2e:prod:open` | Cypress contra producción (dashboard) |
