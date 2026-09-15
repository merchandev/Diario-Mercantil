# Revisión de cumplimiento — Plan Integral V2

Fecha: 15 de septiembre de 2026.

## Dictamen

**No están abarcados todos los puntos. La implementación local es parcial y tiene bloqueos funcionales. No procede afirmar que todos los cambios se aplicaron exitosamente ni dar por cerrado el Plan V2.**

Se contrastó la lista del usuario con el código local y las secciones aplicables del documento de referencia. El documento se trató como especificación para revisión, no como autorización para ejecutar reparaciones o despliegues.

HEAD: `3822dea8d78997f110c2cf8f8fa90d69873ab3e8`. Existen cambios sin commit y archivos nuevos sin seguimiento, incluidos Readiness, EditorialClock, VersionController y repair_editions.php. El SHA de HEAD no identifica esos cambios. No se verificó producción, staging ni la base de datos real. No se modificó código funcional ni se ejecutó reparación de datos.

Raíz de las referencias de código: `E:/PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/`.

## Matriz de la lista solicitada

“Implementado” significa comprobado en el código, no certificado en producción.

| # | Punto | Resultado | Evidencia y límites |
|---|---|---|---|
| 1 | Desacoplar consolidación de Publicar | Implementado en el flujo | `backend/src/Services/EditionPublicationService.php:30`: publish llama a draftOrderIds y commitPublication, sin preparar/copiar/generar archivos. Exige file_id y checksum. Quedan métodos privados de generación sin uso. La validación estricta todavía está separada del commit; ver hallazgo 4. |
| 2 | Preparar un PDF individual conserva el final | Implementado para referencias independientes | `backend/src/Services/EditionOrderPdfService.php:128`: storeFile actualiza edition_orders y ya no pone editions.file_id en NULL. Sigue marcando como reemplazado el PDF individual anterior: una colisión histórica donde ese ID también sea el final necesita tratamiento previo. |
| 3 | Integridad y disponibilidad unificadas | Parcial | Existen editionFileIsPublishable y publishedFileIsValid en `backend/src/Services/EditionIntegrityService.php:66`. Se usan en detalle y solicitante, pero no en listas públicas ni descarga final. |
| 4 | Subida: firma, páginas y 50 MB | Parcial | `backend/src/EditionController.php:750`: MAX_FILE_MB con valor predeterminado 50, MIME, firma %PDF- y PdfInspector. PHP admite 50M y Nginx 52M. `backend/.env.example:7` aún indica MAX_FILE_MB=500; no hay contrato uniforme de configuración ni prueba de 49/51 MB. |
| 5 | Reloj editorial Caracas | Parcial | Existe `backend/src/Services/EditorialClock.php`, utilizado en publicación. Crear y filtros públicos continúan con gmdate; el formulario usa toISOString, que expresa UTC. |
| 6 | Varias ediciones el mismo día | Parcial | Backend compara con `<` en `backend/src/Services/EditionPublicationService.php:209`; frontend mantiene `<=` en `frontend/src/pages/Ediciones.tsx:199`. |
| 7 | Rutas separadas, retiro y reserva de CVE | No operativo | El cliente llama /retire y /permanent, pero esas rutas no están registradas. El método retire llama a logAudit, que no existe. El DELETE anterior sigue borrando físicamente y el correlativo sigue usando MAX+1. |
| 8 | Log de invalidación por composición | Parcial | La acción edition_final_invalidated_due_composition existe en `backend/src/Services/EditionOrderService.php:123`, pero inserta actor_user_id=0. La FK exige un usuario existente o NULL. |
| 9 | /api/version y hash activo | Parcial | Ruta registrada en `backend/public/index.php:155`. El controlador lee .git/HEAD y referencias sueltas; no identifica modificaciones locales, packed-refs o worktrees. La imagen de producción del backend no incluye el .git raíz. built_at es la hora de la consulta. |
| 10 | Eliminar SSE de publicación | Implementado, con mejora pendiente | `frontend/src/lib/api.ts:290` y `backend/src/EditionController.php:647` usan JSON. El frontend propaga errores HTTP/JSON. No exige explícitamente data.ok===true; ante not_ready muestra el mensaje genérico, sin desglosar blockers. |
| 11 | Bloquear Publicar sin file_is_valid | Implementado | `frontend/src/pages/Ediciones.tsx:475`: deshabilita por archivo inválido, cero solicitudes o publicación activa. No consume un readiness completo. |
| 12 | Eliminar textos de autogeneración | Parcial | `frontend/src/pages/Ediciones.tsx:682` aún dice “PDF generado automáticamente y listo para compartir.” |
| 13 | Botón Retirar y confirmación específica | Interfaz implementada; acción rota | `frontend/src/pages/Ediciones.tsx:352` diferencia Publicada y explica conservación del CVE. La llamada falla por los problemas del punto 7. |
| 14 | Nombres de documentos descargables | Implementado en las ubicaciones indicadas | `frontend/src/pages/SuperAdmin/Publications.tsx:581`: Descargar orden de servicio. `frontend/src/pages/VisorEspressivoPDF.tsx:157`: Descargar PDF final de la edición. Existen otros botones genéricos Descargar/Descargar PDF en otras vistas. |
| 15 | Solicitante y enlace final canónico | Implementado en la selección del enlace; parcial de extremo a extremo | `backend/src/LegalController.php:154` y `:175` usan publishedFileIsValid y generan /api/e/code/{CVE}/download. La vista del solicitante usa editionDownloadUrl. La descarga pública receptora no valida el snapshot de publicación. |
| 16 | Hash en sidebar administrativo | Implementado en interfaz | `frontend/src/components/Sidebar.tsx:130`: versión visible para isAdmin, con sidebar expandida. La confiabilidad del dato depende del punto 9. |
| 17 | Tipos deleted_at, file_exists, content_url | Implementado y comprobado | `frontend/src/lib/api.ts:9`; npm run typecheck termina sin errores. |
| 18 | Script de reparación | Existe; cobertura incompleta | `backend/bin/repair_editions.php` audita por defecto y repara con --repair. No detecta toda colisión/PDF incorrecto, no usa el predicado publicado completo, procesa todos los inválidos y pasa actor 0. No acredita reparación de datos históricos. |

