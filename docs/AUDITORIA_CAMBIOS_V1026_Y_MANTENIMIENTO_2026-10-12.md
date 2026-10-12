# Auditoría de aplicación - Revisión v826, v1026 y mantenimiento programado

> Auditoría previa al cierre. Sus hallazgos describen el estado anterior a la corrección. La resolución y las verificaciones posteriores se documentan en CIERRE_V1026_2026-10-12.md.

Fecha: 12 de octubre de 2026. Corte de la revisión: 11:46 de Caracas (15:46 UTC).
Estado: auditoría terminada. **No corresponde declarar que todos los cambios están completamente resueltos.**

## Resultado

| Alcance | Aplicado | Parcial | Pendiente | Total |
|---|---:|---:|---:|---:|
| Observaciones numeradas del PDF final v1026, incluyendo S0 | 65 | 7 | 1 | 73 |
| Requisitos/afirmaciones de la guía de mantenimiento y últimos cambios visuales | 20 | 3 | 0 | 23 |

Los siete parciales de v1026 son **S5, S12, S34, A13, P10, P11 y P18**. El pendiente es **P9**. Varias filas dependen del mismo contenido ausente; los números cuentan observaciones, no defectos independientes.

**Aplicado** significa que el ajuste está en el código desplegado y tiene la evidencia indicada de inspección o pruebas. No significa que todos los recorridos hayan podido repetirse con datos reales publicados en producción. **Parcial** identifica una función disponible con un defecto reproducible, un alcance incompleto o configuración/contenido que todavía falta. **Pendiente** identifica el entregable de contenido que no está publicado.

La prioridad editorial **CVE, enlace y QR desde el borrador** está aplicada y probada con datos de prueba. El nuevo formato es DMV- seguido de ocho alfanuméricos mayúsculos. Los códigos antiguos conservan su identidad.

## Fuentes y límites

- F1: Observaciones finales v1026, 15 páginas. Es la referencia más reciente para las 73 observaciones.
- F2: Revisión v826, 3 páginas, con anotaciones gráficas de los tres pasos.
- Plan comparado v2 y los informes locales del 12 de octubre.
- Código local y servidor, ambos en Git `5c43601d09567442b1aa540f43c5ca29be8b46a3`.
- Estado actual de MySQL, migraciones, archivos de respaldo, configuración efectiva de Nginx y respuestas HTTP públicas.
- Pruebas automatizadas y reproducciones en Chromium con API de prueba interceptada.

Los documentos adjuntos se utilizaron como criterios de comparación. Sus datos bancarios, precios, fechas y nombres de ejemplo no se trataron como configuración real. La referencia de **cuatro dígitos** de F2 fue sustituida por **seis** en F1; esa diferencia está resuelta y no es un incumplimiento.

Esta auditoría realizó lecturas en producción. No cambió cuentas, contraseñas, textos publicados, pagos, ediciones, precios, mantenimiento ni servicios de correo. La reproducción del formulario usó una API local simulada; su única llamada PUT fue interceptada y no llegó al servidor.

## Despliegue real comprobado

| Comprobación | Resultado |
|---|---|
| Git local y Git del servidor | `5c43601` |
| Imagen frontend | `5c43601`; diseño final con logo grande y centrado |
| Imagen backend | `2eb508c`; los commits posteriores modifican solo frontend |
| Correspondencia del backend | SHA-256 idénticos para EditionController, LegalController, AuthController, UserController, SystemController y MaintenanceService |
| Base de datos / backend / frontend | Saludables |
| Worker de correo | Mismo contenedor anterior; sin reconstrucción/reinicio por estos despliegues |
| Migración términos | `20261012_000_terms_acceptance` aplicada a las 14:37:36 UTC |
| Migración mantenimiento | `20261012_010_scheduled_maintenance` aplicada a las 14:37:36 UTC |
| Mantenimiento | Activado; consulta anónima indica unlocked=false y duración 14400 segundos |
| Registro de cuentas | Desactivado por configuración: registration_enabled=0 |
| Ediciones vigentes | Una edición en Borrador, ID 9, creada antes de la actualización |
| Ediciones publicadas vigentes | Cero; las publicaciones antiguas de la tabla editions están retiradas |
| Respaldo de base de datos | Presente; gzip -t aprobado |
| Respaldo de almacenamiento | Presente; tar -tzf aprobado |

El CVE largo del borrador existente ID 9 no prueba que el generador nuevo falle: pertenece al formato anterior y se conservó. No se creó una nueva edición en producción para esta auditoría.

No se pudo repetir el visor público/búsqueda con una **edición real publicada vigente**, porque actualmente no hay ninguna. Esos recorridos sí cuentan con pruebas locales de publicación, identidad y búsqueda; su aceptación final con material real queda por ejecutar al publicar una edición.

Respaldo verificado: `/docker/backups/diario-mercantil/v1026-20261012/`, con `database.sql.gz` y `storage.tar.gz`.

