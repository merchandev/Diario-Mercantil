# Plan de implementación: Papelera de ediciones y publicaciones

**Proyecto:** Diario Mercantil  
**Fecha:** 21 de septiembre de 2026  
**Objetivo:** permitir corregir ediciones y publicaciones sin perder trazabilidad, liberar publicaciones para reutilizarlas y conservar una papelera reversible antes de cualquier eliminación definitiva.

## 1. Requerimiento funcional

Cuando una edición se envía a la papelera:

1. La edición deja de aparecer en las listas activas y en el sitio público.
2. Sus publicaciones asociadas dejan de bloquear la creación de otra edición.
3. Cada publicación vuelve a **Por verificar**.
4. Se limpian `publish_date` y `edition_code` de esas publicaciones.
5. Se conservan pagos, documentos, PDF final, CVE, asociaciones históricas y auditoría.
6. La edición conserva su número/CVE y puede restaurarse para corregirla.

Cuando una publicación se envía a la papelera:

1. Se oculta de las listas activas.
2. Se conservan pagos y documentos.
3. Si pertenece a una edición publicada, la operación se rechaza y primero debe retirarse la edición.
4. Si pertenece a un borrador, se elimina su asociación activa, se invalida el PDF final de ese borrador y se archiva la composición.
5. Al restaurarla, vuelve a **Por verificar** para que pase nuevamente por verificación.

## 2. Estados y transiciones

### Publicaciones

```text
Borrador
  └─ enviar a papelera → Papelera/Borrador

Por verificar
  └─ enviar a papelera → Papelera/Por verificar

En trámite
  └─ enviar a papelera por administrador → Papelera/En trámite

Publicada
  └─ no se borra directamente
     primero se retira la edición que la contiene

Papelera
  ├─ restaurar → Por verificar (administrador)
  ├─ restaurar → Borrador (propietario, si la política lo permite)
  └─ eliminar definitivamente → sólo cuando no exista historial editorial protegido
```

### Ediciones

```text
Borrador
  └─ enviar a papelera → Papelera/Borrador

Publicada
  └─ retirar → Papelera/Publicada

Papelera/Publicada
  └─ restaurar → Borrador
     requiere nueva composición y nuevo PDF final antes de publicar
```

Una edición restaurada no vuelve automáticamente a `Publicada`. Esto evita reactivar un documento público sin una revisión explícita.

## 3. Modelo de datos

### 3.1 Soft delete existente

Usar los campos existentes:

```sql
editions.deleted_at
legal_requests.deleted_at
files.deleted_at
```

Toda consulta activa debe incluir:

```sql
deleted_at IS NULL
```

### 3.2 Historial de composición

Crear una migración nueva, sin modificar migraciones ya aplicadas:

```sql
CREATE TABLE edition_archives (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    edition_id INT NOT NULL,
    file_id INT NULL,
    snapshot_json LONGTEXT NOT NULL,
    actor_user_id INT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_edition_archive (edition_id),
    INDEX idx_edition_archive_file (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`snapshot_json` debe conservar, como mínimo:

```json
{
  "edition": {},
  "orders": [
    {
      "legal_request_id": 123,
      "publication_file_id": 456,
      "publication_checksum": "...",
      "publication_source": "uploaded"
    }
  ]
}
```

No eliminar físicamente archivos referenciados por `edition_archives`.

## 4. Backend

### 4.1 Servicio transaccional

Crear `backend/src/Services/EditorialTrashService.php` con estas operaciones:

```php
trashEdition(int $editionId, int $actorId): array
restoreEdition(int $editionId, int $actorId): array
trashPublication(int $requestId, int $actorId, bool $isAdmin): array
restorePublication(int $requestId, int $actorId, bool $isAdmin): array
```

Cada operación debe:

- abrir una transacción;
- bloquear la fila objetivo;
- validar conflictos con otras ediciones activas;
- guardar un snapshot en `edition_archives`;
- cambiar estados y asociaciones;
- escribir auditoría;
- hacer commit sólo si todo el flujo termina correctamente.

### 4.2 Enviar edición a la papelera

Algoritmo:

```text
BEGIN
  SELECT edición FOR UPDATE
  SELECT edition_orders FOR UPDATE
  INSERT snapshot en edition_archives
  UPDATE editions SET deleted_at = ahora

  PARA cada solicitud asociada:
    si tiene otra edición activa:
      no modificar su estado
      registrar conflicto
    si no tiene otra edición activa:
      UPDATE legal_requests
        SET status='Por verificar',
            publish_date=NULL,
            edition_code=NULL

  INSERT audit_logs: trash_edition
  INSERT audit_logs por cada publicación liberada
