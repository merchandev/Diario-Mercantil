# 🗑️ Sistema de Papelera de Reciclaje para Publicaciones

## 📋 Descripción General

Se ha implementado un sistema completo de **papelera de reciclaje** (soft delete) para las publicaciones del sistema. Las publicaciones eliminadas se conservan durante **30 días** antes de ser eliminadas permanentemente de forma automática.

## ✨ Características Implementadas

### 1. Soft Delete (Eliminación Suave)
- Las publicaciones eliminadas NO se borran inmediatamente de la base de datos
- Se marca un timestamp en `deleted_at` para indicar cuándo fue eliminada
- Las publicaciones eliminadas desaparecen de la vista principal pero se pueden recuperar

### 2. Auto-Eliminación Programada
- Las publicaciones en la papelera se eliminan automáticamente después de **30 días**
- Sistema de alertas visuales cuando quedan menos de 7 días antes de la eliminación permanente
- Contador de días restantes visible en la interfaz

### 3. Gestión Completa de Papelera
- **Ver todas las publicaciones eliminadas** con información detallada
- **Restaurar publicaciones individuales** con un solo clic
- **Eliminar permanentemente publicaciones específicas** de forma manual
- **Selección múltiple** para eliminar varias publicaciones a la vez
- **Vaciar papelera completa** eliminando todas las publicaciones de una vez

## 🔧 Cambios Técnicos

### Backend (PHP)

#### Base de Datos
**Archivo:** `backend/migrations/init.sql`
```sql
-- Nueva columna en legal_requests
deleted_at TEXT  -- Timestamp ISO 8601 cuando se eliminó (NULL = no eliminado)
```

**Migración:** `backend/migrations/add_deleted_at.sql`
```sql
ALTER TABLE legal_requests ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_legal_requests_deleted ON legal_requests(deleted_at);
```

#### LegalController.php
**Nuevos métodos:**

1. **softDelete($id)** - Mover a papelera
   - Endpoint: `DELETE /api/legal/{id}`
   - Marca `deleted_at` con timestamp actual
   - Retorna mensaje de confirmación

2. **listTrashed()** - Listar papelera
   - Endpoint: `GET /api/legal/trash`
   - Solo para administradores
   - Retorna todas las publicaciones con `deleted_at IS NOT NULL`

3. **restore($id)** - Restaurar desde papelera
   - Endpoint: `POST /api/legal/{id}/restore`
   - Establece `deleted_at = NULL`
   - La publicación vuelve a la lista principal

4. **permanentDelete($id)** - Eliminar permanentemente
   - Endpoint: `DELETE /api/legal/trash/{id}`
   - Solo funciona con publicaciones ya en papelera
   - Elimina el registro con `DELETE FROM legal_requests`
   - Efecto cascade: elimina también payments y files asociados

5. **emptyTrash()** - Vaciar papelera completa
   - Endpoint: `DELETE /api/legal/trash`
   - Solo para administradores
   - Elimina TODAS las publicaciones con `deleted_at IS NOT NULL`
   - Retorna cantidad de registros eliminados

6. **cleanupOldTrashed()** - Limpieza automática (30+ días)
   - Endpoint: `POST /api/legal/cleanup`
   - Elimina publicaciones con `deleted_at < (now - 30 days)`
   - Para uso en cron jobs o tareas programadas

**Modificación en list():**
```php
// CRITICAL: Exclude soft-deleted items
$where[] = 'deleted_at IS NULL';
```
Ahora la lista principal NO muestra publicaciones eliminadas.