## Hallazgos que impiden cerrar el trabajo

### H01 - Contenido público y textos legales ausentes

La consulta real de pages devuelve únicamente `nueva-pgina`, publicada, con cero bloques y cero caracteres de contenido. No existen las páginas canónicas:

- `sobre-el-diario`
- `como-publicar`
- `preguntas-frecuentes`
- `terminos-y-condiciones`
- `politicas-de-privacidad`

Los editores y enlaces están programados, pero no existe el contenido que deben mostrar. Con el mantenimiento activo las rutas HTTP están bloqueadas; al autorizar el acceso, la consulta pública de esos slugs no encontrará página. Esta última consecuencia se deduce de la consulta de producción y de PagesController; no se declara que se haya desactivado mantenimiento para obtenerla.

El registro está suspendido expresamente. Además, aun si se activase, seguiría sin poder completarse mientras falten términos publicados con una versión aceptable. No corresponde cargar textos jurídicos de prueba ni activar registro como parte de una auditoría.

Afecta: **A13, P9 y P18**. A10/A11/A12 sí tienen las herramientas de edición; eso no equivale a tener los textos publicados.

### H02 - El límite de mantenimiento no usa la IP real del visitante

MaintenanceController entrega `REMOTE_ADDR` a MaintenanceService. La configuración efectiva de Nginx establece `REMOTE_ADDR = $remote_addr` y no contiene configuración real_ip. Los accesos observados, desde navegador externo y desde curl del servidor, figuran con la dirección del proxy `172.30.0.1`.

La regla de cinco intentos y HTTP 429 existe y pasa las pruebas unitarias. En este despliegue, sin embargo, distintos visitantes comparten la misma clave de límite; cinco fallos de uno pueden impedir la entrada de otros durante la ventana. Por eso la afirmación **“por IP”** no está completamente satisfecha en producción.

Corrección necesaria: recuperar la IP real desde la cadena de proxies **confiables**, sin aceptar cabeceras falsificables de cualquier origen, y verificar independencia con dos clientes.

### H03 - Consorcio queda sin actos y desaparece al reabrir

Documento ofrece `value="Consorcio"`, mientras la búsqueda del catálogo compara una clave en mayúsculas contra el valor seleccionado. normalizeLegalMeta también convierte el valor guardado en `CONSORCIO`, que no coincide con la opción.

Reproducción actual:

1. Compañía Anónima ofrece 27 opciones en el selector de acto, incluyendo el placeholder.
2. Al seleccionar Consorcio queda una sola opción: el placeholder; no aparecen actos.
3. Al reabrir una solicitud con `tipo_sociedad=CONSORCIO`, el valor visible de sociedad queda vacío aunque el dato permanece guardado.

Afecta directamente **S34** y al uso de Consorcio en solicitudes nuevas. La conservación de los demás metadatos está implementada; este caso no quedó cubierto por las pruebas previas.

Corrección necesaria: uniformar el valor de Consorcio y agregar una regresión que seleccione la sociedad y reabra una solicitud con ese valor.

### H04 - Número de trámite solo cambia de etiqueta

El campo dice **Número de planilla (PUB) o número de trámite**, pero conserva la máscara y validación exclusiva `000.0000.0.000000`, tanto en UI como en API.

El PDF no define la nomenclatura alternativa. La etiqueta está aplicada; el soporte real de un número de trámite diferente está pendiente de definición. No debe considerarse terminado **S5**, ni sustituirse la validación por un campo sin reglas.

### H05 - Uniformidad tipográfica incompleta

En el paso 3 de Documento, los estilos computados por Chromium muestran:

| Elemento | Tamaño |
|---|---:|
| Nombre / Razón Social | 12 px |
| Folios | 16 px |
| Precio por folio | 16 px |

La observación S12 pide armonizar los datos del solicitante y el resumen tomando Folios/Precio por folio como referencia. Sigue existiendo la diferencia, además de leyendas auxiliares de 10 px. La jerarquía del total puede conservarse; las descripciones equivalentes deben uniformarse.

### H06 - Convocatoria conserva referencias legales sin enlace y presentación anterior

En Convocatoria, la aceptación de términos es texto dentro de un span, con **cero enlaces** a la página legal. Esto contradice A13, que se aplica a cualquier referencia del sistema.

También conserva **Tipo de operación**, **Resumen de la Orden**, el texto de aceptación **REPORTAR Y PUBLICAR** y dos renglones **Precio USD**. El botón final sí dice Reportar solicitud. Son diferencias de uniformidad respecto de Documento; las observaciones de los tres pasos fueron modeladas principalmente para Documento, por lo que estos detalles adicionales no se cuentan automáticamente como nuevos incumplimientos de S13/S19/S24.

Corrección necesaria: completar el vínculo legal y revisar el mismo catálogo de etiquetas/orden de campos en Convocatoria.

### H07 - Falta el QR bancario real