## Hallazgos que impiden cerrar

### 1. Retirar no funciona y sigue disponible el borrado de una publicada

En `backend/public/index.php:136` se registra DELETE /api/editions/{id}, pero no POST /retire ni DELETE /permanent. Tampoco se registra el método readiness como endpoint.

En `backend/src/EditionController.php:488`, retire invoca EditionOrderService::logAudit, método inexistente. Aunque se registre la ruta, la operación falla y revierte la transacción.

La ruta DELETE existente llama a permanentDelete. `backend/src/Services/PermanentDeletionService.php:150` elimina la fila sin exigir que nunca haya sido publicada. `backend/src/EditionController.php:377` asigna MAX(edition_no)+1. Si se borra la última edición de un año, puede reutilizarse su número/CVE. El retiro por interfaz no elimina esta posibilidad desde la API.

### 2. Listas, visor y descarga no comparten el criterio estricto

`backend/src/EditionController.php:69`, `:156` y `:228` calculan file_is_valid usando fileIsAvailable: comprueban existencia/tamaño, pero no checksum ni páginas ni snapshot publicado.

La descarga en `:111` comprueba files.checksum contra el archivo, sin comparar published_file_checksum. Si cambian el archivo y su checksum de files, el detalle/solicitante puede rechazarlo mientras la descarga canónica lo entrega.

`frontend/src/pages/EdicionesPublic.tsx:161` considera suficiente file_id o file_url y reconstruye enlaces por CVE. Puede ofrecer descarga aunque file_is_valid sea falso. El orden SQL por fecha/id sí está implementado, pero la lista no filtra por integridad estricta.

`backend/src/PublicLegalRequestView.php` resuelve el código de una edición publicada sin comprobar integridad del PDF.

### 3. Fecha y zona horaria siguen siendo inconsistentes

El backend permite la misma fecha y la UI la rechaza al cambiar el campo. El formulario inicial y su reinicio usan UTC (`Ediciones.tsx:15` y `:72`); crear y consultar ediciones públicas también usan gmdate (`EditionController.php:62`, `:95`, `:135`, `:175`, `:339`). El reloj nuevo no resuelve todo el ciclo editorial.

### 4. La validación estricta sucede antes de la transacción de publicación

