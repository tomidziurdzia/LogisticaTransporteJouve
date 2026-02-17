# Análisis General del Código — LogisticaTransporteJouve

## Resumen Ejecutivo

**Proyecto:** Aplicación web de logística y gestión financiera para "Jouve · Logística y Transporte".  
**Stack:** Next.js 16.1.6, React 19, Supabase (auth + base de datos), TanStack React Query, Tailwind CSS 4, shadcn/ui.  
**Líneas de código (TS/TSX):** ~6,931  
**Idioma de la UI:** Español (Argentina)

---

## 1. Arquitectura General

### Estructura de carpetas

```
app/
  actions/          → Server Actions (CRUD para accounts, categories, months, transactions)
  auth/             → Rutas de autenticación (login, sign-up, logout, forgot-password, confirm)
  (dashboard)/      → Layout protegido con sidebar + páginas principales
components/
  accounts/         → Tabla CRUD de cuentas
  auth/             → Formularios de login, registro, recuperación de contraseña
  categories/       → Tabla CRUD de categorías y subcategorías
  periods/          → Dashboard de meses, vista de mes, tabla de transacciones, modal de nuevo mes
  providers/        → QueryProvider (React Query)
  ui/               → Componentes base de shadcn/ui
hooks/              → Custom hooks con React Query para cada entidad
lib/
  db/types.ts       → Tipos TypeScript para todas las entidades
  supabase/         → Clientes de Supabase (server, client, proxy/middleware)
migrations/         → Migraciones SQL para la base de datos
```

### Patrón de datos

La app sigue un patrón bien definido:
1. **Server Actions** (`app/actions/`) interactúan con Supabase desde el servidor.
2. **Custom Hooks** (`hooks/`) wrappean las actions con React Query para caching, invalidación y mutaciones.
3. **Componentes** consumen los hooks y manejan estado de UI local.

---

## 2. Modelo de Datos

### Entidades principales

| Entidad | Tabla | Relaciones |
|---------|-------|------------|
| **Account** | `accounts` | Referenciada por `opening_balances` y `transaction_amounts` |
| **Category** | `categories` | Padre de `subcategories`, referenciada por `transactions` |
| **Subcategory** | `subcategories` | Hija de `categories`, referenciada por `transactions` |
| **Month** | `months` | Padre de `opening_balances` y `transactions` |
| **OpeningBalance** | `opening_balances` | Vincula `months` ↔ `accounts` |
| **Transaction** | `transactions` | Pertenece a `months`, referencia `categories`/`subcategories` |
| **TransactionAmount** | `transaction_amounts` | Vincula `transactions` ↔ `accounts` (pivot) |

### Tipos de transacción
- `income` — Ingreso
- `expense` — Gasto
- `internal_transfer` — Transferencia interna
- `adjustment` — Ajuste

### Tipos de cuenta
- `bank`, `cash`, `wallet`, `investment`, `checks`, `other`

---

## 3. Funcionalidades Implementadas

- **Autenticación completa:** Login, registro, logout, recuperación de contraseña, confirmación por email (Supabase Auth).
- **CRUD de Cuentas:** Crear, editar, eliminar cuentas con tipo y saldo de apertura.
- **CRUD de Categorías/Subcategorías:** Gestión completa con tipos de transacción asociados.
- **Gestión de Períodos (Meses):** Crear meses con saldos de apertura calculados desde el cierre del mes anterior.
- **Transacciones:** Tabla inline editable con creación, edición y eliminación. Soporte para transferencias internas con modal dedicado.
- **Filtros:** Por tipo, categoría, descripción y rango de fechas en la tabla de transacciones.
- **Dashboard:** Vista de meses con resumen financiero (saldo apertura, ingresos, gastos, saldo cierre) y balances por cuenta.
- **Tema oscuro/claro** con toggle y soporte `next-themes`.
- **Sidebar colapsable** con navegación y soporte para modo compacto.
- **Breadcrumbs dinámicos** según la ruta actual.

---

## 4. Hallazgos y Problemas Detectados

### CRÍTICO

#### 4.1. Falta el archivo `middleware.ts`
El archivo `proxy.ts` en la raíz exporta una función `proxy` y un `config` con `matcher`, pero **Next.js espera un archivo `middleware.ts`** (o `middleware.js`) que exporte una función `default` llamada `middleware`. El archivo actual:
- Se llama `proxy.ts` en lugar de `middleware.ts`.
- Exporta `proxy` en lugar de la función por defecto `middleware`.
- **Consecuencia:** La protección de rutas mediante Supabase middleware NO está activa. Las sesiones no se refrescan automáticamente.

#### 4.2. Seguridad RLS sin aislamiento por usuario
Todas las políticas RLS de la base de datos usan `using (true)` y `with check (true)`. Esto significa que **cualquier usuario autenticado puede ver y modificar TODOS los datos** de todos los usuarios. No hay aislamiento multi-tenant. Si el sistema es para un solo equipo/empresa esto es aceptable, pero si se planea multi-usuario, es un riesgo severo.

#### 4.3. Eliminación real (hard delete) de cuentas
La acción `deleteAccount` hace un `DELETE` real en la base de datos, pero `accounts` tiene `ON DELETE RESTRICT` en `opening_balances` y `transaction_amounts`. Esto causará errores si se intenta eliminar una cuenta que ya tiene transacciones. La tabla tiene columna `is_active` que sugiere que debería usarse soft-delete.

### IMPORTANTE