Producción tiene un medio pago_movil del Banco Nacional de Crédito, pero **sin qr_file_id**. El panel puede guardar y mostrar QR oficiales; el archivo real no está cargado y el solicitante verá la advertencia correspondiente.

Es un pendiente de configuración de F2 y de la presentación bancaria, no una razón para fabricar un QR con datos de ejemplo. Se necesita el QR oficial del medio bancario de administración.

### H08 - Banners y portada final aún no configurados

Ninguno de los siete espacios de banner está configurado en la base actual: cabecera, principal, lateral, popup e historial 1-3. El módulo y los componentes existen y cuentan con pruebas previas usando datos de prueba.

Todavía faltan material real, asignación a los espacios y la revisión de la composición final con los textos institucionales. **P10 y P11** son parciales. El propio PDF permite tratarlos después de los ajustes prioritarios.

### H09 - Dos alcances del bloqueo de mantenimiento incompletos

**Página HTML independiente.** Una solicitud anónima a `/docs/index.html` devuelve HTTP 200 y el HTML de Swagger UI; esa página se sirve directamente desde Nginx y no pasa por MaintenanceGate. El documento OpenAPI de su API continúa protegido: este hallazgo no demuestra acceso a datos privados, pero sí una página que queda fuera de la pantalla de mantenimiento.

**Reacción inmediata a HTTP 503.** fetchAuth emite el evento que oculta la pantalla; listPublicEditions y otras consultas usan fetch directo. Reproducción: la búsqueda pública recibió HTTP 503 maintenance_required, pero el encabezado Ediciones del Diario seguía visible medio segundo después. La pantalla de bloqueo apareció al avanzar a la siguiente consulta de estado de treinta segundos.

Corrección necesaria: incluir el HTML independiente en el mismo control de acceso y unificar la detección de mantenimiento en las consultas. Los recursos necesarios para pintar la pantalla, como el logo y CSS/JS, deben seguir disponibles.

### H10 - El informe inicial de implementación quedó desactualizado

IMPLEMENTACION_V1026_2026-10-12.md todavía indica **“no desplegados en producción”**, describe pruebas 99/41 y presenta S12/S34 como aplicados sin estas excepciones. Era un informe de la etapa local, anterior al despliegue posterior.

La ausencia de actualización documental no significa ausencia de código desplegado. Este informe reemplaza esa afirmación de estado y registra lo encontrado después del despliegue. Los resultados antiguos se conservan como evidencia histórica, no como una auditoría actual completa.

### H11 - Diferencias de alcance que deben quedar claras

- **Inicio del solicitante:** tiene ruta, resumen y avisos independientes; el login y el autorregistro siguen redirigiendo al historial. El PDF pide separar vistas, lo cual está hecho. Hacer de Inicio la primera pantalla es una mejora complementaria coherente con el diseño, no un requisito nuevo declarado incumplido.
- **Inactividad:** el cierre por cuatro horas está en el navegador. La sesión ordinaria del backend conserva expiración de siete días y no verifica inactividad de cuatro horas por sí sola. El permiso de mantenimiento sí caduca a las cuatro horas en el servidor, sin renovación silenciosa.
- **Fecha de edición:** se conserva la fecha inicial de Caracas y su edición manual. No hay una regla alternativa suficientemente definida en los PDF para imponer otra automatización.
- **Históricos:** las referencias de pago antiguas y CVE anteriores se conservan. La nueva referencia de seis y el formato DMV se aplican a nuevos registros.

## Matriz de las 73 observaciones del PDF final

Las páginas corresponden a F1. Las referencias Cxx se resuelven en el índice de evidencia.

### Solicitante: S0-S38