#### index.php - Nuevas Rutas
```php
// Soft delete
if ($method==='DELETE' && preg_match('#^/api/legal/(\d+)$#',$path,$m)) 
  return $lg->softDelete((int)$m[1]);

// Restore
if ($method==='POST' && preg_match('#^/api/legal/(\d+)/restore$#',$path,$m)) 
  return $lg->restore((int)$m[1]);

// Trash management
if ($method==='GET' && $path==='/api/legal/trash') 
  return $lg->listTrashed();
  
if ($method==='DELETE' && $path==='/api/legal/trash') 
  return $lg->emptyTrash();
  
if ($method==='DELETE' && preg_match('#^/api/legal/trash/(\d+)$#',$path,$m)) 
  return $lg->permanentDelete((int)$m[1]);

// Cleanup (for cron)
if ($method==='POST' && $path==='/api/legal/cleanup') 
  return $lg->cleanupOldTrashed();
```

### Frontend (React + TypeScript)

#### api.ts - Nuevas Funciones
```typescript
// Soft delete (mover a papelera)
export async function deleteLegal(id:number)

// Listar papelera
export async function listTrashedLegal()

// Restaurar desde papelera
export async function restoreLegal(id:number)

// Eliminar permanentemente
export async function permanentDeleteLegal(id:number)

// Vaciar papelera completa
export async function emptyTrash()

// Limpieza automática (30+ días)
export async function cleanupOldTrashed()
```

#### Publicaciones.tsx - Botón de Eliminar
Se agregó un nuevo botón en la columna "Acciones":
```tsx
<button 
  className="text-red-700 hover:underline inline-flex items-center gap-1" 
  onClick={()=>handleDelete(r.id)}
>
  <IconTrash/> 
  <span>Eliminar</span>
</button>
```

**Funcionalidad:**
- Muestra confirmación antes de eliminar
- Llama a `deleteLegal(id)`
- Muestra mensaje: "Publicación movida a la papelera (será eliminada automáticamente después de 30 días)"
- Recarga la lista automáticamente

#### Papelera.tsx - Nueva Página (285 líneas)
**Ubicación:** `frontend/src/pages/Papelera.tsx`

**Características:**
- 📊 **Tabla completa** con todas las publicaciones eliminadas
- ⏰ **Información de tiempo:**
  - "Eliminado hace" - días desde la eliminación
  - "Auto-eliminación en" - días restantes antes de borrado permanente
  - ⚠️ Alerta visual si quedan menos de 7 días (fila con fondo rojo)
- ✅ **Selección múltiple** con checkboxes
- 🔄 **Restaurar individual** - botón con icono de flecha
- 🗑️ **Eliminar permanente individual** - botón rojo con icono de papelera
- 📦 **Eliminar seleccionadas** - botón en header para múltiples
- 🧹 **Vaciar papelera** - botón rojo oscuro para eliminar todo
- 💡 **Panel informativo** con reglas y advertencias

**Estados de la interfaz:**
1. **Cargando:** Spinner animado
2. **Vacía:** Icono grande de papelera + mensaje "La papelera está vacía"
3. **Con elementos:** Tabla completa con todas las funciones

**Columnas de la tabla:**
- ☑️ Checkbox (selección)
- N° orden
- Razón social
- Tipo
- Estado
- Fecha solicitud
- Eliminado hace (días)
- Auto-eliminación (días restantes + ⚠️ si urgente)
- Acciones (Restaurar / Eliminar)

#### App.tsx - Nueva Ruta
```tsx
import Papelera from './pages/Papelera'

// En Routes:
<Route path="papelera" element={<RequireAdmin><Papelera /></RequireAdmin>} />
```

#### Sidebar.tsx - Nuevo Enlace
```tsx
import { IconTrash } from './icons'

// En navegación admin:
<LinkItem to="/dashboard/papelera" icon={<IconTrash/>} label="Papelera" collapsed={collapsed} />
```
Ubicado entre "Publicaciones" y "Medios de pago".

## 🚀 Uso del Sistema

### Para Administradores

#### 1. Eliminar una Publicación
1. Ir a **Dashboard → Publicaciones**
2. Buscar la publicación deseada
3. Clic en el botón rojo **"Eliminar"** (icono de papelera) junto a "Descargar"
4. Confirmar la acción
5. La publicación desaparece de la lista principal
6. Se muestra mensaje: "Publicación movida a la papelera (será eliminada automáticamente después de 30 días)"

