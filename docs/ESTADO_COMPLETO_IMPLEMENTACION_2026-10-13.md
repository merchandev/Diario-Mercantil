# Inventario completo de implementación y estado

Fecha del informe: **13 de octubre de 2026**. Base funcional: revisión punto por punto del **12 de octubre de 2026**. Hoy se volvió a comprobar que la copia local, la rama main de GitHub y el checkout del servidor tienen la revisión **2e8fa972457c7496119b0b4faa17ac504dfd58aa**; backend y frontend están en ejecución y saludables. Esa comprobación de versión y salud no sustituye la revisión funcional.

**El sistema todavía tiene pendientes.** Hay 68 observaciones de v1026 conformes y cinco parciales. Los 23 controles de mantenimiento están conformes dentro del alcance documentado. Las correcciones R01–R07 identificadas en la revisión siguen pendientes sobre esta revisión de código.

## Actualización del 13 de octubre: correcciones R01–R07 en código

Se corrigieron en la copia local los siete hallazgos y el documento de cierre anterior (D01). Cada corrección tiene una prueba de regresión que reproduce el caso de la revisión. **Todavía no se han publicado en GitHub ni desplegado en producción.** Por eso, las tablas siguientes conservan el estado medido en producción sobre 2e8fa97.

| Hallazgo | Corrección aplicada | Prueba de regresión |
| --- | --- | --- |
| R01 | La API fija el nombre y el documento de la solicitud con los datos de la cuenta del solicitante. La razón social y el RIF de la sociedad permanecen en los metadatos. Documento deja de copiarlos en esos campos y, al reabrir, muestra la identidad de la cuenta. El registro afectado se corrige automáticamente en el siguiente guardado del solicitante. | PHP testApplicantIdentityIsNeverReplacedByTheRepresentedCompany; Documento.test.tsx |
| R02 | Crear y editar comparten la normalización y validación de metadatos. La creación guarda los metadatos. Convocatoria guarda sus datos antes de adjuntar un archivo, ofrece Guardar borrador e indica la hora del guardado. Si el guardado falla, no adjunta el archivo. La dirección conserva el id para recargar el borrador. | PHP testConvocatoriaDraftPersistsMetaOnCreationWithSharedValidation; Convocatoria.test.tsx |
| R03 | Cada aviso tiene una clave de evento formada por solicitud, estado e id de auditoría. Ocultar una devolución ya no oculta la publicación posterior. | Inicio.test.tsx; PHP testNoticesAreIndependentEventsOrderedByEventNotRequestId |
| R04 | Los doce avisos se seleccionan por el evento de auditoría más reciente (publicación o devolución), no por el id de la solicitud. | PHP testNoticesAreIndependentEventsOrderedByEventNotRequestId |
| R05 | Ingresos pendientes excluye los registros en la papelera. Los cobros históricos no se modifican. | PHP testPendingRevenueExcludesTrashedDrafts |
| R06 | La pausa normaliza mayúsculas, espacios y codificación del slug y vuelve a comprobar el slug encontrado en la base de datos. | PHP testPausedDirectoryPageIsBlockedForEverySlugVariant |
| R07 | `date` se define como fecha de la solicitud: debe ser una fecha real no posterior al día editorial de Caracas, al crear y al editar. Si no se envía, la asigna el servidor. Documento ya no copia en ella la fecha de registro. La planificación de ediciones conserva su validación propia. | PHP testRequestDateMustBeValidAndNotFuture |
| D01 | CIERRE_V1026_2026-10-12.md indica que ya no certifica ausencia de pendientes, corrige S19/S24 y marca los cinco puntos parciales. | Revisión documental |

Validación local: frontend con 55 pruebas en 19 archivos, TypeScript y compilación de producción correctos. PHP con 118 pruebas: pasan las seis nuevas. Las 16 fallas restantes también ocurren sin estos cambios, porque este equipo Windows no tiene `pdfinfo` (poppler). Ese programa sí existe en el contenedor de producción. La suite PHP completa debe repetirse en el contenedor antes del despliegue.

Al desplegar y volver a verificar, S34, S35, S36, A14 y P8 pasarían a conformes: 73/73 en v1026 y 96/96 en el inventario combinado. Esa cifra no se declara hasta comprobarla en producción.

## Cómo se calculan los porcentajes