| ID | Observación | F1 página | Estado | Evidencia | Resultado concreto |
|---|---|---|---|---|---|
| S0 | Logo superior | 1 | Aplicado | C01 | Logo SVG en Topbar; fecha institucional en Caracas. |
| S1 | Título principal destacado | 1 | Aplicado | C02:777 | Encabezado completo en mayúsculas dentro del fajín vinotinto. |
| S2 | Título/texto del paso 1 | 1 | Aplicado | C02:786 | Título y orientación del paso 1 coinciden con el documento final. |
| S3 | Etiquetas visibles | 2 | Aplicado | C02:797 | Etiquetas visibles y asociadas para sociedad, acto, Estado y oficina. |
| S4 | Letra uniforme | 2 | Aplicado | C02:890 | Letra separada, tamaño text-sm y columna propia. |
| S5 | Planilla o trámite | 2 | Parcial | C02:935; H04 | Etiqueta nueva, pero el control y la API solo admiten máscara PUB; formato alternativo de trámite pendiente. |
| S6 | Distribución compacta | 2 | Aplicado | C02:890 | Grupos Tomo/Letra/Número/Año y Expediente/Fecha/Planilla; distribución adaptable. |
| S7 | Título/texto paso 2 | 2 | Aplicado | C02:973 | Adjuntar el documento digitalizado y orientación completa. |
| S8 | Advertencia de legibilidad | 2-3 | Aplicado | C02:978 | Advertencia completa sobre legibilidad, cortes, sellos y firmas. |
| S9 | Quitar orden del paso 2 | 3 | Aplicado | C02:1107 | Botón de descarga de orden retirado del paso 2; quedan comentarios/código no invocado. |
| S10 | Vista previa efectiva | 3 | Aplicado | C03 | PDF.js muestra PDF real, páginas y zoom; tipos históricos de adjunto contemplados. |
| S11 | Título/texto paso 3 | 3 | Aplicado | C02:1155 | Reportar el pago de la publicación y orientación solicitada. |
| S12 | Tipografía resumen | 3 | Parcial | C02:1185; H05 | Uniformidad incompleta: etiqueta de nombre 12 px frente a Folios/Precio por folio 16 px, medido en navegador. |
| S13 | Resumen de la orden | 3 | Aplicado | C02:1177 | Resumen de la orden con orden en minúscula en Documento. |
| S14 | Descripción y costo | 3 | Aplicado | C02:1209 | Descripción y costo y párrafo descriptivo sin mayúsculas forzadas. |
| S15 | Razón social/datos sin corchetes | 4 | Aplicado | C02:1212 | Empresa en mayúsculas/negrita, datos sin corchetes, tipo de registrador entre paréntesis. |
| S16 | Título/texto bancario | 4 | Aplicado | C04:34 | Título y orientación bancaria actualizados. |
| S17 | Banco destino, teléfono, sin titular | 4 | Aplicado | C04:17 | Banco destino, Teléfono, RIF y Monto; Titular retirado de tarjeta y copia. |
| S18 | Información del pago realizado | 4 | Aplicado | C02:1267 | Información del pago realizado en Documento. |
| S19 | Sin tipo de operación | 4 | Aplicado | C02:1270 | Documento envía pago_movil fijo y no solicita tipo de operación. Convocatoria conserva campo redundante; véase H06. |
| S20 | Banco emisor vinotinto | 4-5 | Aplicado | C02:1282 | Desplegable de Banco emisor en vinotinto. |
| S21 | Orden de campos | 5 | Aplicado | C02:1260 | Documento organiza Banco emisor, Teléfono, Fecha y Referencia. |
| S22 | Operadora sin selección automática | 5 | Aplicado | C02:450 | Operadora inicial vacía; se restaura prefijo real de un pago existente. |
| S23 | Referencia de seis dígitos | 5 | Aplicado | C13; C07 | API y formularios exigen seis dígitos en reportes nuevos; pagos históricos conservados. |
| S24 | Reportar solicitud | 5 | Aplicado | C02:1376 | Documento usa Reportar solicitud; Convocatoria no fue uniformada completamente. |
| S25 | Elegir tipo desde Nueva publicación | 5 | Aplicado | C05:72 | Nueva publicación abre el modal Documento/Convocatoria. |
| S26 | Quitar orden de listado | 5 | Aplicado | C05 | Descarga de orden retirada del listado del solicitante. |
| S27 | Columna Edición | 6 | Aplicado | C05:141 | Edición aparece después de Fecha de publicación y usa el código oficial. |
| S28 | Tipo de pago legible | 6 | Aplicado | C06 | Detalle convierte pago_movil a Pago móvil. |
| S29 | Quitar orden del detalle | 6 | Aplicado | C06 | Descarga de orden retirada de la cabecera del detalle. |
| S30 | Ver en línea en listado | 6 | Aplicado | C05:189 | Ver en línea se muestra cuando la edición publicada tiene archivo disponible. |
| S31 | Dirección editable | 6 | Aplicado | C08:223; C14 | Dirección se carga, edita, persiste y puede limpiarse. |
| S32 | Nombre bloqueado | 6-7 | Aplicado | C08:214; C14 | Nombre bloqueado para solicitante en UI y servidor; pruebas HTTP de modificación. |
| S33 | Inicio separado y resumen | 7 | Aplicado | C09 | Inicio independiente, indicadores propios y avisos; login sigue entrando al historial, observación complementaria H11. |
| S34 | Rehidratar solicitud devuelta | 7 | Parcial | C07; C02:805; H03 | Adaptador corrige claves y mayúsculas, pero Consorcio no coincide con la opción del selector y aparece vacío al reabrir. |
| S35 | Título de notificación | 7 | Aplicado | C09 | Aviso ¡Publicación realizada! en Inicio. |
| S36 | Empresa en notificación | 8 | Aplicado | C09; C07 | Aviso identifica empresa en mayúsculas y enlaza al detalle. |
| S37 | Cotizador por PDF y manual | 8 | Aplicado | C10 | Cotizador manual o PDF; conteo en navegador sin crear solicitud ni subir documento. |
| S38 | Cotizador visual | 8 | Aplicado | C10 | Bloques diferenciados para folios, tarifa, subtotal y total estimado. |

### Administrador: A1-A14