#### 4.4. Función `formatCurrency` duplicada 3 veces
La función `formatCurrency` está definida de manera idéntica en:
- `components/accounts/accounts-table.tsx`
- `components/periods/month-view.tsx`
- `components/periods/new-month-modal.tsx`
- `components/periods/month-transactions-table.tsx`

Debería extraerse a `lib/utils.ts`.

#### 4.5. Constante `MONTH_NAMES` duplicada
Definida tanto en `app/actions/months.ts` como en `components/periods/new-month-modal.tsx`.

#### 4.6. Deploy workflow incompatible
El workflow de GitHub Actions (`nextjs.yml`) está configurado para **GitHub Pages con export estático** (`static_site_generator: next`), pero la aplicación usa:
- Server Actions (`"use server"`)
- Cookies dinámicas (`next/headers`)
- Autenticación server-side

Esto **no es compatible con un export estático**. El workflow fallará en el build o la app no funcionará correctamente desplegada.

#### 4.7. Variable de entorno con nombre no estándar
Se usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en lugar del nombre estándar de Supabase que es `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Funciona pero dificulta la integración con documentación y herramientas de Supabase.

#### 4.8. `getSession()` deprecado en el dashboard layout
En `app/(dashboard)/layout.tsx` se usa `supabase.auth.getSession()` para verificar autenticación. Supabase recomienda usar `supabase.auth.getUser()` ya que `getSession()` puede devolver datos desactualizados del token local. El middleware proxy ya usa `getClaims()` correctamente, pero el layout no.

### MEJORAS SUGERIDAS

#### 4.9. Sin manejo de errores global
Los Server Actions simplemente lanzan `throw new Error(error.message)`. No hay `ErrorBoundary` ni manejo consistente en los hooks. Si una action falla, React Query muestra el error en la UI solo en algunos componentes (como `MonthTransactionsTable`), pero otros (como `AccountDialog`) usan `await mutateAsync()` sin `try/catch`, lo que podría causar errores no capturados.

#### 4.10. Sin validación de datos en el servidor
Las Server Actions no validan los inputs antes de enviarlos a Supabase (ej: nombre vacío, tipo inválido). Solo se confía en las constraints de la base de datos. Sería mejor usar un esquema de validación (ej: Zod) para dar mensajes de error claros.

#### 4.11. Operaciones no atómicas en `createMonthWithBalances` y `createTransaction`
Estas funciones hacen múltiples operaciones (INSERT del mes + INSERT de balances) sin una transacción de base de datos. Si el segundo insert falla, quedan datos huérfanos.

#### 4.12. Componente `MonthTransactionsTable` muy grande
Con ~1,334 líneas, este componente maneja:
- Estado de filas borrador
- Estado de edición inline
- Modal de transferencias
- Modal de confirmación de eliminación
- Filtros
- Renderizado de tabla

Sería beneficioso dividirlo en subcomponentes y custom hooks.

#### 4.13. Rutas en sidebar sin páginas implementadas
El sidebar tiene enlaces a `/cash-flow`, `/clients`, `/shipments` y `/settings`, pero no existen archivos `page.tsx` para estas rutas. El usuario obtendrá un 404.

#### 4.14. Sin paginación
Las queries a Supabase (`getAccounts`, `getCategories`, `getMonths`, etc.) no tienen límite ni paginación. Con el crecimiento de datos, esto impactará en rendimiento.

#### 4.15. Confirmación de eliminación inconsistente
- `DeleteAccountDialog` y `DeleteCategoryDialog` usan el componente `Dialog` de shadcn.
- `MonthTransactionsTable` usa un div fijo personalizado con `bg-black/50`.
- Sería mejor unificar el patrón de confirmación.

---

## 5. Puntos Positivos

- **Estructura clara y organizada:** Separación entre actions, hooks y componentes.
- **Tipado fuerte:** Buen uso de TypeScript con interfaces definidas para todas las entidades.
- **UX en español:** Toda la interfaz está en español argentino, consistente con el público objetivo.
- **React Query bien integrado:** Invalidación de queries después de mutaciones, cache configurado con `staleTime`.
- **Diseño responsive:** Uso de clases responsive de Tailwind (`sm:`, `md:`, `lg:`).
- **Modo oscuro/claro:** Integrado con `next-themes` y variables CSS oklch.
- **Validaciones en el frontend:** La tabla de transacciones valida campos obligatorios, consistencia de transferencias internas (suma = 0), y requiere categoría.
- **Migraciones SQL bien estructuradas:** Con índices, constraints únicos, RLS habilitado, y datos seed.

---

## 6. Resumen de Prioridades

| Prioridad | Acción |
|-----------|--------|
| P0 (Crítico) | Renombrar `proxy.ts` → `middleware.ts` y exportar función correcta |
| P0 (Crítico) | Cambiar `deleteAccount` a soft-delete (`is_active = false`) |
| P1 (Importante) | Corregir o eliminar el workflow de GitHub Pages |
| P1 (Importante) | Reemplazar `getSession()` por `getUser()` en el layout |
| P1 (Importante) | Extraer `formatCurrency` y `MONTH_NAMES` a archivos compartidos |
| P2 (Mejora) | Agregar páginas placeholder para rutas del sidebar |
| P2 (Mejora) | Refactorizar `MonthTransactionsTable` en subcomponentes |
| P2 (Mejora) | Agregar validación con Zod en Server Actions |
| P2 (Mejora) | Evaluar aislamiento multi-tenant en RLS |
| P3 (Futuro) | Agregar paginación a queries |
| P3 (Futuro) | Implementar operaciones atómicas con transacciones SQL |