- **Porcentaje de cierre = requisitos conformes / requisitos revisados × 100.** Cada requisito cuenta una vez; no se pondera por horas de trabajo, complejidad o importancia.
- **100 % por fila** significa conforme en el alcance revisado, con la evidencia indicada en la auditoría. No significa que se hayan probado todas las combinaciones posibles con cuentas reales de producción.
- **Parcial / no cuantificado** significa que ya hay implementación, pero uno o más casos necesarios fallan. No se asigna un 50 % o 75 % sin una medida verificable. Para el porcentaje de cierre del grupo, un requisito parcial aún no cuenta como cerrado.
- Los datos institucionales y el QR oficial pendientes de carga manual se muestran por separado. No se inventan datos ni se consideran campos ausentes del software.
- Los controles adicionales del modelo v826 se solapan con v1026; no se suman otra vez. R07 es un hallazgo adicional de API fuera de las 73 observaciones; el porcentaje del inventario original no lo oculta ni incorpora como requisito original.

## Resumen de cierre

| Área | Total | Conformes | Parciales | Cierre verificado |
| --- | ---: | ---: | ---: | ---: |
| Vista del solicitante | 39 | 36 | 3 | 92,31 % |
| Administración / edición / configuración | 14 | 13 | 1 | 92,86 % |
| Web pública / registro / login | 20 | 19 | 1 | 95,00 % |
| **Versión 2 / v1026** | **73** | **68** | **5** | **93,15 %** |
| Mantenimiento programado, alcance documentado | 23 | 23 | 0 | 100,00 % |
| **Inventario original combinado** | **96** | **91** | **5** | **94,79 %** |

El 94,79 % corresponde únicamente a los 96 elementos de ese inventario. No es un porcentaje de seguridad, de calidad del sistema ni de cierre de los hallazgos adicionales. Para declarar todo cerrado también deben resolverse R07 y la actualización del informe de cierre anterior.

## Vista del solicitante: 39 observaciones