| ID | Observación | F1 página | Estado | Evidencia | Resultado concreto |
|---|---|---|---|---|---|
| A1 | Recepción operativa | 9 | Aplicado | C13; C33 | Recepción de Documento/Convocatoria conservada; pruebas de autorización y solicitudes. |
| A2 | Sustituir rechazo por devolución | 9 | Aplicado | C15; C16 | Acciones correctivas llaman devolución a Borrador en lista, detalle y Lotus. |
| A3 | Motivo de devolución | 9 | Aplicado | C16; C13; C09 | Motivo obligatorio, auditoría y presentación al solicitante; regresión de conservación de datos/pago. |
| A4 | CVE DMV-XXXXXXXX | 10 | Aplicado | C11 | Nuevos CVE DMV- más ocho alfanuméricos mayúsculos; reintento de colisión. CVE anteriores preservados. |
| A5 | CVE/URL/QR al crear borrador | 10 | Aplicado | C12:651; C11 | CVE, enlace y QR de 1000 x 1000 disponibles en borrador sin PDF; identidad permanece al publicar. |
| A6 | Conservar edición y revisar fecha | 10 | Aplicado | C13; C11 | Composición, controles de PDF, publicación y fecha Caracas conservados. No se inventó otra automatización de fecha. |
| A7 | Configuración general operativa | 10 | Aplicado | C17; C19 | Configuración y persistencia conservadas; producción tarifa USD 3, convocatoria USD 50 e IVA 16%. |
| A8 | Medios de pago operativos | 10 | Aplicado | C04; C33 | CRUD de medios y carga de QR implementados. El único medio real no tiene QR cargado; pendiente de configuración H07. |
| A9 | Directorio pausado | 11 | Aplicado | C17; C18; C20 | Directorio pausado en menús/configuración y página canónica; datos conservados. |
| A10 | Gestión de preguntas/respuestas | 11 | Aplicado | C17:53; C18 | Editor pregunta/respuesta con crear/editar/eliminar y publicación CMS. Aún no hay FAQ real; contenido se registra en P9. |
| A11 | Términos completos editables | 11 | Aplicado | C17:54; C18 | Editor dedicado de términos íntegros implementado; texto real no cargado. |
| A12 | Privacidad editable aparte | 11 | Aplicado | C17:55; C18 | Editor de privacidad independiente implementado; texto real no cargado. |
| A13 | Referencias legales enlazadas | 11 | Parcial | C02:1351; C34:300; H01/H06 | Documento, registro y pie tienen vínculos; Convocatoria conserva texto sin enlace y las páginas legales faltan en producción. |
| A14 | Estadísticas excluyen eliminados | 11 | Aplicado | C19; C33 | Indicadores de publicaciones/ediciones/recientes filtran deleted_at; importes históricos conservados. |

### Vista pública, registro y login: P1-P20

| ID | Observación | F1 página | Estado | Evidencia | Resultado concreto |
|---|---|---|---|---|---|
| P1 | Unificar última edición/visor | 12 | Aplicado | C21 | Última edición y visor utilizan PublicEditionPanel y el mismo visor. |
| P2 | Número romano/arábigo en visor | 12 | Aplicado | C21 | Título y dato Número muestran código romano/arábigo completo. |
| P3 | CVE oculto público | 12 | Aplicado | C21; C22 | CVE oculto en metadatos, cabecera y listado; se conserva en búsqueda/URL. |
| P4 | Número oficial en listado | 12 | Aplicado | C22 | Número de edición usa code, no solo edition_no. |
| P5 | Razón social/acciones conservadas | 12 | Aplicado | C22; C13 | Razón social, estado y acciones preservados; integración usa ediciones sintéticas con PDF válido. |
| P6 | Búsqueda sin distinguir caja | 12-13 | Aplicado | C13; C33 | Búsqueda normaliza Unicode y contempla razón social en JSON. Prueba de mayúsculas/tildes en SQLite; sin muestra publicada vigente en producción. |
| P7 | Búsqueda CVE conservada | 13 | Aplicado | C13; C11 | Búsqueda incluye CVE nuevo y anterior; filtros y enlaces históricos se conservan. |
| P8 | Directorio público oculto | 13 | Aplicado | C20; C17 | Menús, tarjeta de Home y página canónica del Directorio ocultos/pausados. |
| P9 | Información vinculada | 13 | Pendiente | H01; C31 | Sobre el Diario, Cómo publicar y FAQ no existen en producción; única página publicada vacía. CMS/enlaces existen, contenido no desarrollado. |
| P10 | Revisión Promo Banner | 13 | Parcial | H08; C31 | Módulo y siete espacios probados con datos sintéticos; ninguno configurado con material real en producción. |
| P11 | Estructura final Home | 13 | Parcial | C20; H08 | Composición base preparada; definición final con banners y contenidos institucionales todavía pendiente. |
| P12 | Nombre/apellido mayúsculas | 14 | Aplicado | C23; C24 | Nombre se normaliza a mayúsculas en interfaz y API. |
| P13 | Prefijo/documento mismo renglón | 14 | Aplicado | C23 | Prefijo y número en una fila. |
| P14 | Prefijos por tipo de persona | 14 | Aplicado | C23; C24 | Natural V/E/P; jurídica V/J/G; combinación validada en API. |
| P15 | Operadora más siete dígitos | 14 | Aplicado | C23; C24 | Selector de operadora más siete dígitos y validación de teléfono completo. |
| P16 | Mínimo nueve caracteres | 14 | Aplicado | C23; C24; C33 | Política mínima de nueve en interfaz/backend; pruebas de límites. |
| P17 | Etiqueta de dirección | 14 | Aplicado | C23:299 | Dirección de habitación o domicilio fiscal. |
| P18 | Aceptación obligatoria registro | 15 | Parcial | C23:378; C25; H01 | Casilla/versionado/persistencia implementados; registro desactivado y términos inexistentes impiden usar el flujo completo en producción. |
| P19 | Etiqueta login | 15 | Aplicado | C26 | Login usa Nro. de documento de identidad. |
| P20 | Acceso administrativo discreto | 15 | Aplicado | C26 | Acceso administrativo debajo de Ingresar, antes del registro. |

