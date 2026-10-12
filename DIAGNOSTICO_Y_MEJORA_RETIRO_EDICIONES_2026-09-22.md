# Diagnóstico y mejora: retiro de ediciones y liberación de publicaciones

**Proyecto:** Diario Mercantil\\
**Fecha:** 22 de septiembre de 2026\\
**Alcance:** diagnóstico de producción y especificación de la corrección de código\\
**Estado:** listo para revisión y aplicación

## 1. Problema observado

Al retirar una edición desde el panel administrativo, la edición deja de aparecer entre las ediciones activas, pero las publicaciones asociadas conservan el estado `Publicada`.

Esto provoca que:

- la publicación siga mostrando una edición anterior aunque esa edición ya esté retirada;
- no vuelva a `Por verificar`;
- no pueda pasar nuevamente por verificación;
- no pueda seleccionarse en una nueva edición después de corregirla.

Las imágenes adjuntas son evidencia visual del problema. No son instrucciones de implementación.

## 2. Evidencia encontrada en producción

El diagnóstico se realizó sólo mediante lectura de logs, estado de contenedores y código presente dentro de la imagen activa. No se modificaron código, base de datos ni archivos en este diagnóstico.

### 2.1. Las peticiones sí llegaron al backend

Los logs registraron:

~~~text
22/Sep/2026:11:30:31 +0000 "POST /api/editions/31/retire" 200
22/Sep/2026:11:31:04 +0000 "POST /api/editions/28/retire" 200
~~~

Después de cada operación el frontend recargó:

~~~text
"GET /api/editions-retired" 200
"GET /api/editions" 200
"GET /api/legal" 200
~~~

Por eso el problema no está en el botón, en CSRF ni en una petición fallida. El endpoint responde correctamente, pero la lógica que ejecuta está incompleta.

### 2.2. El repositorio y los contenedores estaban en versiones distintas

El checkout del repositorio en el VPS estaba en:

~~~text
48d6b95 fix(trash): release publications and complete reversible editorial deletion
~~~

Pero el backend que atendía tráfico reportaba:

~~~json
{
  "git_sha": "3724ee4fc270568b3957333483eda968818e2970",
  "built_at": "2026-09-16T13:36:26Z"
}
~~~

La imagen Docker activa era antigua. Actualizar el checkout Git no actualiza automáticamente una imagen ya construida ni el contenedor que la está ejecutando.

### 2.3. La imagen activa contiene la lógica antigua

Dentro del contenedor, `EditionController::retire()` hacía lo siguiente:

~~~php
$pdo->prepare('UPDATE editions SET deleted_at=? WHERE id=?')
    ->execute([EditorialClock::now()->format('Y-m-d H:i:s'), $id]);