| ID | Cambio | Estado / grado | Porcentaje verificado | Qué está implementado y qué falta |
| --- | --- | --- | --- | --- |
| S0 | Logo superior | Conforme | 100 % | Logo SVG en Topbar; fecha presentada en Caracas. |
| S1 | Título principal destacado | Conforme | 100 % | Encabezado en mayúsculas y fajín vinotinto. |
| S2 | Título/texto del paso 1 | Conforme | 100 % | Título y orientación del paso 1 presentes. |
| S3 | Etiquetas visibles | Conforme | 100 % | Etiquetas visibles para sociedad, acto, Estado y oficina. |
| S4 | Letra uniforme | Conforme | 100 % | Letra mantiene tipografía de los campos y columna propia. |
| S5 | Planilla o trámite | Conforme | 100 % | Selector PUB/trámite, valores separados, validación de PUB y trámite hasta 64 caracteres. |
| S6 | Distribución compacta | Conforme | 100 % | Distribución compacta por grupos Tomo/Letra/Número/Año y Expediente/Fecha/Referencia. |
| S7 | Título/texto paso 2 | Conforme | 100 % | Título y orientación de carga del documento digitalizado presentes. |
| S8 | Advertencia de legibilidad | Conforme | 100 % | Advertencia completa de legibilidad, páginas, sellos, firmas y corrección. |
| S9 | Quitar orden del paso 2 | Conforme | 100 % | Descarga de orden retirada del paso 2. |
| S10 | Vista previa efectiva | Conforme | 100 % | Visor PDF.js, archivo real, páginas y zoom; regresiones de archivos inválidos cubiertas. |
| S11 | Título/texto paso 3 | Conforme | 100 % | Título y orientación del paso 3 presentes. |
| S12 | Tipografía resumen | Conforme | 100 % | Descripción y datos comparables del resumen usan 16 px; los totales mantienen jerarquía. |
| S13 | Resumen de la orden | Conforme | 100 % | Resumen de la orden con orden en minúscula. |
| S14 | Descripción y costo | Conforme | 100 % | Descripción y costo y texto descriptivo solicitados, sin mayúsculas en toda la frase. |
| S15 | Razón social/datos sin corchetes | Conforme | 100 % | Razón social en mayúsculas y negrita; sin corchetes; datos registrales destacados. |
| S16 | Título/texto bancario | Conforme | 100 % | Título Datos bancarios para el pago y explicación de Pago Móvil. |
| S17 | Banco destino, teléfono, sin titular | Conforme | 100 % | Banco destino, Teléfono, RIF y Monto; sin Titular en la tarjeta del solicitante. |
| S18 | Información del pago realizado | Conforme | 100 % | Información del pago realizado con la capitalización solicitada. |
| S19 | Sin tipo de operación | Conforme | 100 % | Tipo de operación retirado de Documento y Convocatoria; envío fijo de pago_movil. |
| S20 | Banco emisor vinotinto | Conforme | 100 % | Desplegable de banco emisor de Documento en vinotinto. |
| S21 | Orden de campos | Conforme | 100 % | Banco, teléfono, fecha y referencia en ese orden en ambos formularios. |
| S22 | Operadora sin selección automática | Conforme | 100 % | Operadora inicial vacía; un pago existente restaura su prefijo realmente registrado. |
| S23 | Referencia de seis dígitos | Conforme | 100 % | Seis dígitos en nuevos pagos; los cuatro dígitos históricos se conservan sin duplicar pagos. |
| S24 | Reportar solicitud | Conforme | 100 % | Reportar solicitud en ambos formularios. |
| S25 | Elegir tipo desde Nueva publicación | Conforme | 100 % | Nueva publicación abre selección de Documento o Convocatoria desde el lateral y el historial. |
| S26 | Quitar orden de listado | Conforme | 100 % | Descargar orden retirado del historial. |
| S27 | Columna Edición | Conforme | 100 % | Columna Edición después de Fecha de publicación, con nomenclatura oficial. |
| S28 | Tipo de pago legible | Conforme | 100 % | Pago móvil sustituye la visualización del enum pago_movil. |
| S29 | Quitar orden del detalle | Conforme | 100 % | Descargar orden retirado del detalle del solicitante; facturación futura no se presenta como implementada. |
| S30 | Ver en línea en listado | Conforme | 100 % | Ver en línea dirige a la edición disponible; no ofrece enlace de PDF inexistente. |
| S31 | Dirección editable | Conforme | 100 % | Dirección editable, persistida y limpiable en Perfil. |
| S32 | Nombre bloqueado | Conforme | 100 % | Nombre de cuenta protegido en Perfil y API del solicitante. |
| S33 | Inicio separado y resumen | Conforme | 100 % | Inicio separado del historial, indicadores propios y carrusel. |
| S34 | Rehidratar solicitud devuelta | **Parcial** | **No cuantificado** | metadatos registrales y Consorcio se restauran, pero Documento mezcla identidad del solicitante y empresa (R01); Convocatoria pierde datos antes del envío al reabrir el borrador (R02). |
| S35 | Título de notificación | **Parcial** | **No cuantificado** | título correcto, pero el aviso puede no aparecer por ocultamiento previo o selección de las últimas doce por ID (R03/R04). |
| S36 | Empresa en notificación | **Parcial** | **No cuantificado** | empresa en mayúsculas correcta cuando se muestra; no está garantizada la entrega del nuevo aviso por R03/R04. |
| S37 | Cotizador por PDF y manual | Conforme | 100 % | Manual y PDF. Se contó el PDF real de referencia de tres páginas; sin POST de archivo ni creación de solicitud. |
| S38 | Cotizador visual | Conforme | 100 % | Cotizador con bloques de folios, precio, subtotal y total, IVA incluido y ambos modos. |

## Administración: 14 observaciones