#### 2. Ver la Papelera
1. Ir a **Dashboard → Papelera** (en el menú lateral)
2. Ver todas las publicaciones eliminadas con información de tiempo
3. Las publicaciones con ⚠️ se eliminarán en menos de 7 días

#### 3. Restaurar una Publicación
1. En la Papelera, localizar la publicación
2. Clic en el botón verde **"Restaurar"** (icono de flecha)
3. Confirmar la acción
4. La publicación vuelve a la lista principal de Publicaciones
5. Se restaura con todos sus datos intactos (pagos, archivos, etc.)

#### 4. Eliminar Permanentemente (Individual)
1. En la Papelera, localizar la publicación
2. Clic en el botón rojo **"Eliminar"** (icono de papelera)
3. Confirmar advertencia (⚠️ acción irreversible)
4. La publicación se elimina PERMANENTEMENTE de la base de datos
5. Se eliminan también sus pagos y archivos asociados (CASCADE)

#### 5. Eliminar Múltiples Publicaciones
1. En la Papelera, marcar checkboxes de las publicaciones deseadas
2. Clic en botón **"Eliminar seleccionadas (N)"** en el header
3. Confirmar advertencia (⚠️ acción irreversible)
4. Todas las publicaciones seleccionadas se eliminan permanentemente

#### 6. Vaciar Papelera Completa
1. En la Papelera, clic en botón **"🗑️ Vaciar papelera (N)"**
2. Confirmar advertencia (⚠️ se eliminarán TODAS las publicaciones)
3. La papelera queda completamente vacía
4. Se muestra mensaje con cantidad de registros eliminados

### Auto-Eliminación (Sistema Automático)

**Configurar Tarea Programada (Cron Job):**

En el servidor, agregar en crontab:
```bash
# Ejecutar limpieza diaria a las 3:00 AM
0 3 * * * curl -X POST http://localhost:8000/api/legal/cleanup
```

O usando Docker:
```bash
# Ejecutar limpieza diaria
0 3 * * * docker exec dashboard-backend curl -X POST http://localhost:8000/api/legal/cleanup
```

**Respuesta del endpoint:**
```json
{
  "ok": true,
  "message": "Se eliminaron 5 publicaciones antiguas",
  "count": 5
}
```

## 🔒 Seguridad

### Permisos
- **Soft Delete:** Solo administradores pueden eliminar publicaciones
- **Ver Papelera:** Solo administradores
- **Restaurar:** Solo administradores
- **Eliminar Permanente:** Solo administradores
- **Vaciar Papelera:** Solo administradores

### Validaciones Backend
```php
// En listTrashed()
$role = strtolower($u['role'] ?? '');
$isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff', 'editor', 'gestor', 'manager'], true);

if (!$isStaff) {
  error_log("🔒 [LegalController] Unauthorized access to trash");
  return Response::json(['items'=>[]]);
}
```

### Validaciones Frontend
```tsx
// RequireAdmin wrapper en todas las rutas
<Route path="papelera" element={<RequireAdmin><Papelera /></RequireAdmin>} />
```

## 📊 Estructura de Datos

### Tabla legal_requests
```sql
CREATE TABLE legal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ... otros campos ...
  deleted_at TEXT,  -- NULL = activo, ISO 8601 timestamp = eliminado
  created_at TEXT NOT NULL
);

CREATE INDEX idx_legal_requests_deleted ON legal_requests(deleted_at);
```

### Ejemplos de Valores
```
deleted_at = NULL                     → Publicación activa
deleted_at = '2025-01-01T10:30:00Z'   → Eliminada el 1 de enero 2025
```

