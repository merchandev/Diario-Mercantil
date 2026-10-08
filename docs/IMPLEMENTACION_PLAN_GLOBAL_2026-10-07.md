# Diario Mercantil — Implementación del plan global

Fecha editorial: 7 de octubre de 2026. Repositorio: merchandev/Diario-Mercantil.

## Alcance y estado

Se aplica la parte del plan que corresponde a código, base de datos, interfaz y producción. El usuario indicó durante la intervención: **«no toques los correos por ahora, sigue con los demás»**. Por ello C22 y O02 quedan fuera del despliegue: no se modifican las credenciales SMTP, DNS, servicio de correo ni su worker.

El PDF previo mencionado en C02 no está entre los archivos disponibles. No se inventan sus títulos ni la posición exacta del campo Estado. Ese punto necesita el documento o los textos y posiciones concretos.

## Matriz del plan

| ID | Resultado y evidencia |
|---|---|
| C01 | Retirados del formulario Documento los comentarios técnicos visibles, incluyendo instrucciones «Debe admitir…» y marcas de formato. Se conservan ayudas de formato útiles. |
| C02 | Pendiente del PDF anterior: títulos exactos y ubicación del campo Estado. |
| C03 | YearPicker limita al año actual en America/Caracas. Creación/edición de ediciones y datos de solicitudes validan el límite en backend. Las fechas de pago y registro mantienen sus restricciones históricas. |
| C04 | Rechazo exige motivo, opera sobre el ID seleccionado, muestra errores y confirmación; el solicitante ve reject_reason. Correo aplazado por instrucción posterior. |
| C05 | Quitada la descarga redundante de la tabla administrativa de Publicaciones; las descargas de la ficha permanecen. |
| C06 | URL pública del solicitante pasa a hipervínculo clicable. QR y enlaces usan el identificador canónico. |
| C07 | El visor administrativo usa /api/editions/:id/download, también para borradores. Se conservan validaciones de PDF, páginas, tamaño y checksum. |
| C08 | PDF publicado se descarga por CVE; las pruebas comprueban el hash de los bytes recibidos. |
| C09 | Se corrige la consulta pública: una edición Publicada está disponible inmediatamente aunque su fecha sea posterior dentro del mismo año. Papelera y archivos inválidos siguen fuera del acceso público. |
| C10 | Listado público ordena por published_at e ID, mostrando las publicaciones más recientes; búsqueda incluye CVE. |
| C11 | La siguiente reserva empieza por el menor número libre desde 1; la secuencia antigua de pruebas no obliga a empezar en 16. Se preservan las ediciones existentes 10, 13 y 15; no se renumeran ni eliminan registros públicos. |
| C12 | Se reutiliza el menor número libre sin exigir vaciar papelera. Unicidad transaccional de números activos y rechazo 409 al restaurar un número ya ocupado. |
| C13 | SuperAdmin puede eliminar definitivamente registros de papelera, incluso con historial propio. La operación elimina sus archivos huérfanos y conserva archivos usados por otros registros. Publicaciones vinculadas a ediciones activas exigen retirar primero esas ediciones. |
| C14 | PromptDialog limpia contraseña al abrir/cerrar/cambiar usuario, usa input password, espera la API y mantiene visibles los errores. ConfirmDialog también espera la operación. |
| C15 | Identificación numérica con prefijo separado en registro y login, con validación backend. Se conserva un acceso administrativo explícito por usuario para cuentas históricas como soporte, restringido a administradores. |
| C16 | Solicitante y número de orden real se muestran en selección y composición de ediciones; backend devuelve applicant_name. |
| C17 | Insignias con colores por estado en la tabla administrativa y en el historial/ficha del solicitante. |
| C18 | Precio por folio final, IVA incluido: 13 × USD 3 = USD 39, sin incremento adicional. Nuevas solicitudes capturan base, IVA, tasa y total. |
| C19 | Desglose subtotal sin IVA + IVA = total en formularios/pago y orden de servicio. Se respetan los importes históricos almacenados. Convocatorias usan su precio fijo final. |
| C20 | CVE aleatorio independiente DM- + 24 dígitos hexadecimales. Código MMXXVI-0001 sigue como nomenclatura editorial. Enlaces históricos tienen alias por ID y nunca se reasignan a otra edición. |
| C21 | Control persistente registration_enabled en Configuración → Registro y panel SuperAdmin; API y formulario público impiden nuevas altas cuando está suspendido. Migración inicializa en 0. |
| C22 | Aplazado por el usuario. No se promete recuperación por correo ni envío real validado. |
| C23 | Auditoría física de tamaño/checksum, integridad de ediciones y volumen Docker persistente. Nuevo CLI de diagnóstico de solo lectura. |
| O01 | Recursos reales del VPS: 2 CPU, 7.8 GiB RAM, 2 GiB swap, disco 96 GiB con unos 30 GiB libres. El costo contratado no puede obtenerse del sistema operativo; requiere factura/panel del proveedor. |
| O02 | Aplazado por el usuario; ninguna modificación DNS ni SMTP. |

