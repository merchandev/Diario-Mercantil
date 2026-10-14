# Revisión punto por punto: v1026, modelo v826 y mantenimiento

Fecha: 12 de octubre de 2026. Comprobación pública del servidor: 2026-10-12 13:56:55, America/Caracas.
Revisión examinada en local, GitHub, backend y frontend: 2e8fa972457c7496119b0b4faa17ac504dfd58aa.

## Resultado

No procede mantener la afirmación de cierre completo del informe anterior. La revisión identifica seis defectos reproducibles y una inconsistencia adicional de validación de API, además de datos manuales pendientes de configuración.

- **73 observaciones de v1026:** 68 conformes en el alcance revisado y 5 parcialmente resueltas: S34, S35, S36, A14 y P8.
- **Modelo v826:** controles de presentación y pago aplicados; QR bancario real todavía sin cargar; identidad en el resumen no estable al reabrir.
- **23 controles de mantenimiento:** implementados en el alcance documentado. Nueve rutas reales muestran el bloqueo y seis API responden 503/no-store. No se observó un defecto nuevo en la autorización de mantenimiento.
- **Campos manuales:** los nueve datos institucionales/contacto/redes están vacíos, como se solicitó; el QR bancario tampoco está configurado. Son datos por completar, no campos faltantes en el código.

«Conforme» no significa que se haya ejecutado cada operación con datos de clientes en producción. Se distingue la lectura real del servidor de las pruebas aisladas y la comprobación de código. Los casos de fallos no modificaron solicitudes, pagos, ediciones ni cuentas reales.

## Hallazgos que faltan por corregir

### R01 - El resumen cambia la identidad del solicitante por la empresa del documento

Prioridad: **P1**. Afecta S34 y el bloque Datos del solicitante del modelo v826.

1. Una cuenta natural solicita publicar un documento de una empresa.
2. En el primer llenado, el resumen usa el nombre y documento de la cuenta.
3. El guardado escribe la razón social y RIF de la empresa en legal_requests.name/document.
4. Al reabrir, Documento copia esos campos a pay.name/pay.document y los muestra como identidad del solicitante.

Prueba de navegador: se esperaba SOLICITANTE DE PRUEBA / V45678901; el resumen mostró EMPRESA REPRESENTADA, C.A. / J123456789. La descripción de la empresa también conservó esa misma razón social. En producción se encontró **un registro activo** con nombre de empresa distinto al nombre de su cuenta, entre once documentos activos; no se expusieron identidades en el diagnóstico.

Corrección concreta: separar los datos del solicitante de los de la sociedad objeto de publicación. Mantener los metadatos y los importes históricos; no cambiar el nombre de la cuenta ni reinterpretar su documento personal como RIF de la sociedad.

Evidencia: [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:481>); [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:645>); browser-results.json → identity y api-results.json → document_save.

### R02 - Una convocatoria conserva el adjunto pero pierde los datos del borrador sin enviar

Prioridad: **P1**. Afecta S34 y la consistencia del proceso de solicitud.

1. Completar los datos de la convocatoria.
2. Cargar la imagen en el paso 2.
3. Salir sin reportar la solicitud y reabrir el borrador.
4. El archivo sigue cargado, pero la razón social y los demás datos locales se vacían.

La llamada createLegal envía meta, pero LegalController::create no lo inserta. onUpload crea/adjunta los archivos y no actualiza los metadatos. La escritura de meta solo llega al reporte final.

Prueba API aislada: creación y lectura HTTP 200, con meta enviado y meta almacenado nulo. Prueba de navegador: CONVOCATORIA DE PRUEBA antes de recargar y texto vacío después; scan.png permaneció visible.

Corrección concreta: persistir los datos del borrador antes de adjuntar el archivo o mediante una acción de guardar; compartir normalización/validación entre crear y editar. Reflejar en pantalla que el guardado se completó.

Evidencia: [frontend/src/pages/solicitante/Convocatoria.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Convocatoria.tsx:69>); [frontend/src/pages/solicitante/Convocatoria.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Convocatoria.tsx:77>); [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:247>); browser-results.json → convocatoria.

Se verificó por separado que **Documento sí hace PUT de metadatos después de crear su borrador**. No se extiende este hallazgo a su guardado inicial.

### R03 - Ocultar una devolución puede ocultar la publicación posterior

Prioridad: **P1**. Afecta S35/S36.

