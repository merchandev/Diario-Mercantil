# Implementación de la revisión v1026 - Versión 2

Fecha: 12 de octubre de 2026.\\
Estado del informe inicial: validado localmente. Este informe es histórico; el estado vigente y el despliegue se documentan en [Cierre v1026](CIERRE_V1026_2026-10-12.md).

## Resultado

Se implementaron los ajustes de código de la versión 2 sobre el proyecto existente, preservando los cambios previos del árbol de trabajo. La prioridad editorial está resuelta: el borrador reserva un CVE DMV-XXXXXXXX y muestra inmediatamente enlace estable y QR descargable de 1000 x 1000 píxeles. El PDF continúa privado hasta publicar, y los controles de integridad/publicación permanecen activos.

El plan de referencia es [Plan comparado v2](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/PLAN_ACCION_COMPARADO_V2_2026-10-12.md>). La matriz inferior distingue aplicación de código, conservación y contenido pendiente. La configuración editorial, las correcciones posteriores y los datos reservados para carga manual se detallan en el informe de cierre.

## Cambios aplicados

- CVE nuevo, unicidad y reintento específico ante colisión; códigos y enlaces históricos conservados.
- QR/CVE/enlace disponibles en borrador y estables después de cargar/publicar el PDF.
- Adaptador de metadatos canónicos/históricos y valores compatibles con catálogos.
- Devolución con motivo obligatorio, estado Borrador, visualización al solicitante y auditoría del estado/motivo.
- Referencia de seis dígitos, operadora elegida expresamente y fechas de Caracas; conservación de referencias históricas y reenvío sin nuevo pago cuando sigue siendo el mismo.
- Ajustes completos de textos, etiquetas, distribución, resumen, QR bancario y botones de los tres pasos.
- Vista previa PDF con PDF.js, cambio de página y zoom, compartiendo worker con el cotizador.
- Perfil con Dirección; nombre protegido para solicitante también en API.
- Inicio del solicitante separado, indicadores calculados por usuario en servidor, banners y avisos por razón social.
- Lista con número oficial de edición y Ver en línea; descarga de orden retirada en las vistas solicitadas.
- Estadísticas de registros vigentes corregidas en el controlador real; ingresos históricos conservados. El botón de actualización ya no promete borrar datos.
- Gestión específica de preguntas/respuestas y editores independientes de términos/privacidad sobre el CMS existente.
- Directorio pausado en navegación, Configuración y acceso público directo, sin eliminar sus datos.
- Presentación pública compartida para última edición/visor; nomenclatura oficial y CVE oculto en las zonas indicadas.
- Búsqueda insensible a caja y extracción de razón social desde JSON; prueba con tildes en SQLite.
- Registro con prefijos por tipo de persona, nombre en mayúsculas, teléfono estructurado, mínimo de nueve caracteres y aceptación expresa de versión de términos.
- Login con etiqueta y orden de enlaces solicitados.
- Cotizador manual/PDF sin crear una solicitud ni subir el archivo al servidor.
- Las rutas alternativas de publicación reutilizan los formularios mantenidos, evitando mantener contratos de pago distintos.

## Validación ejecutada

| Comprobación | Resultado |
|---|---|
| TypeScript | Sin errores |
| Frontend Vitest | 41 pruebas aprobadas en 14 archivos |
| Backend PHPUnit | 99 pruebas aprobadas, 540 aserciones |
| Compilación Vite | Correcta; worker PDF emitido como recurso |
| Sintaxis PHP de archivos modificados/nuevos | Correcta |
| git diff --check | Sin errores de espacios |
| Pruebas HTTP | Base SQLite temporal; separada de bases del proyecto |
| Revisión en navegador | Chromium, anchuras 1440 y 390 píxeles |

La salida de pruebas incluye diagnósticos de un PDF deliberadamente corrupto en un caso negativo. El conjunto PHPUnit termina aprobado.

## Recorridos comprobados en navegador y API