## Código y base de datos

### Identidad y numeración

`backend/src/Services/EditionIdentityService.php` reserva el menor número anual libre bajo transacción y bloqueo de la fila de secuencia. La creación mantiene el bloqueo anual de MySQL. La migración `20261007_000_editorial_identity.php`:

1. Añade y rellena el CVE aleatorio para todas las ediciones existentes.
2. Guarda alias de enlaces antiguos por ID, sin clave foránea que pudiera reasignarlos al borrar.
3. Sustituye la unicidad global del número/código por índices únicos sobre registros activos.
4. Inicializa la suspensión de nuevas altas.

Ejemplo: se crean 1 y 2; se retira 2; la siguiente recibe número 2 y CVE diferente. Restaurar la anterior responde 409 mientras el nuevo número 2 permanezca activo. Los enlaces canónicos de ambas contienen CVE, no el número reciclable.

### Papelera y eliminación

Retirar sigue siendo reversible: guarda composición y devuelve las publicaciones sin otra asociación activa a Por verificar. Restaurar vuelve a Borrador y exige nuevo PDF final. Eliminar definitivamente es una acción separada exclusiva de SuperAdmin: requiere papelera, elimina el historial propio y conserva cualquier archivo compartido.

### Precio final y persistencia

Para total USD 39 con IVA 16%: base mostrada USD 33.62, IVA USD 5.38. Se conserva precisión de cuatro decimales en el snapshot USD y dos en el total Bs. Las órdenes antiguas mantienen su total almacenado; no se recotiza producción retroactivamente.

El volumen `diario_mercantil_storage_data` se monta en `/var/www/html/storage`. UPLOAD_DIR es `/var/www/html/storage/uploads`. La auditoría anterior al despliegue comprobó 15 archivos sin discrepancias y tres ediciones publicadas con PDF válido. Por tanto no se constató pérdida física actual; el filtro de fecha y las URL explicaban la falta de acceso.

## Pruebas

- PHPUnit: 89 pruebas y 442 aserciones, con integración HTTP de carga/descarga, papelera, numeración, registro, fechas e integridad.
- Frontend: TypeScript, 26 pruebas Vitest y compilación Vite.
- Regresiones añadidas: CVE independiente, enlace antiguo después de reciclar número, inicio desde 1 pese a secuencia de pruebas, contraseña limpia con errores asíncronos, IVA incluido.
- PHP: comprobación de sintaxis de servicios, controladores, CLI y migraciones.

## Producción y respaldo

VPS autorizado: `/docker/diario-mercantil`, desplegado desde main. Respaldo previo fuera del checkout:

- `/docker/backups/diario-mercantil/plan-20261007/database.sql.gz`
- `/docker/backups/diario-mercantil/plan-20261007/storage.tar.gz`

La reconstrucción se limita a backend y frontend. Se conserva el worker de correo sin reiniciarlo, conforme a la instrucción posterior.

Comprobaciones después del despliegue: salud de contenedores, versión real del backend, migración, registro suspendido, listado público, enlaces antiguos/nuevos, hashes de PDF y auditoría de archivos.

### Diagnóstico de archivos

```sh
cd /docker/diario-mercantil
docker compose exec -T backend php bin/audit_editorial_storage.php
```

Es de solo lectura y no cambia estados ni borra archivos.

### Reversión

La migración cambia la identidad y los índices de unicidad. No debe desplegarse simplemente el código anterior sobre datos nuevos con números reciclados. Una reversión completa requiere detener escrituras y recuperar en conjunto base de datos, almacenamiento e imágenes anteriores desde el respaldo. No se ejecuta esa operación durante esta entrega.

## Pendientes externos

1. C02: PDF previo o títulos y ubicación exactos.
2. C22/O02: correo aplazado expresamente. Las comprobaciones previas mostraron TLS accesible con rechazo de autenticación y ausencia de MX/SPF/DMARC en la consulta pública; no se cambia nada. La guía oficial de Hostinger para la futura configuración está en [Configuración manual de correo](https://www.hostinger.com/support/8671319-set-up-a-domain-for-hostinger-email-manually/).
3. O01: factura vigente para informar el costo real contratado, incluidos renovación, impuestos y servicios adicionales. No se sustituye por una tarifa promocional inventada.