## Comprobación complementaria del PDF previo v826

| Criterio F2 | Resultado actual |
|---|---|
| Logo, encabezado y guía de pasos | Aplicados con el activo original del sitio |
| Texto libre registral en mayúsculas | Razón social y registrador normalizados; excepción de Consorcio descrita en H03 |
| Tipos Titular/Suplente/Auxiliar y letras A-E | Conservados |
| Tomo/Número solo números, hasta tres dígitos | Controles y API conservan límites |
| Año hasta el año de Caracas | YearPicker usa editorialYear y el backend valida el año |
| Expediente tres dígitos-guion-hasta ocho | Máscara y validación disponibles |
| Planilla tres-cuatro-uno-hasta seis dígitos | Máscara PUB disponible; número de trámite alternativo sigue pendiente |
| Fechas registrales/de pago no futuras | Controles y servidor usan el día de Caracas |
| PDF, máximo 50 MB y conteo de folios | Implementados; vista previa con PDF.js |
| Eliminar + IVA y ocultar subtotal/IVA en Documento | Aplicado en los pasos indicados; cálculo interno conservado |
| Precio por folio equivalente a uno | Usa USD/folios y snapshot de tasa/importe al reabrir |
| Banco, RIF, teléfono, monto, QR y copia | Panel implementado; falta cargar el QR real (H07) |
| Referencia de cuatro dígitos | Sustituida correctamente por seis según F1; históricos conservados |
| Operadora expresamente seleccionada y siete dígitos | Implementado en nuevos reportes |
| Casilla, enlace y Reportar solicitud | Implementado en Documento; falta vínculo equivalente en Convocatoria |
| Quitar descarga de orden | Retirada de paso 2, listado y detalle de solicitante; servicios internos conservados |

## Matriz del documento de mantenimiento y del diseño final