1. Reabrir solicitud con claves canónicas: sociedad, acto, Estado, oficina, tipo de registrador y letra quedan seleccionados; expediente/planilla/fecha conservados.
2. Ver los tres pasos y el resumen desde datos históricos: dos folios, USD 10 y Bs. 100 según snapshot, aunque la tarifa configurada actual sea otra.
3. Reenviar solicitud con referencia histórica de cuatro dígitos: **cero llamadas nuevas a pagos**.
4. Vista previa del PDF: navegar de Página 1 de 2 a Página 2 de 2.
5. Cotizador: contar un PDF real de dos páginas en navegador.
6. Perfil: nombre deshabilitado; servidor rechaza una modificación directa del solicitante.
7. Borrador: QR visible, descarga PNG de 1000 x 1000 y CVE DMV-XXXXXXXX.
8. Cargar PDF final y publicar: CVE idéntico antes/después; la publicación no regeneró identidad.
9. Buscar “inversiones ávila”, “INVERSIONES ÁVILA” e “Inversiones Ávila”: mismos resultados. CVE completo también encuentra la edición.
10. Última edición/visor: número MMXXVI-0001 y CVE oculto en metadatos.
11. Crear pregunta/respuesta desde Configuración y comprobar reflejo público.
12. Registro: opciones natural V/E/P, jurídica V/J/G; casilla habilitada cuando hay términos publicados.
13. Banners: guardar los siete espacios, leerlos públicamente, cargar imagen sin sesión, mostrar cuatro espacios de portada y retirar configuración.

Se usaron cuentas, textos, PDF y banners sintéticos exclusivamente en la base temporal. No se publicaron documentos reales ni se cargaron políticas de prueba en las bases del proyecto. No se verificó un VPS ni MySQL en ejecución: Docker no estaba iniciado.

## Nueva migración y preparación de despliegue

[20261012_000_terms_acceptance.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/database/migrations/20261012_000_terms_acceptance.php>) crea user_legal_acceptances para conservar usuario, página de términos, hash de versión, texto aceptado y fecha. No rellena aceptaciones de usuarios antiguos ni inventa consentimiento retroactivo.

Antes de desplegar los cambios:

1. Respaldar base de datos y almacenamiento según el procedimiento existente.
2. Aplicar la nueva migración con el migrador canónico de MySQL: php bin/migrate.php desde backend.
3. Publicar el texto definitivo de términos en /p/terminos-y-condiciones y privacidad en /p/politicas-de-privacidad, usando Configuración.
4. Verificar el estado previo de registration_enabled. Este trabajo no lo activa automáticamente.
5. Revisar versión y consultas en MySQL y repetir los recorridos prioritarios en el entorno de despliegue.

El registro exige términos publicados con contenido no vacío y aceptación de su versión vigente. Si el responsable cambia el texto entre consulta y envío, se solicita volver a consultarlo. Los términos y la aceptación se validan de nuevo en la transacción de registro.

No se modificaron migraciones ya aplicadas, volúmenes, contraseñas existentes, credenciales SMTP ni servicios de correo. Los importes históricos permanecen almacenados.

## Definiciones y contenido que siguen pendientes

- Texto institucional definitivo para Sobre el Diario/Cómo publicar y revisión editorial de FAQ.
- Texto definitivo de términos/privacidad. Sus editores y páginas están preparados; no se inventó contenido legal.
- Formato alternativo del “número de trámite”: se mantuvo la máscara PUB existente porque F1 no define otra.
- Las ediciones antiguas conservan su CVE impreso y enlaces. El formato DMV nuevo se aplica a nuevas ediciones.
- Se conservó fecha predeterminada en Caracas y edición manual; F1 no define otra regla de automatización.

## Evidencias visuales