Inicio guarda el ID de la solicitud en localStorage al pulsar Ocultar. Ese mismo ID se filtra indefinidamente, aunque la solicitud pase de Borrador a Publicada o reciba un motivo nuevo de devolución.

Prueba: se ocultó la devolución de la solicitud 101, se devolvió Publicada desde la API y se recargó Inicio. El contador de publicadas se actualizó, pero no apareció ¡Publicación realizada!.

Corrección concreta: distinguir cada evento de notificación, con ID de evento o una combinación estable de solicitud, estado y fecha del evento; ocultar una devolución no debe ocultar una publicación posterior.

Evidencia: [frontend/src/pages/solicitante/Inicio.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx:22>); [frontend/src/pages/solicitante/Inicio.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx:36>); browser-results.json → notification.

### R04 - El límite de doce avisos usa el ID de solicitud, no la fecha del evento

Prioridad: **P2**. Afecta S35/S36.

applicantSummary selecciona los avisos con ORDER BY id DESC LIMIT 12. Una solicitud antigua recién publicada puede quedar fuera si hay doce avisos de solicitudes con ID mayor, aunque sus publicaciones sean anteriores.

Prueba aislada: la solicitud 100 pasó a Publicada con fecha 12 de octubre. Con trece publicaciones anteriores de ID 500–512, la respuesta devolvió solo 512–501 y omitió la publicación reciente 100.

Corrección concreta: ordenar/seleccionar por evento real de publicación/devolución y definir paginación o lectura de nuevos avisos. No usar el ID de creación de la solicitud para representar la actualidad de la notificación.

Evidencia: [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:75>); api-results.json → notice_ordering.

### R05 - Ingresos pendientes incluye cotizaciones de borradores eliminados

Prioridad: **P2**. Afecta A14.

Las cantidades de publicaciones y ediciones ya filtran deleted_at IS NULL. La consulta de revenue_pending_usd no lo hace y suma Borrador/Por verificar aunque el registro esté en la papelera.

Prueba aislada: un borrador cotizado en USD 10 produjo ingresos pendientes de 10; después de eliminarlo lógicamente, la cifra continuó en 10. No había un cobro histórico aprobado que justificara conservar esa cotización como pendiente.

Corrección concreta: excluir registros eliminados del indicador pendiente/vigente. Conservar por separado los cobros históricos que correspondan; no borrar movimientos financieros para corregir el contador.

Evidencia: [backend/src/SystemController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/SystemController.php:64>); api-results.json → pending_revenue. La tarjeta de Lotus se presenta como Ingresos Pendientes / Pendientes de confirmación.

### R06 - La pausa pública del Directorio solo reconoce el slug en minúsculas

Prioridad: **P2**. Afecta P8.

publicGet comprueba exactamente directorio-legal antes de consultar la base de datos. La columna slug de producción usa utf8mb4_unicode_ci y reconoce la misma página en mayúsculas/minúsculas.

Prueba aislada con colación NOCASE, equivalente para este slug ASCII: /api/page/directorio-legal devuelve 404, mientras /api/page/DIRECTORIO-LEGAL devuelve 200 cuando existe una página guardada.

**Actualmente no hay página Directorio publicada en producción. No se afirma que haya contenido del Directorio expuesto hoy.** El defecto permite saltarse la pausa si se conserva o incorpora ese contenido.

Corrección concreta: normalizar el slug antes de aplicar la pausa y cubrir las variantes/rutas del módulo.

Evidencia: [backend/src/PagesController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PagesController.php:119>); api-results.json → directory_pause. La colación real se verificó por lectura del servidor.

La API privada directory/profile sigue operativa. No se clasifica por sí sola como defecto A9: el plan aprobado pidió pausar los accesos visibles y conservar los datos, no eliminar las API internas.

### R07 - Inconsistencia adicional en la fecha genérica de la API

Prioridad: **P3**. Comprobación complementaria del modelo v826.

POST /api/legal acepta date=2026-10-13 cuando el día editorial es 2026-10-12, con HTTP 200. La validación inicial compara el año, no el día completo. En cambio, PUT con meta.fecha_registro futura devuelve 400 y los campos visibles de registro y pago sí tienen límite.

No se reporta que el usuario pueda introducir esa fecha futura en el control visible: este funciona. La inconsistencia está en el contrato de la API.

Corrección concreta: definir claramente el significado de date y compartir la validación de fecha válida/no futura para el dato de solicitud/registro que corresponda, sin impedir la planificación editorial cuando sea válida.