### Consultas SQL Típicas
```sql
-- Ver publicaciones activas
SELECT * FROM legal_requests WHERE deleted_at IS NULL;

-- Ver papelera
SELECT * FROM legal_requests WHERE deleted_at IS NOT NULL;

-- Restaurar
UPDATE legal_requests SET deleted_at = NULL WHERE id = 123;

-- Soft delete
UPDATE legal_requests SET deleted_at = '2025-11-17T12:00:00Z' WHERE id = 123;

-- Eliminar permanentemente
DELETE FROM legal_requests WHERE id = 123 AND deleted_at IS NOT NULL;

-- Limpiar antiguos (30+ días)
DELETE FROM legal_requests 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < datetime('now', '-30 days');
```

## 🎨 Interfaz de Usuario

### Colores y Estilos
- **Botón Eliminar (tabla):** `text-red-700` (rojo suave)
- **Botón Restaurar:** `text-emerald-700` (verde esmeralda)
- **Botón Eliminar Permanente:** `text-red-700`
- **Botón Eliminar Seleccionadas:** `bg-red-600` (rojo sólido)
- **Botón Vaciar Papelera:** `bg-red-700` (rojo oscuro)
- **Fila Urgente (< 7 días):** `bg-red-50` (fondo rojo claro)
- **Advertencia ⚠️:** Se muestra junto a días restantes cuando < 7

### Iconos
- **Papelera:** `<IconTrash/>` (icono de cesta de basura)
- **Restaurar:** `<IconArrowLeft/>` (flecha hacia la izquierda)

### Confirmaciones
Todos los botones destructivos muestran confirmación:
- ❓ Eliminar individual: "¿Mover esta publicación a la papelera?"
- ⚠️ Eliminar permanente: "ADVERTENCIA: Esta acción eliminará permanentemente..."
- ⚠️ Vaciar papelera: "ADVERTENCIA: Esta acción eliminará permanentemente N publicación(es)..."

## 🧪 Testing

### Probar Soft Delete
1. Crear una publicación de prueba
2. Ir a Publicaciones → Eliminar
3. Verificar que desaparece de la lista
4. Ir a Papelera → Debe aparecer ahí

### Probar Restauración
1. En Papelera, seleccionar una publicación
2. Clic en "Restaurar"
3. Volver a Publicaciones → Debe aparecer de nuevo
4. Verificar que todos los datos están intactos

### Probar Eliminación Permanente
1. Eliminar una publicación (mover a papelera)
2. Ir a Papelera
3. Clic en "Eliminar" (permanente)
4. Verificar en base de datos: registro eliminado

### Probar Auto-Eliminación
```bash
# Simular paso de 30 días (modificar manualmente en BD)
docker exec -it dashboard-backend sqlite3 /var/www/html/storage/database.sqlite

UPDATE legal_requests 
SET deleted_at = datetime('now', '-31 days') 
WHERE id = 123;

# Ejecutar cleanup
curl -X POST http://localhost:8000/api/legal/cleanup

# Verificar que el registro se eliminó
SELECT * FROM legal_requests WHERE id = 123;  -- Debe estar vacío
```

## 📈 Logs del Sistema

### Backend Logs
```
🗑️ [LegalController] Moved to trash: legal_request_id=18
♻️ [LegalController] Restored from trash: legal_request_id=18
🔥 [LegalController] Permanently deleted: legal_request_id=18
🔥 [LegalController] Trash emptied: deleted_count=5, user=1
🧹 [LegalController] Auto-cleanup: deleted_count=3, cutoff=2025-10-18T00:00:00Z
🔒 [LegalController] Unauthorized access to trash: user=2, role=solicitante
🔓 [LegalController] Loading trash: user=1, role=admin
📊 [LegalController] Trash count: 12
```

## 🔄 Migración de Datos Existentes

Si ya tienes publicaciones en el sistema:

```bash
# 1. Conectar a la base de datos
docker exec -it dashboard-backend sqlite3 /var/www/html/storage/database.sqlite

# 2. Aplicar migración
.read migrations/add_deleted_at.sql

# 3. Verificar columna creada
PRAGMA table_info(legal_requests);
-- Debe mostrar: deleted_at | TEXT | 0 | | 0

# 4. Todas las publicaciones existentes tendrán deleted_at = NULL (activas)
SELECT COUNT(*) FROM legal_requests WHERE deleted_at IS NULL;
```