| ID | Cambio | Estado / grado | Porcentaje verificado | Qué está implementado y qué falta |
| --- | --- | --- | --- | --- |
| A1 | Recepción operativa | Conforme | 100 % | Recepción, revisión y acceso por rol conservados; pruebas de autorización correctas. |
| A2 | Sustituir rechazo por devolución | Conforme | 100 % | Solicitud devuelta/Volver a borrador reemplaza el rechazo de solicitud en lista y detalle. |
| A3 | Motivo de devolución | Conforme | 100 % | Motivo obligatorio en interfaz y API; persistencia y trazabilidad. |
| A4 | CVE DMV-XXXXXXXX | Conforme | 100 % | Nuevos CVE DMV-XXXXXXXX: ocho alfanuméricos en mayúscula, colisión controlada. Identificadores históricos conservados. |
| A5 | CVE/URL/QR al crear borrador | Conforme | 100 % | CVE, enlace y QR disponibles con el borrador, antes del PDF final. QR descargable de 1000 px. |
| A6 | Conservar edición y revisar fecha | Conforme | 100 % | Composición de edición, controles antes de publicar y exposición pública conservados; pruebas de borrador/publicación. |
| A7 | Configuración general operativa | Conforme | 100 % | Configuración general persistente, esquema de claves permitidas y precios finales con IVA incluido. |
| A8 | Medios de pago operativos | Conforme | 100 % | CRUD y carga/sustitución/retiro del QR operativos. El medio real BNC aún tiene qr_file_id nulo: carga manual C02. |
| A9 | Directorio pausado | Conforme | 100 % | Accesos visibles del Directorio pausados conforme al alcance aprobado; datos y API privadas conservados. |
| A10 | Gestión de preguntas/respuestas | Conforme | 100 % | Editor de pregunta/respuesta, crear/editar/eliminar y publicación CMS compartida. |
| A11 | Términos completos editables | Conforme | 100 % | Editor íntegro de términos en Configuración y página pública. |
| A12 | Privacidad editable aparte | Conforme | 100 % | Editor independiente de privacidad y página pública. |
| A13 | Referencias legales enlazadas | Conforme | 100 % | Referencias activas de Documento, Convocatoria, registro y pie enlazan a páginas públicas existentes. |
| A14 | Estadísticas excluyen eliminados | **Parcial** | **No cuantificado** | cantidades operativas excluyen eliminados, pero ingresos pendientes todavía suma borradores eliminados (R05). Cobros históricos son una categoría distinta. |

## Web pública: 20 observaciones

| ID | Cambio | Estado / grado | Porcentaje verificado | Qué está implementado y qué falta |
| --- | --- | --- | --- | --- |
| P1 | Unificar última edición/visor | Conforme | 100 % | Última edición y detalle público usan PublicEditionPanel compartido. |
| P2 | Número romano/arábigo en visor | Conforme | 100 % | Código oficial romano/arábigo en el detalle, sin reemplazarlo por solo edition_no. |
| P3 | CVE oculto público | Conforme | 100 % | CVE oculto del resumen público y columna general; búsqueda por CVE conservada. |
| P4 | Número oficial en listado | Conforme | 100 % | Tabla pública usa code completo para la edición. |
| P5 | Razón social/acciones conservadas | Conforme | 100 % | Razón social, estado y acciones conservadas; descarga solo de archivo disponible. |
| P6 | Búsqueda sin distinguir caja | Conforme | 100 % | Búsqueda normalizada en Unicode y JSON; insensible a mayúsculas/minúsculas. |
| P7 | Búsqueda CVE conservada | Conforme | 100 % | Búsqueda y resolución por CVE nuevo y antiguo conservadas. |
| P8 | Directorio público oculto | **Parcial** | **No cuantificado** | navegación y ruta normal ocultas, pero bloqueo de página directa sensible a caja; variante mayúscula evita el control si existe contenido guardado (R06). |
| P9 | Información vinculada | Conforme | 100 % | Sobre el Diario, Cómo publicar y FAQ publicados, con vínculos; también términos y privacidad. |
| P10 | Revisión Promo Banner | Conforme | 100 % | Siete banners institucionales configurados; componente de Promo y referencias de imagen vigentes. |
| P11 | Estructura final Home | Conforme | 100 % | Portada compuesta con banners, servicios, enlaces institucionales y vistas responsive. |
| P12 | Nombre/apellido mayúsculas | Conforme | 100 % | Nombre/apellido convertido a mayúsculas en interfaz y registro API. |
| P13 | Prefijo/documento mismo renglón | Conforme | 100 % | Prefijo documental y número en el mismo renglón. |
| P14 | Prefijos por tipo de persona | Conforme | 100 % | Natural V/E/P y jurídica V/J/G, según selector, con validación en API. |
| P15 | Operadora más siete dígitos | Conforme | 100 % | Prefijo de operadora y siete dígitos, sin prefijo de teléfono escogido inicialmente. |
| P16 | Mínimo nueve caracteres | Conforme | 100 % | Mínimo nueve caracteres en interfaz y servidor; backend cuenta Unicode con mb_strlen. |
| P17 | Etiqueta de dirección | Conforme | 100 % | Dirección de habitación o domicilio fiscal. |
| P18 | Aceptación obligatoria registro | Conforme | 100 % | Aceptación obligatoria, vínculo, versión vigente y registro persistido. Registro público desactivado por configuración vigente. |
| P19 | Etiqueta login | Conforme | 100 % | Nro. de documento de identidad en login. |
| P20 | Acceso administrativo discreto | Conforme | 100 % | Acceso administrativo debajo de Ingresar y antes de Crear cuenta. |