Evidencia: [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:227>); api-results.json → future_date.

### D01 - El informe de cierre anterior contiene estados y textos desactualizados

Los hallazgos R01–R06 impiden usar el cierre anterior como certificación de ausencia de pendientes. Además, sus filas S19 y S24 conservan frases antiguas sobre Convocatoria, aunque ya se retiró el tipo de operación y se uniformó el botón.

Esta revisión corrige la clasificación y registra el comportamiento observado. No modifica retrospectivamente la evidencia de las pruebas anteriores.

## Datos y estados que deben distinguirse de un defecto de código

| Identificador | Situación actual | Tratamiento |
|---|---|---|
| C01 | Razón social, RIF, dirección, correo, WhatsApp y cuatro enlaces de redes: nueve campos vacíos | Carga manual solicitada por el usuario. Campos y validación presentes. Contacto no envía a un número de ejemplo. |
| C02 | Único medio BNC, id 3, con qr_file_id nulo | Pendiente cargar la imagen oficial del banco en Medios de pago. El campo de carga existe y está probado. |
| C03 | Alias www sin registro DNS; dominio canónico diariomercantil.com activo | Futuro CNAME y habilitación del alias si se quiere ofrecer www. El código actual usa el dominio canónico. |
| C04 | Registro desactivado y mantenimiento activado | Estados administrativos vigentes, no fallos de implementación. |
| C05 | Ninguna edición publicada vigente; edición 9 en borrador, con CVE histórico largo | No publicar documentos de prueba en producción. El formato corto se aplica a nuevas ediciones; los enlaces anteriores se preservan. |

## Matriz de las 73 observaciones

Estado funcional: **Conforme** = requisito implementado sin defecto identificado en la comprobación descrita; **Parcial** = texto/control implementado, pero el escenario indicado no se completa correctamente.

Las filas de vista pública de una edición se verificaron por código/pruebas. No se declara una nueva publicación real: producción no tiene una edición publicada vigente.

| ID | Observación | Estado | Resultado actual | Fuente de código |
|---|---|---|---|---|