El controlador ejecuta readiness antes de llamar al servicio. Dentro de la transacción, validatedFileChecksum solamente valida existencia, estado y checksum: no tamaño ni páginas. Un cambio de archivo/referencia entre preflight y commit puede hacer que se publique un archivo diferente del que pasó el control completo. Los llamados directos al servicio tampoco reciben la misma validación estricta del controlador.

Readiness además no revisa fecha permitida ni conflictos de composición con otras ediciones. Es una implementación parcial del contrato de la sección 36 del plan.

### 5. La auditoría puede bloquear cambios de composición y reparaciones

La migración `backend/migrations/03_phase5_schema.sql:46` define una FK entre audit_logs.actor_user_id y users.id. El nuevo log de composición usa 0; el script de reparación también entrega 0. Si users.id=0 no existe, el INSERT falla y la transacción revierte. Debe usarse el actor real o NULL para el sistema, según el caso.

### 6. Versionado y reparación no acreditan lo que promete el resumen

VersionController no aporta una identificación fiable de la imagen desplegada. `backend/Dockerfile.prod` copia el contexto backend a /var/www/html; el controlador busca .git fuera de ese contenido. El campo built_at no representa la fecha del build.

findInvalidPublishedEditions y repairInvalidPublishedEdition todavía se basan en fileHasValidChecksum. No detectan un snapshot de publicación distinto, PDFs no parseables con checksum consistente ni un PDF semánticamente equivocado. --repair actúa sobre todos los hallados, sin selección individual. El plan solicita análisis y reparación por edición, y comprobación de procedencia antes de recuperar datos.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| npm.cmd run typecheck, en frontend | Correcta. |
| npm.cmd test -- --run, en frontend | 8 archivos, 19 pruebas aprobadas. |
| php -l sobre los PHP modificados y los cuatro PHP nuevos relevantes | 12 archivos sin errores de sintaxis. |
| php vendor/bin/phpunit --filter 'Edition\|PermanentDeletion', en backend | 27 pruebas; 75 aserciones; 6 errores y 8 fallos. |

Los seis errores de EditionPdfGeneratorTest se producen porque las pruebas aún publican sin PDF final y esperan la generación anterior. Un test de EditionPublicationService también conserva una expectativa sobre el PDF fuente individual. Las siete fallas de AuthorizationIntegrationTest incluyen respuestas 500 y resultados de creación/eliminación distintos de los esperados. El fixture de integración no incluye published_file_checksum, que LegalController ahora consulta. No se atribuyen todas esas fallas a producción: la batería y sus fixtures necesitan ponerse al día y después volver a validarse.

Las pruebas verdes del frontend no cubren retiro, creación same-day ni todo el flujo de publicación. No hay evidencia de ejecución satisfactoria de la matriz V2 de distribuciones de usuarios, 20/50 solicitudes, archivos heterogéneos, reintentos y concurrencia.

## Otros requisitos del documento V2

- Crear fuerza Borrador y exige solicitudes; se mantiene autoridad backend para número/CVE. El problema de reutilización tras borrado permanece.
- Las páginas EditionPublic y EdicionesPublic usan FlipbookViewer; falta validar con el artefacto final íntegro y descarga real.
- No se encontraron campos de procedencia final file_source/file_updated_by/file_updated_at ni una secuencia persistente edition_sequences. Hay log upload_edition_pdf, sin procedencia ampliada.
- No se verificaron SHA real en producción, ausencia de cambios manuales en servidor, backups, staging, aceptación del cliente, rollback operativo, QR escaneable, comparación SHA de descargas reales ni los 30 puntos de regresión del plan. Son requisitos pendientes de evidencia, no afirmaciones de fallo.

## Orden recomendado para completar

1. Conectar y corregir retiro; impedir que la eliminación ordinaria de publicadas permita reutilizar identidad.
2. Unificar integridad en commit, listas, QR/redirección, visor y descarga canónica.
3. Aplicar Caracas y la regla de misma fecha en backend y frontend.
4. Corregir actores de auditoría y hacer la reparación seleccionable por edición, con el mismo criterio de integridad y revisión de procedencia.
5. Completar límites de carga, mensajes/readiness y metadatos de versión generados durante el build.
6. Actualizar pruebas del nuevo contrato, ejecutar la matriz V2 y documentar staging/aceptación/despliegue con SHA identificable.

**Conclusión: la lista describe avances reales, pero también presenta como terminadas varias partes que están incompletas o desconectadas.**