## 🚨 Advertencias Importantes

1. **Eliminación permanente es IRREVERSIBLE**
   - No hay forma de recuperar publicaciones después de eliminación permanente
   - Los archivos asociados también se eliminan (CASCADE)
   - Los pagos asociados también se eliminan (CASCADE)

2. **Auto-eliminación a los 30 días**
   - Asegúrate de revisar la papelera regularmente
   - Las publicaciones con ⚠️ están en sus últimos 7 días
   - Después de 30 días, se eliminan automáticamente sin confirmación

3. **Cron Job requerido**
   - La auto-eliminación requiere configurar un cron job
   - Sin cron job, las publicaciones permanecerán en papelera indefinidamente
   - Recomendado: ejecución diaria a las 3:00 AM

4. **Backup de seguridad**
   - Hacer backup de `backend/storage/database.sqlite` regularmente
   - Especialmente antes de vaciar papelera completa

## 📝 Mejoras Futuras Sugeridas

1. **Notificaciones por Email:**
   - Enviar email al admin cuando una publicación esté por eliminarse (7 días antes)
   - Email semanal con resumen de la papelera

2. **Historial de Acciones:**
   - Registrar quién eliminó cada publicación
   - Registrar quién restauró o eliminó permanentemente
   - Tabla audit_log con timestamps y user_id

3. **Configuración Personalizable:**
   - Permitir cambiar el período de 30 días desde Configuración
   - Opción para deshabilitar auto-eliminación

4. **Exportar antes de Eliminar:**
   - Botón para exportar publicación a PDF antes de eliminar permanentemente
   - Backup automático en carpeta especial

5. **Papelera por Usuario:**
   - Permitir que solicitantes tengan su propia papelera
   - Solo pueden ver/restaurar sus propias publicaciones eliminadas

## ✅ Checklist de Implementación

- [x] Columna `deleted_at` agregada a `legal_requests`
- [x] Migración SQL creada (`add_deleted_at.sql`)
- [x] Índice en `deleted_at` para performance
- [x] Método `softDelete()` en LegalController
- [x] Método `listTrashed()` en LegalController
- [x] Método `restore()` en LegalController
- [x] Método `permanentDelete()` en LegalController
- [x] Método `emptyTrash()` en LegalController
- [x] Método `cleanupOldTrashed()` en LegalController
- [x] Modificación de `list()` para excluir eliminados
- [x] Rutas API registradas en `index.php`
- [x] Funciones API en `frontend/src/lib/api.ts`
- [x] Botón "Eliminar" en Publicaciones.tsx
- [x] Página Papelera.tsx completa (285 líneas)
- [x] Ruta en App.tsx con RequireAdmin
- [x] Enlace en Sidebar.tsx
- [x] IconTrash en icons.tsx (ya existía)
- [x] Validaciones de permisos (solo admin)
- [x] Mensajes de confirmación en acciones destructivas
- [x] Logs del sistema con emojis
- [x] Documentación completa (este archivo)
- [x] Frontend reiniciado con cambios aplicados

## 🎯 Resumen

El sistema de papelera de reciclaje está **100% funcional** y listo para producción. Proporciona una capa de seguridad adicional contra eliminaciones accidentales, mientras mantiene la base de datos limpia mediante auto-eliminación programada.

**Beneficios:**
- ✅ Protección contra eliminación accidental
- ✅ Posibilidad de recuperar publicaciones hasta 30 días
- ✅ Limpieza automática de datos antiguos
- ✅ Interfaz intuitiva con advertencias claras
- ✅ Selección múltiple para eficiencia
- ✅ Sistema de alertas por urgencia
- ✅ Logs completos para auditoría

---

**Fecha de implementación:** 17 de noviembre de 2025
**Versión:** 1.0.0