| S0 | Logo superior | Conforme | Logo SVG en Topbar; fecha presentada en Caracas. | [Topbar.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/Topbar.tsx>) |
| S1 | Título principal destacado | Conforme | Encabezado en mayúsculas y fajín vinotinto. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S2 | Título/texto del paso 1 | Conforme | Título y orientación del paso 1 presentes. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S3 | Etiquetas visibles | Conforme | Etiquetas visibles para sociedad, acto, Estado y oficina. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S4 | Letra uniforme | Conforme | Letra mantiene tipografía de los campos y columna propia. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S5 | Planilla o trámite | Conforme | Selector PUB/trámite, valores separados, validación de PUB y trámite hasta 64 caracteres. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S6 | Distribución compacta | Conforme | Distribución compacta por grupos Tomo/Letra/Número/Año y Expediente/Fecha/Referencia. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S7 | Título/texto paso 2 | Conforme | Título y orientación de carga del documento digitalizado presentes. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S8 | Advertencia de legibilidad | Conforme | Advertencia completa de legibilidad, páginas, sellos, firmas y corrección. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S9 | Quitar orden del paso 2 | Conforme | Descarga de orden retirada del paso 2. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S10 | Vista previa efectiva | Conforme | Visor PDF.js, archivo real, páginas y zoom; regresiones de archivos inválidos cubiertas. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S11 | Título/texto paso 3 | Conforme | Título y orientación del paso 3 presentes. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S12 | Tipografía resumen | Conforme | Descripción y datos comparables del resumen usan 16 px; los totales mantienen jerarquía. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S13 | Resumen de la orden | Conforme | Resumen de la orden con orden en minúscula. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S14 | Descripción y costo | Conforme | Descripción y costo y texto descriptivo solicitados, sin mayúsculas en toda la frase. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S15 | Razón social/datos sin corchetes | Conforme | Razón social en mayúsculas y negrita; sin corchetes; datos registrales destacados. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S16 | Título/texto bancario | Conforme | Título Datos bancarios para el pago y explicación de Pago Móvil. | [PaymentMethodsPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PaymentMethodsPanel.tsx>) |
| S17 | Banco destino, teléfono, sin titular | Conforme | Banco destino, Teléfono, RIF y Monto; sin Titular en la tarjeta del solicitante. | [PaymentMethodsPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PaymentMethodsPanel.tsx>) |
| S18 | Información del pago realizado | Conforme | Información del pago realizado con la capitalización solicitada. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S19 | Sin tipo de operación | Conforme | Tipo de operación retirado de Documento y Convocatoria; envío fijo de pago_movil. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S20 | Banco emisor vinotinto | Conforme | Desplegable de banco emisor de Documento en vinotinto. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S21 | Orden de campos | Conforme | Banco, teléfono, fecha y referencia en ese orden en ambos formularios. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S22 | Operadora sin selección automática | Conforme | Operadora inicial vacía; un pago existente restaura su prefijo realmente registrado. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S23 | Referencia de seis dígitos | Conforme | Seis dígitos en nuevos pagos; los cuatro dígitos históricos se conservan sin duplicar pagos. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S24 | Reportar solicitud | Conforme | Reportar solicitud en ambos formularios. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S25 | Elegir tipo desde Nueva publicación | Conforme | Nueva publicación abre selección de Documento o Convocatoria desde el lateral y el historial. | [Historial.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx>) |
| S26 | Quitar orden de listado | Conforme | Descargar orden retirado del historial. | [Historial.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx>) |
| S27 | Columna Edición | Conforme | Columna Edición después de Fecha de publicación, con nomenclatura oficial. | [Historial.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx>) |
| S28 | Tipo de pago legible | Conforme | Pago móvil sustituye la visualización del enum pago_movil. | [PublicacionDetalle.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/PublicacionDetalle.tsx>) |
| S29 | Quitar orden del detalle | Conforme | Descargar orden retirado del detalle del solicitante; facturación futura no se presenta como implementada. | [PublicacionDetalle.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/PublicacionDetalle.tsx>) |
| S30 | Ver en línea en listado | Conforme | Ver en línea dirige a la edición disponible; no ofrece enlace de PDF inexistente. | [Historial.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx>) |
| S31 | Dirección editable | Conforme | Dirección editable, persistida y limpiable en Perfil. | [Perfil.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Perfil.tsx>) |
| S32 | Nombre bloqueado | Conforme | Nombre de cuenta protegido en Perfil y API del solicitante. | [Perfil.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Perfil.tsx>) |
| S33 | Inicio separado y resumen | Conforme | Inicio separado del historial, indicadores propios y carrusel. | [Inicio.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx>) |
| S34 | Rehidratar solicitud devuelta | Parcial | PARCIAL: metadatos registrales y Consorcio se restauran, pero Documento mezcla identidad del solicitante y empresa (R01); Convocatoria pierde datos antes del envío al reabrir el borrador (R02). | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| S35 | Título de notificación | Parcial | PARCIAL: título correcto, pero el aviso puede no aparecer por ocultamiento previo o selección de las últimas doce por ID (R03/R04). | [Inicio.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx>) |
| S36 | Empresa en notificación | Parcial | PARCIAL: empresa en mayúsculas correcta cuando se muestra; no está garantizada la entrega del nuevo aviso por R03/R04. | [Inicio.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx>) |
| S37 | Cotizador por PDF y manual | Conforme | Manual y PDF. Se contó el PDF real de referencia de tres páginas; sin POST de archivo ni creación de solicitud. | [PublicationQuote.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicationQuote.tsx>) |
| S38 | Cotizador visual | Conforme | Cotizador con bloques de folios, precio, subtotal y total, IVA incluido y ambos modos. | [PublicationQuote.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicationQuote.tsx>) |
| A1 | Recepción operativa | Conforme | Recepción, revisión y acceso por rol conservados; pruebas de autorización correctas. | [LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php>) |
| A2 | Sustituir rechazo por devolución | Conforme | Solicitud devuelta/Volver a borrador reemplaza el rechazo de solicitud en lista y detalle. | [LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php>) |
| A3 | Motivo de devolución | Conforme | Motivo obligatorio en interfaz y API; persistencia y trazabilidad. | [LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php>) |
| A4 | CVE DMV-XXXXXXXX | Conforme | Nuevos CVE DMV-XXXXXXXX: ocho alfanuméricos en mayúscula, colisión controlada. Identificadores históricos conservados. | [EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php>) |
| A5 | CVE/URL/QR al crear borrador | Conforme | CVE, enlace y QR disponibles con el borrador, antes del PDF final. QR descargable de 1000 px. | [EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php>) |
| A6 | Conservar edición y revisar fecha | Conforme | Composición de edición, controles antes de publicar y exposición pública conservados; pruebas de borrador/publicación. | [EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php>) |
| A7 | Configuración general operativa | Conforme | Configuración general persistente, esquema de claves permitidas y precios finales con IVA incluido. | [SystemController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/SystemController.php>) |
| A8 | Medios de pago operativos | Conforme | CRUD y carga/sustitución/retiro del QR operativos. El medio real BNC aún tiene qr_file_id nulo: carga manual C02. | [PaymentController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PaymentController.php>) |
| A9 | Directorio pausado | Conforme | Accesos visibles del Directorio pausados conforme al alcance aprobado; datos y API privadas conservados. | [Configuracion.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Configuracion.tsx>) |
| A10 | Gestión de preguntas/respuestas | Conforme | Editor de pregunta/respuesta, crear/editar/eliminar y publicación CMS compartida. | [EditorialContentEditor.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/EditorialContentEditor.tsx>) |
| A11 | Términos completos editables | Conforme | Editor íntegro de términos en Configuración y página pública. | [EditorialContentEditor.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/EditorialContentEditor.tsx>) |
| A12 | Privacidad editable aparte | Conforme | Editor independiente de privacidad y página pública. | [EditorialContentEditor.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/EditorialContentEditor.tsx>) |
| A13 | Referencias legales enlazadas | Conforme | Referencias activas de Documento, Convocatoria, registro y pie enlazan a páginas públicas existentes. | [Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx>) |
| A14 | Estadísticas excluyen eliminados | Parcial | PARCIAL: cantidades operativas excluyen eliminados, pero ingresos pendientes todavía suma borradores eliminados (R05). Cobros históricos son una categoría distinta. | [SystemController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/SystemController.php>) |
| P1 | Unificar última edición/visor | Conforme | Última edición y detalle público usan PublicEditionPanel compartido. | [PublicEditionPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicEditionPanel.tsx>) |
| P2 | Número romano/arábigo en visor | Conforme | Código oficial romano/arábigo en el detalle, sin reemplazarlo por solo edition_no. | [PublicEditionPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicEditionPanel.tsx>) |
| P3 | CVE oculto público | Conforme | CVE oculto del resumen público y columna general; búsqueda por CVE conservada. | [PublicEditionPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicEditionPanel.tsx>) |
| P4 | Número oficial en listado | Conforme | Tabla pública usa code completo para la edición. | [EdicionesPublic.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EdicionesPublic.tsx>) |
| P5 | Razón social/acciones conservadas | Conforme | Razón social, estado y acciones conservadas; descarga solo de archivo disponible. | [EdicionesPublic.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EdicionesPublic.tsx>) |
| P6 | Búsqueda sin distinguir caja | Conforme | Búsqueda normalizada en Unicode y JSON; insensible a mayúsculas/minúsculas. | [EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php>) |
| P7 | Búsqueda CVE conservada | Conforme | Búsqueda y resolución por CVE nuevo y antiguo conservadas. | [EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php>) |
| P8 | Directorio público oculto | Parcial | PARCIAL: navegación y ruta normal ocultas, pero bloqueo de página directa sensible a caja; variante mayúscula evita el control si existe contenido guardado (R06). | [PagesController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PagesController.php>) |
| P9 | Información vinculada | Conforme | Sobre el Diario, Cómo publicar y FAQ publicados, con vínculos; también términos y privacidad. | [pages-v1026.json](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/resources/editorial/pages-v1026.json>) |
| P10 | Revisión Promo Banner | Conforme | Siete banners institucionales configurados; componente de Promo y referencias de imagen vigentes. | [Promo.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Promo.tsx>) |
| P11 | Estructura final Home | Conforme | Portada compuesta con banners, servicios, enlaces institucionales y vistas responsive. | [Home.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Home.tsx>) |
| P12 | Nombre/apellido mayúsculas | Conforme | Nombre/apellido convertido a mayúsculas en interfaz y registro API. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P13 | Prefijo/documento mismo renglón | Conforme | Prefijo documental y número en el mismo renglón. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P14 | Prefijos por tipo de persona | Conforme | Natural V/E/P y jurídica V/J/G, según selector, con validación en API. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P15 | Operadora más siete dígitos | Conforme | Prefijo de operadora y siete dígitos, sin prefijo de teléfono escogido inicialmente. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P16 | Mínimo nueve caracteres | Conforme | Mínimo nueve caracteres en interfaz y servidor; backend cuenta Unicode con mb_strlen. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P17 | Etiqueta de dirección | Conforme | Dirección de habitación o domicilio fiscal. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P18 | Aceptación obligatoria registro | Conforme | Aceptación obligatoria, vínculo, versión vigente y registro persistido. Registro público desactivado por configuración vigente. | [Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx>) |
| P19 | Etiqueta login | Conforme | Nro. de documento de identidad en login. | [Login.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Login.tsx>) |
| P20 | Acceso administrativo discreto | Conforme | Acceso administrativo debajo de Ingresar y antes de Crear cuenta. | [Login.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Login.tsx>) |