- [Borrador con CVE y QR](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/borrador-qr.png>)
- [Formulario y pago en escritorio](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/pago-desktop.png>)
- [Formulario en móvil](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/documento-mobile.png>)
- [Registro en móvil](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/registro-mobile.png>)
- [Cotizador por PDF](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/cotizador-mobile.png>)
- [Gestión de preguntas](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/faq-admin.png>)
- [Edición pública](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/artifacts/v1026/edicion-publica.png>)

Las capturas corresponden al entorno temporal de prueba, no a producción.

## Matriz individual de implementación

“Aplicado” describe cambios de código. “Conservado” indica funcionalidad existente comprobada o cubierta por regresiones. “Gestión preparada” requiere el contenido/definición indicado. La evidencia de ejecución está descrita arriba; esta tabla no sustituye la aceptación en producción.

| ID | Observación | Estado | Implementación/evidencia |
|---|---|---|---|
| S0 | Logo superior | Aplicado | Topbar: logo existente y fecha Caracas. |
| S1 | Título principal destacado | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S2 | Título/texto del paso 1 | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S3 | Etiquetas visibles | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S4 | Letra uniforme | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S5 | Planilla o trámite | Etiqueta aplicada; formato alternativo pendiente | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S6 | Distribución compacta | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S7 | Título/texto paso 2 | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S8 | Advertencia de legibilidad | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S9 | Quitar orden del paso 2 | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S10 | Vista previa efectiva | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S11 | Título/texto paso 3 | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S12 | Tipografía resumen | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S13 | Resumen de la orden | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S14 | Descripción y costo | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S15 | Razón social/datos sin corchetes | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S16 | Título/texto bancario | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S17 | Banco destino, teléfono, sin titular | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S18 | Información del pago realizado | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S19 | Sin tipo de operación | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S20 | Banco emisor vinotinto | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S21 | Orden de campos | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S22 | Operadora sin selección automática | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S23 | Referencia de seis dígitos | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S24 | Reportar solicitud | Aplicado | Documento: textos, etiquetas, distribución y captura; PHP valida pago/fecha. Panel bancario conserva QR oficial. |
| S25 | Elegir tipo desde Nueva publicación | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S26 | Quitar orden de listado | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S27 | Columna Edición | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S28 | Tipo de pago legible | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S29 | Quitar orden del detalle | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S30 | Ver en línea en listado | Aplicado | Historial/Detalle: modal compartido, edición, acciones, etiqueta de pago y enlace. |
| S31 | Dirección editable | Aplicado | Perfil/UserController: dirección y bloqueo por rol; integración HTTP. |
| S32 | Nombre bloqueado | Aplicado | Perfil/UserController: dirección y bloqueo por rol; integración HTTP. |
| S33 | Inicio separado y resumen | Aplicado | Inicio/summary: indicadores propios, bienvenida, banners y aviso por empresa. |
| S34 | Rehidratar solicitud devuelta | Aplicado | legalMeta: aliases y caja; pruebas y reapertura real. |
| S35 | Título de notificación | Aplicado | Inicio/summary: indicadores propios, bienvenida, banners y aviso por empresa. |
| S36 | Empresa en notificación | Aplicado | Inicio/summary: indicadores propios, bienvenida, banners y aviso por empresa. |
| S37 | Cotizador por PDF y manual | Aplicado | PublicationQuote/publicationPdf: manual y PDF; conteo real de dos folios. |
| S38 | Cotizador visual | Aplicado | PublicationQuote/publicationPdf: manual y PDF; conteo real de dos folios. |
| A1 | Recepción operativa | Conservado y verificado localmente | LegalController/StateMachine y administración: motivo, devolución y auditoría; integración HTTP. |
| A2 | Sustituir rechazo por devolución | Aplicado | LegalController/StateMachine y administración: motivo, devolución y auditoría; integración HTTP. |
| A3 | Motivo de devolución | Aplicado | LegalController/StateMachine y administración: motivo, devolución y auditoría; integración HTTP. |
| A4 | CVE DMV-XXXXXXXX | Aplicado | EditionIdentityService/Ediciones: formato, reintento, QR y publicación estable; regresiones y navegador. |
| A5 | CVE/URL/QR al crear borrador | Aplicado | EditionIdentityService/Ediciones: formato, reintento, QR y publicación estable; regresiones y navegador. |
| A6 | Conservar edición y revisar fecha | Conservado y verificado localmente | EditionIdentityService/Ediciones: formato, reintento, QR y publicación estable; regresiones y navegador. |
| A7 | Configuración general operativa | Conservado y verificado localmente | Configuración/Medios de pago existentes conservados; persistencia y QR oficial. |
| A8 | Medios de pago operativos | Conservado y verificado localmente | Configuración/Medios de pago existentes conservados; persistencia y QR oficial. |
| A9 | Directorio pausado | Aplicado | Configuración inicia en General; Directorio sin acceso en menú y página pública. |
| A10 | Gestión de preguntas/respuestas | Aplicado | EditorialContentEditor/PagesController: CMS único, FAQ y textos legales separados; hipervínculos. |
| A11 | Términos completos editables | Editor aplicado; texto definitivo pendiente | EditorialContentEditor/PagesController: CMS único, FAQ y textos legales separados; hipervínculos. |
| A12 | Privacidad editable aparte | Editor aplicado; texto definitivo pendiente | EditorialContentEditor/PagesController: CMS único, FAQ y textos legales separados; hipervínculos. |
| A13 | Referencias legales enlazadas | Aplicado | EditorialContentEditor/PagesController: CMS único, FAQ y textos legales separados; hipervínculos. |
| A14 | Estadísticas excluyen eliminados | Aplicado | SystemController y PanelHome: consultas activas corregidas y actualización; prueba de eliminación lógica. |
| P1 | Unificar última edición/visor | Aplicado | PublicEditionPanel compartido, EdicionesPublic y visor; número oficial y CVE oculto. |
| P2 | Número romano/arábigo en visor | Aplicado | PublicEditionPanel compartido, EdicionesPublic y visor; número oficial y CVE oculto. |
| P3 | CVE oculto público | Aplicado | PublicEditionPanel compartido, EdicionesPublic y visor; número oficial y CVE oculto. |
| P4 | Número oficial en listado | Aplicado | PublicEditionPanel compartido, EdicionesPublic y visor; número oficial y CVE oculto. |
| P5 | Razón social/acciones conservadas | Conservado y verificado localmente | PublicEditionPanel compartido, EdicionesPublic y visor; número oficial y CVE oculto. |
| P6 | Búsqueda sin distinguir caja | Aplicado | EditionController/DM_UPPER/JSON: búsqueda Unicode y CVE; integración y API real SQLite. |
| P7 | Búsqueda CVE conservada | Conservado y verificado localmente | EditionController/DM_UPPER/JSON: búsqueda Unicode y CVE; integración y API real SQLite. |
| P8 | Directorio público oculto | Aplicado | Menú estático/dinámico, Home y publicGet: Directorio pausado. |
| P9 | Información vinculada | CMS y enlaces listos; contenido final pendiente | Home/CMS/Promo existentes: accesos y composición; siete claves de banners probadas. |
| P10 | Revisión Promo Banner | Aplicado | Home/CMS/Promo existentes: accesos y composición; siete claves de banners probadas. |
| P11 | Estructura final Home | Aplicado | Home/CMS/Promo existentes: accesos y composición; siete claves de banners probadas. |
| P12 | Nombre/apellido mayúsculas | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P13 | Prefijo/documento mismo renglón | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P14 | Prefijos por tipo de persona | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P15 | Operadora más siete dígitos | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P16 | Mínimo nueve caracteres | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P17 | Etiqueta de dirección | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P18 | Aceptación obligatoria registro | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P19 | Etiqueta login | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
| P20 | Acceso administrativo discreto | Aplicado | Register/Login, PasswordPolicy y TermsAcceptanceService; integración HTTP y navegador. |