| ID | Afirmación/requisito | Estado | Comprobación |
|---|---|---|---|
| M01 | Contraseña vigente de administrador o Lotus | Aplicado | password_verify sobre cuentas administrativas activas y superadmins; pruebas de ambas clases |
| M02 | Cuatro horas exactas, sin renovación silenciosa | Aplicado | DURATION=14400; solo grant crea expires_at; access y status no lo renuevan |
| M03 | Autenticación ordinaria y roles independientes | Aplicado | No se crea dm_session al abrir mantenimiento; las API conservan autorización por cuenta |
| M04 | Cerrar sesión y cambiar de cuenta conserva el permiso | Aplicado | Cookies distintas; prueba previa de producción y prueba de ambos roles |
| M05 | Switch en Dashboard y Lotus, guardado inmediato | Aplicado | MaintenanceControl en ambas configuraciones y controlador con CSRF |
| M06 | Activar concede cuatro horas al administrador que lo activa | Aplicado | toggle crea grant dentro de la transacción y configure establece cookie |
| M07 | Desactivar abre acceso; reactivar invalida permisos anteriores | Aplicado | Rotación de maintenance_generation y eliminación de sesiones; prueba de generaciones |
| M08 | Cambio de contraseña, suspensión, eliminación o pérdida de rol revoca | Aplicado | Cada acceso verifica existencia/estado/rol y huella del hash de la contraseña |
| M09 | Caducidad obliga nuevamente a validar contraseña | Aplicado | Backend compara expires_at contra tiempo actual; frontend tiene temporizador con tiempo restante |
| M10 | Pantalla para toda la web, incluidos login/Lotus/cliente | Parcial | Rutas React cubiertas; /docs/index.html devuelve HTML directo sin pantalla (H09) |
| M11 | API y documentos bloqueados con HTTP 503 | Aplicado | Lecturas anónimas reales a settings/auth/me/e/uploads reciben maintenance_required |
| M12 | Solo estado, desbloqueo y salud como excepciones de API | Aplicado | Lista explícita de métodos/rutas; preflight OPTIONS no devuelve contenido privado |
| M13 | Estado y bloqueo usan Cache-Control no-store | Aplicado | Cabeceras comprobadas por HTTP real |
| M14 | Cookie Secure/HttpOnly/Strict y token 256 bits, solo hash persistido | Aplicado | Cookie en controlador, random_bytes(32), SHA-256 en almacenamiento; regresiones |
| M15 | Cinco fallos por IP/15 minutos; sexto HTTP 429 | Parcial | Contador funciona, pero recibe la IP compartida del proxy en producción (H02) |
| M16 | Sin contraseña compartida nueva ni cambios de credenciales | Aplicado | Se usan hashes existentes; no hay clave nueva de mantenimiento |
| M17 | Comprobación cada 30 segundos/al volver y API oculta inmediatamente | Parcial | Polling correcto; reacción inmediata solo para fetchAuth, no para búsqueda pública (H09) |
| M18 | Cierre ordinario por inactividad de cuatro horas | Aplicado | App configura cuatro horas en navegador; alcance de backend aclarado en H11 |
| M19 | Migración y claves administradas solo por controlador específico | Aplicado | Dos tablas creadas; claves no presentes en SettingSchema genérico |
| M20 | 106 pruebas PHP/597 aserciones, 46 frontend y TypeScript | Aplicado | Reejecutadas con el mismo resultado; no bastan para excluir los defectos nuevos |
| M21 | Respaldo previo de BD y almacenamiento | Aplicado | Archivos presentes e integridad gzip/tar comprobada por SSH |
| M22 | Despliegue, migraciones, correo y volúmenes conservados | Aplicado | Versiones y servicios comprobados; últimas entregas reconstruyeron solo frontend |
| M23 | Logo grande centrado, sin llave y sin texto de cuatro horas | Aplicado | Navegador real: logo 400 px en escritorio, centrado; móvil 320/390 px sin desbordamiento |

Esta matriz comprueba las afirmaciones de la guía; no presenta veinte requisitos independientes del negocio. Algunos están relacionados entre sí.

## Pruebas y evidencias de ejecución de esta auditoría

| Prueba | Resultado |
|---|---|
| PHPUnit completo | 106 pruebas, 597 aserciones aprobadas |
| Vitest completo | 46 pruebas en 15 archivos aprobadas |
| TypeScript | Sin errores |
| GitHub CI de 5c43601 | Backend y frontend completados con éxito |
| Diseño actual en producción | Logo grande/centrado, sin iconos, sin texto eliminado, móviles 320/390 px correctos |
| Consorcio nuevo/reabierto | Defecto reproducido; opciones de acto insuficientes y sociedad visible vacía al reabrir |
| Tipografía del resumen | Diferencia 12/16 px reproducida |
| Convocatoria | Referencia legal sin enlace, tipo redundante y dos etiquetas Precio USD reproducidos |
| HTTP público durante mantenimiento | Estado 200; cuatro API de contenido/autenticación/archivo con 503 y no-store |
| HTML estático docs | HTTP 200 confirmado; no pasa por MaintenanceGate |
| Activación detectada tras búsqueda pública 503 | No oculta de inmediato; sí en la siguiente consulta periódica |
| Consultas de producción | Páginas ausentes/vacía, cero banners, QR bancario sin configurar y ninguna edición publicada vigente |

Los diagnósticos de PDF corrupto emitidos por PHPUnit pertenecen al caso negativo esperado; la suite termina aprobada. Las reproducciones que descubren H03/H05/H06/H09 no están incluidas en los 106/46 casos existentes.

## Orden de cierre recomendado

1. **Corregir defectos concretos:** Consorcio; recuperación segura de IP real; HTML docs y detección común de HTTP 503. Agregar regresiones de estos casos.
2. **Completar enlaces y textos:** vínculo en Convocatoria y publicar contenido real de términos/privacidad/FAQ/Sobre el Diario/Cómo publicar. Verificar versión y aceptación antes de decidir habilitar el registro.
3. **Completar la presentación:** tipografía del resumen, uniformidad de Convocatoria y carga del QR bancario oficial.
4. **Definir trámite alternativo:** obtener nomenclatura y ejemplos reales; implementar su validación sin debilitar la de PUB.
5. **Configurar banners y portada:** cargar material real, asignar espacios y revisar la composición final.
6. **Aceptar el recorrido editorial real:** crear una nueva edición, comprobar CVE DMV y QR antes del PDF, incorporar el PDF definitivo y verificar identidad/visor/búsqueda tras publicar. Esta auditoría no publicó ninguna edición.
7. **Actualizar informes históricos:** referenciarlos como previos al despliegue y trasladar el cierre de observaciones a una matriz actual, con estas excepciones.

## Índice de evidencia