## Comprobaciones adicionales del modelo v826

| Control | Estado | Evidencia / límite |
|---|---|---|
| Escritura en mayúsculas en datos registrales | Conforme | Adaptador y actualización API; controles de razón social y registrador. |
| Titular/Suplente/Auxiliar | Conforme | Selector y validación en servidor. |
| Letra A–E | Conforme | Selector y validación; datos conservados al leer. |
| Tomo y número hasta tres dígitos | Conforme | Entrada numérica limitada y validación de metadatos. |
| Año hasta el corriente | Conforme | YearPicker y rechazo de año registral futuro. |
| Expediente 000-00000000 | Conforme | Máscara 3 + hasta 8 dígitos y validación API. |
| Planilla 000.0000.0.000000 | Conforme | Máscara 3/4/1/hasta 6 dígitos; número de trámite separado. |
| Fecha registral y fecha de pago no futuras | Conforme en controles/meta; API genérica R07 | No confundir fecha_registro validada con date genérico. |
| Precio equivalente a un folio | Conforme | Precio unitario calculado desde los importes/tasa almacenados; no muestra el total como unitario. |
| Subtotal e IVA ocultos del resumen de pago | Conforme | Total final mantenido; cálculo interno de IVA incluido. |
| Datos bancarios/QR/copiar datos | Código conforme; C02 manual | Tarjeta operativa; QR real sin cargar. |
| Referencia de cuatro dígitos del modelo anterior | Sustituida por requisito posterior | Seis dígitos según v1026; cuatro solo para pagos históricos sin nuevo reporte. |