// Sólo libera solicitudes cuando la edición era Borrador.
if ($edition['status'] === 'Borrador') {
    $pdo->prepare("UPDATE legal_requests
        SET status='En trámite'
        WHERE id IN (
            SELECT legal_request_id
            FROM edition_orders
            WHERE edition_id=?
        )")->execute([$id]);
}
~~~

Cuando la edición está `Publicada`, la condición no se cumple. El código marca `editions.deleted_at`, pero no actualiza las publicaciones.

## 3. Causa raíz

La causa raíz es doble:

1. Producción estaba ejecutando el contenedor construido desde `3724ee4`, aunque el repositorio ya tenía el commit `48d6b95`.
2. La implementación antigua sólo liberaba publicaciones de ediciones en `Borrador`; las ediciones `Publicada` quedaban con sus publicaciones en `Publicada`.

El estado resultante era:

~~~text
editions.deleted_at = fecha de retiro
legal_requests.status = 'Publicada'
edition_orders conserva la asociación histórica
~~~

El código respondió `200` porque la operación de retiro sí terminó. El estado incorrecto era un efecto de la lógica, no un error HTTP.

## 4. Comportamiento correcto

Al retirar una edición, sea `Borrador` o `Publicada`, el sistema debe:

1. Bloquear la edición y sus asociaciones dentro de una transacción.
2. Guardar una instantánea de la composición en `edition_archives`.
3. Marcar la edición con `deleted_at`, sin cambiar CVE ni número.
4. Revisar cada publicación asociada.
5. Si no pertenece a otra edición activa, actualizarla a:

~~~text
status = 'Por verificar'
publish_date = NULL
edition_code = NULL
~~~

6. Conservar pagos, documentos, archivos, CVE e historial.
7. Registrar auditoría.
8. Permitir que, después de verificarla otra vez, pueda seleccionarse en una nueva edición.

Si una publicación pertenece a otra edición activa, debe conservarse en su estado actual y registrarse el conflicto. No se debe liberar automáticamente una publicación que todavía esté siendo usada por una edición activa.

## 5. Mejora de backend

### 5.1. Servicio transaccional único

Usar:

~~~text
backend/src/Services/EditorialTrashService.php
~~~

El servicio debe ser el único punto que implemente el retiro reversible. La operación central debe seguir este patrón:

~~~php
public function trashEdition(int $editionId, int $actorId): array
{
    return $this->transaction(function () use ($editionId, $actorId): array {
        $edition = $this->edition($editionId); // SELECT ... FOR UPDATE
        $orders = $this->orders($editionId);   // SELECT ... FOR UPDATE

        $this->archive($edition, $orders, $actorId, 'trash_edition');

        $this->pdo->prepare(
            'UPDATE editions SET deleted_at=COALESCE(deleted_at, ?) WHERE id=?'
        )->execute([
            EditorialClock::now()->format('Y-m-d H:i:s'),
            $editionId,
        ]);

        $requeued = 0;
        foreach ($orders as $order) {
            $requestId = (int) $order['legal_request_id'];
            $request = $this->request($requestId);

            if ($request['deleted_at'] !== null) {
                continue;
            }

            if ($this->activeAssociation($requestId, $editionId)) {
                continue;
            }

            $this->pdo->prepare(
                "UPDATE legal_requests
                 SET status='Por verificar', publish_date=NULL, edition_code=NULL
                 WHERE id=?"
            )->execute([$requestId]);

            $this->audit(
                $actorId,
                'edition_trash_requeue_verification',
                'legal_request',
                $requestId
            );
            $requeued++;
        }

        $this->audit($actorId, 'trash_edition', 'edition', $editionId);

        return [
            'ok' => true,
            'requests_requeued' => $requeued,
        ];
    });
}
~~~

La transacción debe revertirse por completo si falla el snapshot, la actualización de una publicación o la auditoría.

### 5.2. Controlador de ediciones

En `backend/src/EditionController.php`, las rutas normal y explícita deben usar el mismo servicio:

~~~php
public function delete($id)
{
    return $this->retire($id);
}

public function retire($id)
{
    $user = $this->requireAdmin();

    try {
        $result = (new EditorialTrashService(Database::pdo()))
            ->trashEdition((int) $id, (int) $user['id']);

        Response::json($result);
    } catch (Throwable $e) {
        $status = (int) $e->getCode();
        if ($status < 400 || $status > 599) {
            $status = 500;
        }
        Response::json(['error' => $e->getMessage()], $status);
    }
}
~~~

No debe quedar otra implementación de `retire()` que sólo actualice `editions.deleted_at`.

### 5.3. Tabla de historial

Crear la migración:

~~~text
backend/database/migrations/20260921_000_editorial_trash_archives.php
~~~

La tabla debe guardar la edición, el PDF final, la composición y el actor:

~~~sql
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
~~~

El `snapshot_json` debe incluir como mínimo la edición y sus órdenes, con los archivos individuales asociados.

### 5.4. Restauración de ediciones

`POST /api/editions/{id}/restore` debe:

- comprobar conflictos con otras ediciones activas;
- restaurar como `Borrador`;
- conservar CVE y número;
- limpiar `file_id` y `file_name` del PDF final anterior;
- exigir un PDF final nuevo;
- nunca reactivar automáticamente la edición como `Publicada`.

Una publicación restaurada por un administrador debe volver a `Por verificar`.

### 5.5. Papelera de publicaciones

En `backend/src/LegalController.php`, `DELETE /api/legal/{id}` debe enviar la publicación a la papelera mediante `EditorialTrashService::trashPublication()`.

Reglas:

- si pertenece a una edición `Publicada`, responder `409` y exigir el retiro de la edición;
- si pertenece a un borrador, quitar la asociación, invalidar su PDF final y guardar la composición;
- conservar pagos y documentos;
- restaurar como `Por verificar` para administradores.

La eliminación definitiva debe ser explícita y sólo para SuperAdmin:

~~~text
DELETE /api/legal/trash/{id}
DELETE /api/editions/{id}/permanent
~~~

Una publicación o edición con referencias en `edition_archives` debe responder `409` y conservarse.

### 5.6. Protección de archivos

Antes de borrar físicamente un archivo, `PermanentDeletionService` debe comprobar referencias en:

~~~text
legal_files
edition_orders
editions
payment_methods
edition_archives
snapshot_json de edition_archives
~~~

Si un snapshot no puede leerse, la eliminación debe fallar cerrada y conservar el archivo.

## 6. Selección de publicaciones

La lista usada para crear o editar una edición debe incluir sólo solicitudes:

~~~text
status = 'En trámite'
deleted_at IS NULL
sin asociación a otra edición activa
~~~

La consulta debe ignorar asociaciones de ediciones retiradas:

~~~sql
SELECT l.*,
       (
           SELECT active_eo.edition_id
           FROM edition_orders active_eo
           JOIN editions active_e
             ON active_e.id = active_eo.edition_id
          WHERE active_eo.legal_request_id = l.id
            AND active_e.deleted_at IS NULL
          ORDER BY active_e.id
          LIMIT 1
       ) AS active_edition_id
FROM legal_requests l
WHERE l.deleted_at IS NULL;
~~~

El frontend debe excluir las solicitudes con `active_edition_id` cuando muestre opciones seleccionables.

## 7. Reparación de datos antiguos

Las ediciones retiradas antes de instalar la corrección pueden haber dejado publicaciones en `Publicada`.

Crear:

~~~text
backend/bin/repair_editorial_trash.php
~~~

### 7.1. Auditoría de sólo lectura

~~~bash
docker compose exec -T backend php bin/repair_editorial_trash.php
~~~

Debe listar sólo ediciones que:

- tienen `deleted_at IS NOT NULL`;
- tienen publicaciones asociadas;
- dejaron publicaciones en `Publicada`;
- no tienen otra edición activa para esas publicaciones;
- aún no tienen un snapshot `trash_edition`.

### 7.2. Aplicación explícita

Después de revisar la salida y confirmar el respaldo:

~~~bash
docker compose exec -T backend php bin/repair_editorial_trash.php \
  --apply \
  --editions=ID,ID \
  --actor=ID_ADMIN
~~~

El script debe archivar la composición, conservar la fecha original, devolver las publicaciones a `Por verificar`, limpiar `publish_date` y `edition_code`, registrar auditoría y no modificar publicaciones que ya fueron verificadas nuevamente.

No debe ejecutarse una reparación masiva sin auditar primero.

## 8. Cambios de frontend

Actualizar:

~~~text
frontend/src/pages/Papelera.tsx
frontend/src/pages/Ediciones.tsx
frontend/src/pages/Publicaciones.tsx
frontend/src/lib/api.ts
~~~

La papelera debe mostrar dos pestañas:

~~~text
Publicaciones
Ediciones
~~~

Para una publicación retirada mostrar estado anterior, fecha, documentos, pagos, restauración y eliminación definitiva sólo cuando el backend indique `can_permanently_delete=true`.

Para una edición retirada mostrar CVE, número, fecha, fecha de retiro, composición, PDF histórico íntegro, restauración y eliminación definitiva sólo cuando no exista historial protegido.

El mensaje de restauración debe indicar:

~~~text
La edición volverá a Borrador con el mismo CVE.
Debes revisar las publicaciones y cargar un PDF final nuevo.
Las publicaciones volverán a Por verificar cuando corresponda.
~~~

## 9. Pruebas requeridas

### Backend

Cubrir como mínimo:

~~~text
retirar edición Borrador libera publicaciones
retirar edición Publicada libera publicaciones
retiro repetido no altera publicaciones ya verificadas
conflicto con otra edición activa no libera la publicación
restaurar edición vuelve a Borrador
restaurar conserva CVE y número
restaurar exige PDF final nuevo
retirar publicación de edición Publicada responde 409
retirar publicación de borrador elimina sólo la asociación activa
restaurar publicación devuelve Por verificar
eliminación definitiva requiere papelera
eliminación definitiva requiere SuperAdmin
historial impide borrar archivos referenciados
operaciones de papelera son atómicas
acciones quedan auditadas
script de reparación sólo acepta candidatas retiradas
~~~

### Frontend

Verificar que:

~~~text
la papelera muestra publicaciones y ediciones
el botón normal dice Enviar a la papelera
restaurar publicación abre su ficha
restaurar edición abre un borrador
la publicación restaurada muestra Por verificar
la edición restaurada exige un PDF nuevo
los conflictos muestran el mensaje del backend
sólo SuperAdmin ve la eliminación definitiva elegible
~~~

## 10. Despliegue seguro

El error original ocurrió porque el repositorio se actualizó sin reconstruir los contenedores. El despliegue debe comprobar que Git y Docker usan exactamente el mismo SHA.

### 10.1. Respaldo

~~~bash
BACKUP=/docker/backups/diario-mercantil/$(date -u +%Y%m%dT%H%M%SZ)-pre-trash
mkdir -p "$BACKUP"

docker compose exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root \
   --single-transaction --routines --triggers --events "$MYSQL_DATABASE"' \
  > "$BACKUP/database.sql"

tar -czf "$BACKUP/storage.tar.gz" \
  -C /var/lib/docker/volumes/diario_mercantil_storage_data/_data .
~~~

Guardar también SHA anterior, SHA nuevo, configuración Compose, imágenes anteriores, dump SQL y backup del volumen.

### 10.2. Construcción con SHA

~~~bash
git pull --ff-only
export GIT_SHA="$(git rev-parse HEAD)"
export BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

docker compose config --quiet
docker compose build backend worker frontend
docker compose up -d --no-deps --wait --wait-timeout 180 backend worker frontend
~~~

### 10.3. Verificación obligatoria de la imagen

~~~bash
docker compose exec -T backend cat /var/www/html/build-info.json
git rev-parse HEAD
~~~

El valor `git_sha` de `build-info.json` debe ser exactamente igual al SHA de `git rev-parse HEAD`. Si difieren, los contenedores siguen ejecutando una versión anterior.

### 10.4. Migración y salud

~~~bash
docker compose exec -T backend php bin/migrate.php
docker compose exec -T backend php bin/readiness.php
docker compose ps
~~~

La tabla `edition_archives` debe existir antes de probar la restauración.

### 10.5. Smoke tests

~~~bash
docker compose exec -T frontend curl -fsS http://127.0.0.1/api/version
docker compose exec -T frontend curl -s -o /dev/null -w '%{http_code}' \
  http://127.0.0.1/api/auth/me
~~~

`/api/version` debe reportar el SHA construido y `/api/auth/me` debe responder `401` sin sesión.

## 11. Criterios de aceptación

El cambio estará correctamente aplicado cuando:

- retirar una edición `Publicada` devuelva sus publicaciones a `Por verificar`;
- pagos y documentos permanezcan intactos;
- las publicaciones puedan verificarse y seleccionarse de nuevo;
- una asociación con otra edición activa no se libere automáticamente;
- restaurar conserve CVE y devuelva la edición a `Borrador`;
- publicar una edición restaurada exija un PDF nuevo;
- el historial proteja archivos y composiciones;
- la eliminación definitiva sólo esté disponible para SuperAdmin desde la papelera;
- los retiros antiguos puedan auditarse y repararse explícitamente;
- backend y frontend pasen sus pruebas;
- el contenedor activo reporte el mismo SHA que el repositorio;
- todas las operaciones queden auditadas.

## 12. Conclusión

Las publicaciones no cambiaron de estado porque producción estaba ejecutando una imagen Docker antigua. Esa imagen sólo liberaba solicitudes cuando la edición era `Borrador`; para ediciones `Publicada` únicamente marcaba la edición como retirada y respondía `200`.

La mejora consiste en reconstruir los contenedores desde el commit actual y centralizar el retiro en `EditorialTrashService`, con transacción, historial, devolución a `Por verificar`, restauración a `Borrador`, protección de archivos y reparación explícita de los retiros antiguos.