## Mantenimiento programado: 23 controles

| ID | Control implementado | Estado / grado | Porcentaje verificado | Evidencia / alcance |
| --- | --- | --- | --- | --- |
| M01 | Contraseña administrativa vigente o Lotus | Conforme al alcance | 100 % | password_verify y selección de credenciales administrativas activas; suite de mantenimiento. |
| M02 | Cuatro horas exactas sin renovación silenciosa | Conforme al alcance | 100 % | DURATION=14400; expires_at solo se crea en grant. |
| M03 | Autenticación y roles independientes | Conforme al alcance | 100 % | La cookie de mantenimiento no crea dm_session ni sustituye permisos. |
| M04 | Logout/cambio de cuenta conserva permiso | Conforme al alcance | 100 % | Cookies separadas; prueba automatizada y evidencia previa de producción. |
| M05 | Switch en Dashboard y Lotus | Conforme al alcance | 100 % | MaintenanceControl en ambos paneles, guardado inmediato con CSRF. |
| M06 | Activar autoriza el navegador administrativo | Conforme al alcance | 100 % | Grant dentro de toggle y cookie emitida en configure. |
| M07 | Desactivar abre; reactivar revoca | Conforme al alcance | 100 % | Generación rota y permisos anteriores invalidados. |
| M08 | Contraseña/estado/rol/eliminación revocan | Conforme al alcance | 100 % | Consulta de credencial y comparación de su huella en cada acceso. |
| M09 | Caducidad pide contraseña de nuevo | Conforme al alcance | 100 % | Comparación temporal del servidor y temporizador de la interfaz. |
| M10 | Pantalla en todas las rutas | Conforme al alcance | 100 % | Nueve rutas reales probadas, incluidas /docs y /docs/index.html. |
| M11 | API y documentos HTTP 503 | Conforme al alcance | 100 % | Seis API reales comprobadas con maintenance_required. |
| M12 | Solo estado/desbloqueo/salud exceptuados | Conforme al alcance | 100 % | Lista de rutas/métodos explícita; health/live comprobado HTTP 200. |
| M13 | Estado y bloqueo no-store | Conforme al alcance | 100 % | Cabeceras verificadas nuevamente en producción. |
| M14 | Cookie y token protegidos | Conforme al alcance | 100 % | Secure/HttpOnly/Strict; random_bytes(32), almacenamiento SHA-256. |
| M15 | Cinco fallos/15 min por IP; sexto 429 | Conforme al alcance | 100 % | Servicio probado; proxy confía solo en gateway, IP real y rechazo de cabecera falsa verificados en entrega anterior. |
| M16 | Sin contraseña compartida nueva | Conforme al alcance | 100 % | Se usan hashes de las cuentas existentes. |
| M17 | 30 segundos/visibilidad y bloqueo inmediato | Conforme al alcance | 100 % | Intervalo, visibilitychange y transporte compartido; regresión de consulta pública cubierta. |
| M18 | Inactividad ordinaria de cuatro horas | Conforme al alcance | 100 % | Conforme al alcance de interfaz; la sesión normal de backend conserva hasta siete días. La barrera de mantenimiento sí expira en servidor a las cuatro horas. |
| M19 | Migración y claves específicas | Conforme al alcance | 100 % | Tablas maintenance_sessions/attempts; claves fuera de SettingSchema general. |
| M20 | Pruebas y TypeScript | Conforme al alcance | 100 % | Repetidas: 112 pruebas PHP/630 aserciones y 49 frontend; TypeScript sin errores. Los escenarios nuevos no están cubiertos por la suite original. |
| M21 | Respaldo de BD y almacenamiento | Conforme al alcance | 100 % | Respaldo de implementación y cierre verificado previamente; lectura/auditoría no requiere restaurarlo. |
| M22 | Despliegue/migraciones/volúmenes/correo | Conforme al alcance | 100 % | Backend y frontend con 2e8fa97; producción consultada, sin cambios del servicio de correo en esta revisión. |
| M23 | Diseño final de mantenimiento | Conforme al alcance | 100 % | Logo de 400 px centrado (diferencia 0 px), sin SVG de llave, sin texto eliminado, móvil 390 px sin desbordamiento. |

