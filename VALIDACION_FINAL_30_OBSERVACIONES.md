# Diario Mercantil — Validación final de las 30 observaciones

Fecha de preparación: 2026-08-29

Este paquete contiene la copia completa del proyecto con las correcciones aplicadas sobre el ZIP `DIARIO MERCANTIL.zip` suministrado para revisión.

## Estado de las 30 observaciones

1. Datos registrales: normalización y visualización de tipo de registrador, letra, expediente y planilla; validaciones de tomo, número, año y fechas.
2. Pago Móvil: operadoras 0412/0414/0416/0422/0424/0426 + 7 dígitos; backend valida el número completo.
3. Estado del pago: la UI deja de mostrar de forma fija “Pendiente de verificación” y usa el estado real.
4. Adjuntos Admin: rutas fechadas preservadas por `StoragePath`; descarga desde `/api/uploads/{id}`.
5. Folios: retirados de “Datos del Solicitante”; permanecen en la información del trámite/orden.
6. Ficha de usuario: acceso directo desde la solicitud y ruta `/dashboard/usuarios/:id`.
7. Solicitante: vista previa protegida y descarga de orden.
8. Solicitud publicada: descarga de la publicación vinculada a la edición.
9. QR público: se genera únicamente con la edición/CVE y no con ID u orden individual.
10. Rechazo: permitido en `Por verificar` y `En trámite`; la verificación usa el endpoint de transición de estado.
11. Roles: rutas administrativas correctas y política para asignación Admin/Solicitante según jerarquía configurada.
12. Configuración: claves de precios, instrucciones y banners aceptadas; endpoint Admin y `finally` de guardado.
13. Avatar: migración no destructiva para `avatar_url` y `avatar_updated_at`.
14. Pagos adicionales: eliminado el índice de un pago por solicitud; Admin puede registrar montos parciales en `En trámite`.
15. Solo Pago Móvil: frontend y backend usan `pago_movil`; no se expone transferencia bancaria.
16. Publicadas: no se pueden rechazar ni modificar por las acciones normales del trámite.
17. Edición en borrador: agregar/quitar publicaciones usa `setEditionOrders`; consultas usan `legal_request_id`.
18. Banners: settings públicos, selección de imágenes, archivos públicos y render en Home/Header/Popup.
19. Medios: eliminación física controlada y sin silenciar fallos relevantes de `unlink`.
20. Crear cuenta: móvil y escritorio apuntan a `/register`.
21. Ediciones: se muestra razón social (`company_name`) en lugar del solicitante cuando está disponible.
22. Edición publicada: controles de añadir/quitar ocultos y backend bloquea mutaciones.
23. Detalle completo de usuario: `UsuarioDetalle.tsx` y endpoint Admin.
24. Tabla de usuarios: enlaces desde nombre/documento a la ficha.
25. Historial por usuario: `user_id` se transmite y filtra en backend.
26. Fecha/hora: `America/Caracas` para solicitud; publicación mantiene fecha.
27. Última edición: URL PDF canónica `/api/e/code/{CVE}/download` y storage corregido.
28. Nomenclatura: CVE (Código de Verificación Electrónica) unificada.
29. Búsqueda pública: `q`, `from`, `to` enviados al backend; razón social y CVE incluidos.
30. Correlativo anual: `publication_year`, índice compuesto y `GET_LOCK` para MySQL; SQLite usa `BEGIN IMMEDIATE`.

## Correcciones adicionales de la revisión previa

- Referencia de Pago Móvil: exactamente 4 dígitos también validada en backend.
- Fecha de pago: formato `YYYY-MM-DD` válido y no futura también validada en backend.
- Banco emisor: obligatorio en backend.
- Datos de Pago Móvil administrables desde el panel con la misma lista de bancos.
- Instrucciones de Pago Móvil muestran banco destino, RIF, teléfono, monto, QR y botón “Copiar datos”.
- Texto público de precio por folio sin mostrar `+ IVA`; subtotal/IVA continúan ocultos visualmente según la revisión.
- Precio por folio en Bs. usa el valor base de un folio y no divide el total con IVA.
- Solicitudes publicadas quedan inmutables en la vista administrativa.
- SuperAdmin usa el endpoint real de verificación; `En trámite` no vuelve a mostrar acción de aprobar/verificar.
- Se eliminaron rutas/token SuperAdmin en `localStorage`; la sesión usa cookie HttpOnly.
- `run_migration.php` público fue retirado.
- CI usa el migrador canónico `php bin/migrate.php`.

## Validaciones ejecutadas en este entorno

- `npm run typecheck`: **OK, 0 errores TypeScript**.
- `npm test -- --run`: **OK, 4 pruebas frontend**.
- `npm run build`: **OK en host, Docker Node 20 y contenedor Node 18 equivalente a CI**.
- Lint PHP completo (sin `vendor`): **OK, 135 archivos sin errores de sintaxis**.
- PHPUnit: **OK, 21 pruebas y 53 aserciones**.
- `composer validate --strict`, `composer check-platform-reqs`, `composer audit` y generación OpenAPI: **OK**.
- `npm audit --omit=dev`: se redujo de 3 altas a 2 moderadas al actualizar React Router 6; las restantes solo ofrecen corrección automática migrando a React Router 7, un cambio mayor fuera de este cierre.
- Docker Compose: **backend, frontend y MySQL healthy; worker activo**.
- Migraciones canónicas en MySQL 8: **OK desde base limpia y en reejecución idempotente**.
- MySQL mantiene la sesión en UTC (`+00:00`): **OK**.
- Flujos E2E Admin/Solicitante, pagos parciales, edición/CVE/QR, Directorio, CMS, SSE, sesión y banner/papelera: **OK**.
- Validación UTF-8 de fuentes: **OK**.
- Búsqueda de caracteres de reemplazo `�`: **sin resultados en fuentes**.
- Búsqueda de `CEV`: **sin usos runtime pendientes**.
- Búsqueda de `http_responsedition_code`: **sin resultados**.
- Búsqueda de `order_id FROM edition_orders`: **sin resultados**.
- Búsqueda de diálogos nativos, tokens en `localStorage`, placeholders y transferencia bancaria: **sin resultados runtime**.

## Puerta operativa antes de producción

Las validaciones de esta revisión se ejecutaron contra un entorno Docker/MySQL local descartable. El despliegue real no forma parte de esta ejecución. Antes de tocar el VPS se debe crear y comprobar un backup de MySQL y de `backend/storage`, volver a ejecutar las migraciones en staging/producción y revisar los servicios y logs del entorno real.

## Nota de seguridad

No sustituya la base de datos ni los volúmenes de producción durante una actualización de código. Realice backup de MySQL y `backend/storage` antes de ejecutar migraciones.