COMMIT
```

La edición retirada no debe cambiar de número ni de CVE.

### 4.3 Restaurar edición

Algoritmo:

```text
BEGIN
  SELECT edición retirada FOR UPDATE
  comprobar que cada publicación exista y no esté en otra edición activa
  guardar snapshot de restauración
  UPDATE editions
    SET deleted_at=NULL,
        status='Borrador',
        file_id=NULL,
        file_name=NULL
  conservar edition_no y code
  registrar restore_edition_to_draft
COMMIT
```

Al restaurar, el administrador debe volver a revisar la composición y cargar un nuevo PDF final.

### 4.4 Enviar publicación a la papelera

Para cada edición activa que contenga la publicación:

- si la edición está `Publicada`, responder `409` y pedir retirar primero la edición;
- si la edición está `Borrador`, archivar la composición;
- quitar esa fila de `edition_orders`;
- invalidar `editions.file_id` y `editions.file_name`;
- recalcular `orders_count`;
- registrar `edition_final_invalidated_due_composition`.

Después:

```sql
UPDATE legal_requests
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

No borrar pagos, documentos ni filas históricas.

### 4.5 Restaurar publicación

Para administrador:

```sql
UPDATE legal_requests
SET deleted_at=NULL,
    status='Por verificar',
    publish_date=NULL,
    edition_code=NULL
WHERE id=?;
```

Para un solicitante, aplicar la política de permisos existente y restaurar a `Borrador` sólo si la publicación era editable por ese usuario.

### 4.6 Eliminación definitiva

La eliminación definitiva debe ser excepcional:

- sólo `superadmin`;
- sólo desde la papelera;
- nunca para una edición publicada con historial protegido;
- nunca si existen referencias en `edition_archives`;
- debe registrar auditoría;
- debe limpiar archivos físicos sólo cuando no exista ninguna referencia viva o archivada.

El endpoint normal de DELETE debe enviar a la papelera. El endpoint definitivo debe ser explícito:

```text
DELETE /api/editions/{id}/permanent
DELETE /api/legal/trash/{id}
```

## 5. Rutas HTTP

### Ediciones

```text
GET    /api/editions-retired
GET    /api/editions/{id}/trash-detail
GET    /api/editions/{id}/trash-pdf
POST   /api/editions/{id}/retire
POST   /api/editions/{id}/restore
DELETE /api/editions/{id}                 → enviar a papelera
DELETE /api/editions/{id}/permanent       → sólo SuperAdmin
```

### Publicaciones

```text
GET    /api/legal/trash
GET    /api/legal/trash/{id}
DELETE /api/legal/{id}                     → enviar a papelera
POST   /api/legal/{id}/restore
DELETE /api/legal/trash/{id}               → eliminación definitiva
DELETE /api/legal/trash                    → sólo SuperAdmin, con confirmación reforzada
```

Las rutas específicas deben registrarse antes de las rutas genéricas cuando el router pueda interpretar `{id}` de forma ambigua.

## 6. Frontend

### 6.1 Papelera

Actualizar `frontend/src/pages/Papelera.tsx` para mostrar dos pestañas:

```text
Publicaciones
Ediciones
```

Cada fila debe incluir:

- identificador/CVE;
- estado anterior;
- fecha de envío a papelera;
- detalle;
- restaurar y editar;
- eliminar definitivamente, sólo cuando esté permitido.

### 6.2 Restauración

Restaurar publicación:

```text
restaurar → abrir /dashboard/publicaciones/{id}
```

Restaurar edición:

```text
restaurar → abrir /dashboard/ediciones?edition={id}
```

La pantalla debe informar:

```text
La edición vuelve a Borrador.
Debes revisar las publicaciones y cargar un PDF final nuevo.
```

### 6.3 Selección de publicaciones

La lista que alimenta la creación de ediciones debe incluir solicitudes `Por verificar` sólo después de que el administrador las verifique y pasen a `En trámite`.

No mostrar como seleccionable una publicación que pertenezca a otra edición activa.

### 6.4 Textos

Cambiar:

```text
Eliminar publicación definitivamente
```

por:

```text
Enviar publicación a la papelera
```

Cambiar:

```text
Eliminar edición
```

por:

```text
Enviar edición a la papelera
```

Explicar que:

- el CVE se conserva;
- las publicaciones vuelven a `Por verificar`;
- los pagos y documentos se conservan;
- publicar otra vez requiere un PDF final nuevo.

## 7. Pruebas backend

Crear o ampliar pruebas para cubrir:

```text
testTrashDraftEditionReturnsRequestsToVerification
testTrashPublishedEditionReturnsRequestsToVerification
testTrashEditionDoesNotChangeRequestInAnotherActiveEdition
testRestoreEditionReturnsToDraft
testRestoreEditionKeepsEditionNumberAndCode
testRestoreEditionRejectsActiveAssociationConflict
testTrashPublicationRemovesDraftAssociation
testTrashPublicationRejectsPublishedEditionAssociation
testRestorePublicationReturnsToVerification
testPermanentDeleteRequiresTrashFirst
testPermanentDeleteDoesNotRemoveArchivedEditionFiles
testSameRequestCanBeSelectedAfterVerificationAgain
testTrashOperationsAreAtomic
testTrashActionsAreAudited
```

### Flujo de aceptación principal

```text
1. Crear solicitud A.
2. Pagar y verificar A.
3. Crear edición E1 con A.
4. Enviar E1 a papelera.
5. Confirmar que A está Por verificar.
6. Verificar A nuevamente; debe quedar En trámite.
7. Crear solicitud B y verificarla.
8. Crear edición E2 con A+B.
9. Cargar PDF final de E2.
10. Publicar E2.
11. Confirmar que A y B reciben el mismo PDF final.
12. Intentar restaurar E1: debe rechazar el conflicto porque A ya pertenece a E2.
13. Probar la restauración con otra edición sin conflictos: vuelve como Borrador con el mismo CVE y exige un nuevo PDF final.
```

## 8. Pruebas frontend

```text
papelera muestra pestaña Publicaciones
papelera muestra pestaña Ediciones
botón de borrado dice Enviar a la papelera
restaurar publicación abre su ficha
restaurar edición abre la edición en Borrador
publicación restaurada muestra Por verificar
edición restaurada exige nuevo PDF final
edición publicada no ofrece eliminación definitiva normal
conflicto de asociación muestra un mensaje entendible
```

## 9. Migración y despliegue

1. Ejecutar pruebas locales.
2. Crear migración `20260921_000_editorial_trash_archives.php`.
3. Revisar que la migración sea aditiva y compatible con MySQL existente.
4. Hacer backup de base de datos y storage.
5. Desplegar código y migración.
6. Ejecutar `php bin/migrate.php` dentro del backend.
7. Comprobar que `edition_archives` existe.
8. Ejecutar auditoría de ediciones retiradas y publicaciones en papelera.
9. Verificar manualmente el flujo principal.
10. Publicar la versión identificada por SHA.

Nunca ejecutar un `--repair` masivo como parte automática del despliegue.

Para retiros antiguos que dejaron solicitudes como `Publicada`, ejecutar primero la auditoría de solo lectura:

```bash
docker compose exec -T backend php bin/repair_editorial_trash.php
```

Después de revisar las ediciones afectadas y guardar el respaldo, aplicar únicamente los identificadores concretos con `--apply --editions=ID,ID --actor=ID_ADMIN`. El proceso conserva las fechas de retiro, archiva la composición y registra cada publicación devuelta a `Por verificar`. Repetir el retiro no vuelve a modificar publicaciones que ya fueron verificadas.

## 10. Rollback

El rollback de código debe restaurar las imágenes anteriores y mantener la base de datos. La migración es aditiva; no debe eliminarse la tabla `edition_archives` durante un rollback de aplicación.

Antes del despliegue guardar:

```text
SHA anterior
SHA nuevo
dump SQL
backup del volumen storage
configuración compose resuelta
identificador de imágenes anteriores
```

## 11. Criterios de cierre

El cambio se considera terminado cuando:

- una edición enviada a papelera libera sus publicaciones;
- las publicaciones vuelven a `Por verificar`;
- se pueden verificar y seleccionar nuevamente;
- una publicación no puede borrar una edición publicada indirectamente;
- la papelera contiene ediciones y publicaciones;
- restaurar conserva los documentos y permite editar;
- el CVE no se reutiliza;
- los archivos históricos no se borran prematuramente;
- las pruebas backend y frontend pasan;
- GitHub Actions está verde;
- producción muestra el SHA nuevo en `/api/version`;
- existe backup y procedimiento de rollback documentado.