**Alcance de las cuatro horas:** el permiso de mantenimiento expira en el servidor a las cuatro horas exactas y no se renueva por navegar. El cierre ordinario por cuatro horas de inactividad está implementado en la interfaz; la sesión ordinaria del backend conserva una duración de hasta siete días. Son mecanismos distintos.

## Controles adicionales del modelo v826

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

Estos controles complementan la misma implementación de los tres pasos y no aumentan el denominador de 73 observaciones. Sus estados se conservan con el alcance y las limitaciones de la revisión original.

## Contenido y entregas complementarias implementadas

| Entrega | Estado | Cierre / alcance |
| --- | --- | --- |
| Cinco páginas: Sobre el Diario, Cómo publicar, Preguntas frecuentes, Términos y condiciones, Políticas de privacidad | Publicadas y enlazadas | 100 % de la entrega de páginas; datos oficiales del operador todavía manuales |
| Siete banners institucionales: cabecera, principal, lateral, promoción y tres de historial | Configurados y revisados en escritorio y móvil | 100 % de la entrega de banners |
| Instalador editorial que respeta contenido existente y puede repetirse sin duplicarlo | Implementado | 100 % del alcance revisado |
| Migración de aceptación de términos y migración de mantenimiento programado | Aplicadas | 100 % de las dos migraciones previstas |
| Respaldo previo de base de datos, almacenamiento y configuración protegida | Verificado en la entrega anterior | 100 % de las comprobaciones documentadas; no se ejecutó una restauración en esta consulta |
| Backend y frontend desplegados; volúmenes y servicio de correo conservados | Versión 2e8fa97; contenedores saludables comprobados hoy | 100 % del despliegue de esa revisión; todavía no incluye las correcciones R01–R07 |
| Dominio canónico diariomercantil.com y ajuste de la configuración TLS | Implementados | 100 % del ajuste del dominio canónico; alias www sin DNS |

## Correcciones técnicas: estado en producción (2e8fa97) y en código

| Hallazgo | Prioridad | Afecta | Implementación existente / problema pendiente | Estado |
| --- | --- | --- | --- | --- |
| R01 | P1 | S34 y resumen v826 | Documento restaura información, pero al reabrir puede mostrar razón social/RIF de la empresa como identidad del solicitante. Falta separar las dos identidades. | Corregido en código; pendiente de despliegue |
| R02 | P1 | S34 | Convocatoria conserva el archivo adjunto, pero pierde los datos introducidos en el borrador antes de enviarlo. Falta guardar esos metadatos desde su creación. | Corregido en código; pendiente de despliegue |
| R03 | P1 | S35 y S36 | El aviso está diseñado y muestra empresa/título correctos; ocultar una devolución por ID puede ocultar la publicación posterior de esa misma solicitud. Falta identificar cada evento. | Corregido en código; pendiente de despliegue |
| R04 | P2 | S35 y S36 | El resumen tiene notificaciones, pero escoge doce solicitudes por ID y puede omitir una publicación nueva de una solicitud antigua. Falta orden temporal por evento. | Corregido en código; pendiente de despliegue |
| R05 | P2 | A14 | Los conteos operativos excluyen eliminados; los ingresos pendientes todavía incluyen cotizaciones de borradores eliminados. Falta corregir ese cálculo. | Corregido en código; pendiente de despliegue |
| R06 | P2 | P8 | Directorio oculto en navegación y ruta normal; una variante del slug en mayúsculas elude el bloqueo si existe contenido publicado. Actualmente no hay una página de Directorio publicada en producción. | Corregido en código; pendiente de despliegue |
| R07 | P3 | API adicional; no suma a las 73 filas | Los formularios visibles y meta.fecha_registro rechazan fechas futuras; el campo genérico date de creación acepta una fecha futura en el caso reproducido. Falta definir su significado y aplicar validación consistente. | Corregido en código; pendiente de despliegue |
| D01 | Documental | Informe de cierre anterior | Hay afirmaciones de cierre y textos de S19/S24 desactualizados. Este inventario y la nueva revisión prevalecen; falta actualizar el documento histórico. | Actualizado localmente; pendiente de publicar |