## Matriz de mantenimiento

| ID | Control | Estado | Comprobación |
|---|---|---|---|
| M01 | Contraseña administrativa vigente o Lotus | Conforme al alcance | password_verify y selección de credenciales administrativas activas; suite de mantenimiento. |
| M02 | Cuatro horas exactas sin renovación silenciosa | Conforme al alcance | DURATION=14400; expires_at solo se crea en grant. |
| M03 | Autenticación y roles independientes | Conforme al alcance | La cookie de mantenimiento no crea dm_session ni sustituye permisos. |
| M04 | Logout/cambio de cuenta conserva permiso | Conforme al alcance | Cookies separadas; prueba automatizada y evidencia previa de producción. |
| M05 | Switch en Dashboard y Lotus | Conforme al alcance | MaintenanceControl en ambos paneles, guardado inmediato con CSRF. |
| M06 | Activar autoriza el navegador administrativo | Conforme al alcance | Grant dentro de toggle y cookie emitida en configure. |
| M07 | Desactivar abre; reactivar revoca | Conforme al alcance | Generación rota y permisos anteriores invalidados. |
| M08 | Contraseña/estado/rol/eliminación revocan | Conforme al alcance | Consulta de credencial y comparación de su huella en cada acceso. |
| M09 | Caducidad pide contraseña de nuevo | Conforme al alcance | Comparación temporal del servidor y temporizador de la interfaz. |
| M10 | Pantalla en todas las rutas | Conforme al alcance | Nueve rutas reales probadas, incluidas /docs y /docs/index.html. |
| M11 | API y documentos HTTP 503 | Conforme al alcance | Seis API reales comprobadas con maintenance_required. |
| M12 | Solo estado/desbloqueo/salud exceptuados | Conforme al alcance | Lista de rutas/métodos explícita; health/live comprobado HTTP 200. |
| M13 | Estado y bloqueo no-store | Conforme al alcance | Cabeceras verificadas nuevamente en producción. |
| M14 | Cookie y token protegidos | Conforme al alcance | Secure/HttpOnly/Strict; random_bytes(32), almacenamiento SHA-256. |
| M15 | Cinco fallos/15 min por IP; sexto 429 | Conforme al alcance | Servicio probado; proxy confía solo en gateway, IP real y rechazo de cabecera falsa verificados en entrega anterior. |
| M16 | Sin contraseña compartida nueva | Conforme al alcance | Se usan hashes de las cuentas existentes. |
| M17 | 30 segundos/visibilidad y bloqueo inmediato | Conforme al alcance | Intervalo, visibilitychange y transporte compartido; regresión de consulta pública cubierta. |
| M18 | Inactividad ordinaria de cuatro horas | Conforme al alcance | Conforme al alcance de interfaz; la sesión normal de backend conserva hasta siete días. La barrera de mantenimiento sí expira en servidor a las cuatro horas. |
| M19 | Migración y claves específicas | Conforme al alcance | Tablas maintenance_sessions/attempts; claves fuera de SettingSchema general. |
| M20 | Pruebas y TypeScript | Conforme al alcance | Repetidas: 112 pruebas PHP/630 aserciones y 49 frontend; TypeScript sin errores. Los escenarios nuevos no están cubiertos por la suite original. |
| M21 | Respaldo de BD y almacenamiento | Conforme al alcance | Respaldo de implementación y cierre verificado previamente; lectura/auditoría no requiere restaurarlo. |
| M22 | Despliegue/migraciones/volúmenes/correo | Conforme al alcance | Backend y frontend con 2e8fa97; producción consultada, sin cambios del servicio de correo en esta revisión. |
| M23 | Diseño final de mantenimiento | Conforme al alcance | Logo de 400 px centrado (diferencia 0 px), sin SVG de llave, sin texto eliminado, móvil 390 px sin desbordamiento. |

