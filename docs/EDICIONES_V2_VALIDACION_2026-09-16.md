# Verificación y actualización del flujo de ediciones V2

## Situación encontrada el 16 de septiembre de 2026

- GitHub main estaba en `86a70c2`; los pipelines de ese commit y `3284d1e` habían fallado. La afirmación de pipeline verde no era correcta.
- El VPS tenía `3284d1e` y contenedores reconstruidos, pero `/api/version` devolvía `unknown`: no se habían pasado los argumentos del build.
- PHPUnit ejecutaba 50 pruebas, con un fallo y 14 omitidas. Se habían deshabilitado clases completas que incluían pruebas todavía relevantes.
- La tabla `edition_sequences` existía en producción (2026: último número 5). La auditoría de ediciones publicadas no encontró archivos inválidos.

## Contrato comprobado

| Punto | Resultado |
|---|---|
| Correlativo anual | Tabla persistente, transacción y bloqueo por año en MySQL; eliminar un borrador no libera su número. |
| Snapshot SHA-256 | `published_file_checksum` existe desde una migración anterior. Publicación guarda el hash y descarga comprueba el snapshot. |
| Preparación/publicación | Publicar no prepara ni fusiona archivos. EditionOrderPdfService prepara individuales; EditionPdfGenerator es el generador separado. La operación pública requiere un PDF final previo. |
| Integridad | Se comprueban archivo físico, tamaño, checksum y páginas; un PDF alterado o inválido se rechaza. |
| Borrado de publicadas | La ruta ordinaria devuelve 409 y conserva la edición. La ruta /permanent requiere SuperAdmin y también protege publicadas. |
| Retiro/restauración | Retirar conserva identidad y archivos; restaurar exige integridad del final. |
| SSE | Publicar utiliza JSON. Esto elimina su dependencia de streaming, sin prometer que nunca pueda existir otro timeout del sistema. |
| Fechas | Varias ediciones pueden compartir fecha. Los filtros superiores usan el día siguiente exclusivo; el límite inferior admite columnas DATE sin hora. |
| Readiness | Valida borrador, solicitudes En trámite, PDF final, fecha y conflictos. No exige individuales preparados ni recalcula pagos: la aprobación de la solicitud pertenece al flujo previo. |
| Interfaz | Se distinguen orden de servicio y PDF final; se muestran motivos de bloqueo y se elimina el texto de generación automática al publicar. No se ofrece borrar publicadas retiradas. |
| Versión | Lee metadatos incorporados a la imagen durante el build; el sidebar presenta el SHA abreviado. No depende de incluir .git dentro del contenedor. |

## Cambios de esta revisión

- Recuperar todas las pruebas omitidas del flujo editorial y adaptarlas al contrato de PDF final previo.
- Reemplazar el falso PDF de integración por un documento real y su snapshot SHA-256.
- Probar 1/2/3/10/20/50 solicitudes, varios repartos entre usuarios, conservación del PDF al preparar individuales y ausencia de generación durante publicación.
- Añadir pruebas HTTP de carga/publicación/descarga, misma fecha, repetición de Publish, retiro/restauración, bloqueo de borrado, snapshot alterado y correlativo no reutilizable.
- Cubrir PDF malformado con checksum correcto y fechas hasta el último instante del día.
- Sustituir readiness:any por su estructura tipada y registrar el actor real al cambiar composición.
- Añadir `deploy-release.sh` para compilar con SHA y fecha reales, etiquetar imágenes por commit y actualizar aplicación sin detener la base de datos.

Validación local: 61 pruebas backend, 306 aserciones, ninguna omitida; 20 pruebas frontend y TypeScript sin errores. El build y GitHub Actions deben comprobarse para el commit concreto antes del despliegue.

## Producción y reversión

Respaldo previo: `/root/diario-release-20260916-111542/`, con dump de base de datos, storage, SHA anterior y configuración resuelta. Las imágenes anteriores se conservan con la etiqueta `rollback-20260916`.

Despliegue desde un checkout limpio del commit aprobado: `bash deploy-release.sh`.

Reversión de imágenes, desde `/docker/diario-mercantil`:

```sh
docker tag diario-mercantil-backend:rollback-20260916 diario-mercantil-backend
docker tag diario-mercantil-worker:rollback-20260916 diario-mercantil-worker
docker tag diario-mercantil-frontend:rollback-20260916 diario-mercantil-frontend
docker compose up -d --no-build --no-deps --wait backend worker frontend
```

Esta revisión no agrega migraciones ni requiere revertir la base de datos. No se ejecuta `repair_editions.php --repair`: la auditoría no encontró ediciones publicadas inválidas. El checksum no certifica que un documento técnicamente válido sea editorialmente el correcto; cualquier reclamo de contenido histórico requiere revisar esa edición concreta.