| Ref. | Archivo/evidencia |
|---|---|
| C01 | [Topbar](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/Topbar.tsx:1>) |
| C02 | [Documento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:777>) |
| C03 | [Visor PDF protegido](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/ProtectedPdfViewer.tsx:1>) |
| C04 | [Panel bancario](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PaymentMethodsPanel.tsx:17>) |
| C05 | [Listado de solicitante](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx:141>) |
| C06 | [Detalle de solicitante](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/PublicacionDetalle.tsx:145>) |
| C07 | [Adaptador de metadatos](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/lib/legalMeta.ts:1>), [Pago conservado/idempotencia](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/lib/legalPayment.ts:1>) |
| C08 | [Perfil](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Perfil.tsx:204>) |
| C09 | [Inicio del solicitante](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Inicio.tsx:1>), [Rutas](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/App.tsx:184>) |
| C10 | [Cotizador compartido](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicationQuote.tsx:1>) |
| C11 | [Identidad de edición](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/EditionIdentityService.php:1>) |
| C12 | [QR desde borrador](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Ediciones.tsx:651>) |
| C13 | [API solicitudes](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:1>), [API ediciones/búsqueda](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php:173>) |
| C14 | [Protección de perfil](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/UserController.php:1>) |
| C15 | [Acciones administrativas](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Publicaciones.tsx:88>), [Detalle administrativo](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/PublicacionDetalle.tsx:90>), [Lotus publicaciones](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/SuperAdmin/Publications.tsx:94>) |
| C16 | [Estados/motivo/auditoría](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/LegalRequestStateMachine.php:1>) |
| C17 | [Configuración](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Configuracion.tsx:45>) |
| C18 | [Editor FAQ/legal](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/EditorialContentEditor.tsx:1>), [Páginas públicas](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PagesController.php:118>) |
| C19 | [Estadísticas y settings reales](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/SystemController.php:46>) |
| C20 | [Cabecera pública](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicHeader.tsx:76>), [Home](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Home.tsx:1>), [Sidebar](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/Sidebar.tsx:1>) |
| C21 | [Presentación pública compartida](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicEditionPanel.tsx:1>) |
| C22 | [Ediciones públicas](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EdicionesPublic.tsx:1>), [Edición en línea](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EditionPublic.tsx:1>) |
| C23 | [Registro](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx:377>), [Política frontend](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/utils/passwordPolicy.ts:1>) |
| C24 | [Auth/registro](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/AuthController.php:250>), [Política backend](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PasswordPolicy.php:1>) |
| C25 | [Aceptación versionada](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/TermsAcceptanceService.php:1>) |
| C26 | [Login](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Login.tsx:1>) |
| C27 | [Servicio mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/MaintenanceService.php:1>), [Controlador mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/MaintenanceController.php:1>) |
| C28 | [Pantalla/bloqueo frontend](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/MaintenanceGate.tsx:35>), [Detección API](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/lib/api.ts:54>) |
| C29 | [Nginx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/nginx.conf:1>), [HTML fuera del gate](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/public/docs/index.html:1>) |
| C30 | [Migración de términos](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/database/migrations/20261012_000_terms_acceptance.php:1>), [Migración de mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/database/migrations/20261012_010_scheduled_maintenance.php:1>) |
| C31 | [Estado leído en producción](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/production-state.json>) |
| C32 | [Resultado navegador formulario](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/browser-probe.json>), [Resultado reacción mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/maintenance-probe.json>), [HTTP real](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/public-http.json>) |
| C33 | [Integración HTTP](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/tests/AuthorizationIntegrationTest.php:693>), [Pruebas mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/tests/MaintenanceServiceTest.php:1>), [Pruebas gate frontend](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/MaintenanceGate.test.tsx:1>) |
| C34 | [Convocatoria](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Convocatoria.tsx:245>) |

### Capturas reproducibles

- [Consorcio sin actos](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/consorcio-new.png>)
- [Consorcio vacío al reabrir](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/consorcio-restored.png>)
- [Tipografía del resumen](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/summary-fonts.png>)
- [Convocatoria pendiente de uniformidad](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/convocatoria.png>)
- [Vista pública tras HTTP 503](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/audit-20261012/maintenance-public-503.png>)
- [Diseño real de mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/maintenance/redesign-production-card.png>)

### Documentos de referencia

- [Plan comparado v2](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/PLAN_ACCION_COMPARADO_V2_2026-10-12.md>)
- [Informe inicial de implementación](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/docs/IMPLEMENTACION_V1026_2026-10-12.md>)
- [Guía de mantenimiento](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/docs/MANTENIMIENTO_PROGRAMADO_2026-10-12.md>)
- [F1 - Observaciones finales](<C:/Users/merch/Downloads/Observaciones finales - Sistema Diario Mercantil de Venezuela - v1026.pdf>)
- [F2 - Modelo anotado previo](<C:/Users/merch/Downloads/Revisión-Sistema-Diario-Mercantil-v826.pdf>)