## Evidencia, alcance y limitaciones

- Se volvieron a leer los PDF originales: v826, 3 páginas; v1026, 15 páginas. Copias de extracción y SHA-256 en artifacts/audit2-20261012/pdf-sources.json.
- Producción: lectura de versión, configuración, páginas, medio de pago, edición vigente y colación; sin registrar solicitudes ni publicar ediciones.
- Browser público real: nueve rutas, seis API 503/no-store, salud 200 y pantalla móvil/escritorio. Resultado: public-production.json.
- Casos R01–R03: navegador local con aplicación compilada y respuestas simuladas que reproducen los contratos reales; resultado: browser-results.json. No se presenta la simulación como navegación de una cuenta real de producción.
- Casos R02/R04–R07: servidor PHP local con SQLite aislado; fixture completada con las columnas que usa crear/leer. NOCASE reproduce el comportamiento del slug ASCII en la colación MySQL verificada. Resultado: api-results.json.
- Cotizador: PDF original de tres páginas, resultado de tres folios, sin subida ni creación de solicitud. Tarifa y tasa del ensayo simuladas; el monto no es una cotización de producción.
- Suite existente reejecutada: 112 pruebas PHP/630 aserciones y 49 frontend; TypeScript correcto. La aprobación de la suite no demuestra que los escenarios R01–R07 estén resueltos.
- Los diagnósticos y capturas están en artifacts/audit2-20261012, excluido de Git; el informe se entrega en docs.
- Esta revisión no aplica correcciones ni despliega una nueva revisión de aplicación; documenta los pendientes observados sobre 2e8fa97.

## Orden de corrección recomendado

1. R02 y R01: guardar borradores de convocatoria y separar la identidad del solicitante de los metadatos de la empresa.
2. R03/R04: eventos de notificación independientes, ocultamiento por evento y orden temporal correcto.
3. R05: excluir eliminados de ingresos pendientes manteniendo separados los cobros históricos.
4. R06/R07: normalización del slug pausado y validación consistente de la fecha genérica.
5. Corregir el estado de cierre documental y añadir regresiones de cada caso; validar y desplegar las correcciones.
6. C01/C02: completar los datos oficiales y el QR bancario mediante sus campos manuales. C03 solo si se requiere el alias www.

## Seguimiento del 13 de octubre de 2026

Los hallazgos R01–R07 y D01 se corrigieron en código con pruebas de regresión. El detalle está en [ESTADO_COMPLETO_IMPLEMENTACION_2026-10-13.md](ESTADO_COMPLETO_IMPLEMENTACION_2026-10-13.md). Esta revisión conserva el estado observado sobre 2e8fa97. Para dar por cerrados los puntos en producción hay que desplegar las correcciones y volver a comprobarlas allí.
