# Análisis General del Código — LogisticaTransporteJouve

> **Última actualización:** 17 Feb 2026 — Incluye commits hasta `2e748b9` (merge PR #7 — subcategories)

## Resumen Ejecutivo

**Proyecto:** Aplicación web de logística y gestión financiera para "Jouve · Logística y Transporte".  
**Stack:** Next.js 16.1.6, React 19, Supabase (auth + base de datos), TanStack React Query, Tailwind CSS 4, shadcn/ui.  
**Líneas de código (TS/TSX):** ~7,087  
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
  format.ts         → Utilidad compartida formatCurrency (NUEVO)
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
- **Subcategorías en transacciones:** Selector de subcategoría dependiente de la categoría seleccionada, tanto en creación como en edición de transacciones.
- **Filtros:** Por tipo, categoría, subcategoría, descripción y rango de fechas en la tabla de transacciones.
- **Dashboard:** Vista de meses con resumen financiero (saldo apertura, ingresos, gastos, saldo cierre) y balances por cuenta.
- **Tema oscuro/claro** con toggle y soporte `next-themes`.
- **Sidebar colapsable** con navegación y soporte para modo compacto (por defecto colapsada).
- **Breadcrumbs dinámicos** según la ruta actual.

---

## 4. Cambios Recientes (PR #7 — subcategories)

### 4.1. `lib/format.ts` — NUEVO
- Se creó un módulo compartido con `formatCurrency()`.
- **Resuelve** la duplicación que se detectó en el análisis anterior (punto 4.4).
- `accounts-table.tsx`, `month-view.tsx`, `new-month-modal.tsx` y `month-transactions-table.tsx` ahora importan desde `@/lib/format`.

### 4.2. `month-transactions-table.tsx` — Cambios significativos (+319 / -163 líneas)
- **Subcategoría integrada:** Se agregó `subcategory_id` al `DraftRow`, `RowEdit`, y al merge/display.
- **Columnas reordenadas:** La tabla ahora muestra Fecha → Tipo → Categoría → Subcategoría → Descripción → [Cuentas] → Total → Acciones (antes la categoría estaba al final).
- **Selector de subcategoría:** Nuevo `<select>` dependiente de la categoría seleccionada, con función `getSubcategoriesForCategory()`.
- **Filtro de subcategoría:** Nuevo filtro que se habilita al seleccionar una categoría. Se resetea automáticamente al cambiar categoría.
- **Mejora en transferencias internas:** Al cancelar el modal de transferencia, se restauran `category_id` y `subcategory_id` previos. Se limpian los campos de transferencia correctamente.
- **Normalización de montos mejorada:** En `saveEditedRow`, se diferencia entre `income` (siempre positivo), `expense` (siempre negativo) y `adjustment`/`internal_transfer` (se respeta el signo).
- **Limpieza de categoría al cambiar tipo:** Al seleccionar "internal_transfer", se limpia tanto `category_id` como `subcategory_id`.
- **Formato de fecha mejorado:** `formatDate()` ahora incluye el año (`day: "2-digit", month: "2-digit", year: "numeric"`).
- **Input de montos en modo expense:** Ahora muestra el valor absoluto (`Math.abs(amount)`) en el campo y almacena como negativo internamente.

### 4.3. `month-view.tsx` — Cambios menores
- Se importa `useSubcategories()` y se pasa `subcategories` como prop a `MonthTransactionsTable`.
- Se usa `formatCurrency` desde `@/lib/format`.

### 4.4. `app/(dashboard)/layout.tsx` — Cambio menor
- `SidebarProvider` ahora tiene `defaultOpen={false}` — el sidebar comienza colapsado.

### 4.5. `accounts-table.tsx` y `new-month-modal.tsx` — Limpieza
- Se eliminaron las definiciones locales de `formatCurrency()` en favor del import compartido.

---

## 5. Hallazgos y Problemas Detectados

### CRÍTICO

#### 5.1. Falta el archivo `middleware.ts`
El archivo `proxy.ts` en la raíz exporta una función `proxy` y un `config` con `matcher`, pero **Next.js espera un archivo `middleware.ts`** (o `middleware.js`) que exporte una función `default` llamada `middleware`. El archivo actual:
- Se llama `proxy.ts` en lugar de `middleware.ts`.
- Exporta `proxy` en lugar de la función por defecto `middleware`.
- **Consecuencia:** La protección de rutas mediante Supabase middleware NO está activa. Las sesiones no se refrescan automáticamente.

#### 5.2. Seguridad RLS sin aislamiento por usuario
Todas las políticas RLS de la base de datos usan `using (true)` y `with check (true)`. Esto significa que **cualquier usuario autenticado puede ver y modificar TODOS los datos** de todos los usuarios. No hay aislamiento multi-tenant. Si el sistema es para un solo equipo/empresa esto es aceptable, pero si se planea multi-usuario, es un riesgo severo.

#### 5.3. Eliminación real (hard delete) de cuentas
La acción `deleteAccount` hace un `DELETE` real en la base de datos, pero `accounts` tiene `ON DELETE RESTRICT` en `opening_balances` y `transaction_amounts`. Esto causará errores si se intenta eliminar una cuenta que ya tiene transacciones. La tabla tiene columna `is_active` que sugiere que debería usarse soft-delete.

### IMPORTANTE

#### 5.4. ~~Función `formatCurrency` duplicada~~ — RESUELTO
Se creó `lib/format.ts` y todos los componentes importan desde ahí. Sin embargo, `MONTH_NAMES` todavía está duplicada en `app/actions/months.ts` y `components/periods/new-month-modal.tsx`.

#### 5.5. Deploy workflow incompatible
El workflow de GitHub Actions (`nextjs.yml`) está configurado para **GitHub Pages con export estático** (`static_site_generator: next`), pero la aplicación usa:
- Server Actions (`"use server"`)
- Cookies dinámicas (`next/headers`)
- Autenticación server-side

Esto **no es compatible con un export estático**. El workflow fallará en el build o la app no funcionará correctamente desplegada.

#### 5.6. Variable de entorno con nombre no estándar
Se usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en lugar del nombre estándar de Supabase que es `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Funciona pero dificulta la integración con documentación y herramientas de Supabase.

#### 5.7. `getSession()` deprecado en el dashboard layout
En `app/(dashboard)/layout.tsx` se usa `supabase.auth.getSession()` para verificar autenticación. Supabase recomienda usar `supabase.auth.getUser()` ya que `getSession()` puede devolver datos desactualizados del token local. El middleware proxy ya usa `getClaims()` correctamente, pero el layout no.

#### 5.8. `MonthTransactionsTable` sigue creciendo (ahora ~1,500 líneas)
Con los cambios de subcategorías, el componente creció de ~1,334 a ~1,500 líneas. Sigue concentrando:
- Estado de filas borrador y edición inline
- Modal de transferencias con restauración de estado
- Modal de confirmación de eliminación
- Filtros (ahora 6 filtros diferentes)
- Renderizado complejo de tabla con modo edición/lectura

La complejidad sigue creciendo y se beneficiaría de una refactorización en subcomponentes y hooks personalizados.

### NUEVOS HALLAZGOS

#### 5.9. `useSubcategories()` se llama sin filtro en `MonthView`
En `month-view.tsx` (línea 20), se invoca `useSubcategories()` sin pasar `categoryId`, lo que trae **todas las subcategorías de todas las categorías**. Esto funciona correctamente para el caso de uso actual (la tabla filtra internamente con `getSubcategoriesForCategory`), pero es ineficiente si hay muchas subcategorías. Considerar si es mejor cargar bajo demanda.

#### 5.10. Reseteo de `subcategory_id` incompleto al cambiar tipo (no-transfer)
En `month-transactions-table.tsx`, al cambiar el tipo de transacción a algo que no sea `internal_transfer` (líneas 1057-1093), se resetea `category_id: null` pero **no se resetea `subcategory_id`**. Esto podría dejar una subcategoría huérfana asociada a una categoría de otro tipo. Solo en el caso de draft (`isDraft`) se nota este gap; en el caso de edición de filas existentes tampoco se limpia.

#### 5.11. Cast inseguro con `null as string | null`
En `month-transactions-table.tsx` (líneas 1127 y 1169), hay un patrón:
```typescript
const nextCategoryId = e.target.value || (null as string | null);
```
El cast `null as string | null` es innecesario y confuso. Bastaría con `e.target.value || null`.

#### 5.12. Falta prop `subcategory_id` en `CreateTransactionInput`
En `app/actions/transactions.ts`, la interfaz `CreateTransactionInput` ya incluye `subcategory_id`, y se está pasando correctamente desde `saveDraftRow`. Sin embargo, la interfaz `UpdateTransactionInput` también la incluye y se pasa correctamente. Todo consistente aquí.

---

## 6. Puntos Positivos

- **Estructura clara y organizada:** Separación entre actions, hooks y componentes.
- **Tipado fuerte:** Buen uso de TypeScript con interfaces definidas para todas las entidades.
- **UX en español:** Toda la interfaz está en español argentino, consistente con el público objetivo.
- **React Query bien integrado:** Invalidación de queries después de mutaciones, cache configurado con `staleTime`.
- **Diseño responsive:** Uso de clases responsive de Tailwind (`sm:`, `md:`, `lg:`).
- **Modo oscuro/claro:** Integrado con `next-themes` y variables CSS oklch.
- **Validaciones en el frontend:** La tabla de transacciones valida campos obligatorios, consistencia de transferencias internas (suma = 0), y requiere categoría.
- **Migraciones SQL bien estructuradas:** Con índices, constraints únicos, RLS habilitado, y datos seed.
- **Refactoring reciente positivo:** Extracción de `formatCurrency` a un módulo compartido demuestra buena práctica de código limpio.
- **UX de subcategorías bien pensada:** El selector se habilita/deshabilita correctamente según la categoría y el tipo de transacción. El filtro de subcategoría se resetea al cambiar categoría.

---

## 7. Resumen de Prioridades

| Prioridad | Acción | Estado |
|-----------|--------|--------|
| P0 (Crítico) | Renombrar `proxy.ts` → `middleware.ts` y exportar función correcta | Pendiente |
| P0 (Crítico) | Cambiar `deleteAccount` a soft-delete (`is_active = false`) | Pendiente |
| P1 (Importante) | Corregir o eliminar el workflow de GitHub Pages | Pendiente |
| P1 (Importante) | Reemplazar `getSession()` por `getUser()` en el layout | Pendiente |
| P1 (Importante) | Extraer `MONTH_NAMES` a un módulo compartido | Pendiente |
| P1 (Importante) | Resetear `subcategory_id` al cambiar tipo de transacción (no solo categoría) | Pendiente |
| P2 (Mejora) | Agregar páginas placeholder para rutas del sidebar | Pendiente |
| P2 (Mejora) | Refactorizar `MonthTransactionsTable` en subcomponentes | Pendiente |
| P2 (Mejora) | Limpiar cast innecesario `null as string \| null` | Pendiente |
| P2 (Mejora) | Agregar validación con Zod en Server Actions | Pendiente |
| P2 (Mejora) | Evaluar aislamiento multi-tenant en RLS | Pendiente |
| P3 (Futuro) | Agregar paginación a queries | Pendiente |
| P3 (Futuro) | Implementar operaciones atómicas con transacciones SQL | Pendiente |
| RESUELTO | ~~Extraer `formatCurrency` a archivo compartido~~ | Resuelto en PR #7 |