Los siete hallazgos técnicos representan causas concretas; no son siete observaciones parciales adicionales. R01/R02 corresponden a S34, R03/R04 a S35/S36, R05 a A14 y R06 a P8. R07 es adicional.

## Datos reservados para carga manual

Los campos existen y tienen sus validaciones. Se dejaron vacíos por la instrucción del usuario: «Solo pon los campos para añadirlos manualmente». Estado de los valores según la lectura de producción del 12 de octubre.

| Campo o archivo | Implementación del campo | Carga del dato | Estado |
| --- | --- | --- | --- |
| Razón social del operador | 100 % | 0 % | Vacío; carga manual pendiente |
| RIF del operador | 100 % | 0 % | Vacío; carga manual pendiente |
| Dirección del operador | 100 % | 0 % | Vacío; carga manual pendiente |
| Correo de atención | 100 % | 0 % | Vacío; carga manual pendiente |
| WhatsApp de atención | 100 % | 0 % | Vacío; carga manual pendiente |
| Instagram | 100 % | 0 % | Vacío; carga manual pendiente |
| Facebook | 100 % | 0 % | Vacío; carga manual pendiente |
| X | 100 % | 0 % | Vacío; carga manual pendiente |
| LinkedIn | 100 % | 0 % | Vacío; carga manual pendiente |
| QR oficial bancario del medio Pago Móvil BNC | 100 %: carga, sustitución y retiro disponibles | 0 % | Sin archivo configurado |

**Carga manual: 0 de 9 campos institucionales/contacto/redes completados; QR oficial: 0 de 1.** Esto mide carga de datos, no avance de programación.

## Configuraciones y contenido que no son defectos de implementación

- Mantenimiento activado y registro público desactivado: decisiones vigentes de configuración, según la última lectura funcional; no son fallos de los interruptores.
- No hay una edición publicada vigente; existen borradores y ediciones retiradas. La falta de una publicación editorial real no implica que falte el código de publicación.
- Los CVE largos históricos se conservan para mantener enlaces anteriores. El formato DMV-XXXXXXXX se aplica a nuevas ediciones.
- El alias www carece de DNS. Si se requiere ofrecerlo, quedan la creación del CNAME y su habilitación en el servidor. El dominio canónico es diariomercantil.com.
- Facturación futura no está implementada ni se cuenta como entrega cerrada: en el alcance revisado se retiraron las descargas de orden indicadas.

## Validación disponible y límites

- Auditoría funcional del 12 de octubre: PDF v826 de tres páginas y v1026 de quince páginas; lectura de producción; pruebas aisladas de API y navegador; comprobación del código.
- Pantalla de mantenimiento real: nueve rutas; seis API bloqueadas con HTTP 503 y Cache-Control: no-store; comprobación móvil y escritorio.
- Suite existente: 112 pruebas PHP con 630 aserciones; 49 pruebas de frontend en 16 archivos; TypeScript sin errores. Los nuevos escenarios R01–R07 no están resueltos por el hecho de que esa suite pase.
- Comprobación de hoy: revisión local, GitHub main y checkout del servidor coinciden; backend y frontend running/healthy. No se repitió toda la auditoría funcional ni se modificaron datos de clientes.
- Esta consulta creó un inventario documental. No aplicó correcciones de código, migraciones ni un despliegue nuevo.

## Fuentes y trazabilidad

- [Revisión punto por punto con evidencias y casos reproducibles](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/docs/REVISION_PUNTO_POR_PUNTO_V1026_2026-10-12.md>).
- [Plan comparado de la versión 2](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/PLAN_ACCION_COMPARADO_V2_2026-10-12.md>).
- [Alcance de mantenimiento programado](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/docs/MANTENIMIENTO_PROGRAMADO_2026-10-12.md>).
- PDFs originales suministrados por el usuario: Revisión-Sistema-Diario-Mercantil-v826.pdf y Observaciones finales - Sistema Diario Mercantil de Venezuela - v1026.pdf.
- Matriz estructurada y diagnósticos locales: artifacts/audit2-20261012. Se conservan como evidencia local excluida de Git.
