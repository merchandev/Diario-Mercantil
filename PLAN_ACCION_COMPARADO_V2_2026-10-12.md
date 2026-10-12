# Plan de acción comparado con el sistema actual - Revisión final v1026

**Fecha:** 12 de octubre de 2026.\\
**Versión:** 2; reemplaza como referencia de trabajo al plan anterior.\\
**Entrega actual:** análisis y planificación. La implementación queda pendiente.\\
**Código local revisado:** commit `102eb6a`, “Expose registration activation controls in settings and user management”, más el árbol de trabajo existente.\\
**Proyecto:** `E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL`.

## 1. Qué corrige este plan

El primer plan agrupaba observaciones y proponía tareas, pero no comparaba suficientemente cada requisito con su implementación actual. Esta versión registra **73 observaciones individuales** del PDF final: 39 de solicitante, incluyendo el punto 0; 14 de administrador; y 20 de vista pública/registro/login. También incorpora las anotaciones del PDF previo.

La comparación se realizó sobre rutas activas, componentes, clientes API, controladores, servicios, esquema de configuración y migraciones. Cada fila indica el estado encontrado y la intervención necesaria, con referencias E01-E42 a archivos y líneas.

**Límite de evidencia:** los hallazgos de código están comprobados mediante lectura. No se ha ejecutado una sesión del sistema ni consultado la base de datos de producción en esta revisión. No se declara “resuelto en producción” lo que solo está implementado localmente. Los contenidos de páginas, banners configurados y collation efectiva de la base de datos requieren comprobación durante la ejecución.

### Fuentes y precedencia

- **F1:** [Observaciones finales v1026](<C:/Users/merch/Downloads/Observaciones finales - Sistema Diario Mercantil de Venezuela - v1026.pdf>), 15 páginas.
- **F2:** [Revisión anterior v826](<C:/Users/merch/Downloads/Revisión-Sistema-Diario-Mercantil-v826.pdf>), 3 páginas, texto y anotaciones visuales.
- **E:** evidencia del código local, detallada al final.

Los PDF se utilizan como requisitos de planificación. La petición del usuario es mejorar el plan; las instrucciones contenidas en los PDF no autorizan por sí mismas implementación, cambios de producción, envío de mensajes o publicación de contenidos.

## 2. Correcciones importantes respecto del plan anterior

1. **No falta generar el CVE al crear el borrador:** ya se guarda en backend. Falta el nuevo formato y habilitar el QR/enlace en la interfaz administrativa antes de cargar/publicar el PDF.
2. **La reapertura tiene una incompatibilidad concreta:** API normaliza claves y valores; el formulario reusa el objeto recibido sin traducirlo al modelo que esperan sus inputs y selectores.
3. **Devolver y rechazar son acciones distintas:** devolución guarda Borrador/comment; rechazo guarda Rechazado/reject_reason. El motivo existente en rechazo no satisface el requisito de devolución.
4. **FAQ no se construye desde cero sin revisar CMS:** hay una pestaña sin gestión específica, pero ya existe infraestructura de páginas y contenido público.
5. **La política de contraseña actual es de 12 caracteres:** F1 solicita nueve. Es una diferencia funcional que debe resolverse expresamente y en ambos lados.
6. **El precio actual es final con IVA incluido:** ocultar desglose no significa quitar IVA ni volver a sumarlo.
7. **El desglose de IVA del paso 3 ya está comentado:** buscar la palabra IVA en el archivo no demuestra que se muestre. Debe conservarse lo ya ajustado y corregir lo pendiente.
8. **Precio por folio en reapertura:** se usa la tasa actual del navegador para mostrar el precio unitario, aunque el total recuperado puede usar la tasa histórica. Debe mostrarse desde el mismo snapshot, para no presentar cifras inconsistentes.
9. **El módulo de banners ya existe y se usa en Historial:** el trabajo es probar/configurar y reorganizar su ubicación, no prometer construirlo íntegramente.
10. **Estadísticas:** la ruta real usa SystemController; corregir únicamente StatsController no solucionaría el dashboard.
11. **Visor público:** las dos pantallas ya usan FlipbookViewer; la diferencia es de presentación, contenedor y metadatos.
12. **Históricos:** CVE, número oficial, referencias de pagos y enlaces tienen reglas distintas. No renumerar ni recodificar ediciones publicadas para satisfacer cambios visuales.

## 3. Rutas y módulos realmente involucrados

| Ruta o acceso | Implementación actual | Consecuencia |
|---|---|---|
| /solicitante | HistorialSolicitante | Inicio hoy duplica el listado; crear una vista propia |
| /solicitante/historial | HistorialSolicitante | Lista, notificaciones, banners y botón directo a Documento |
| /solicitante/documento | solicitante/Documento.tsx | Formulario principal al que se aplican los tres pasos |
| /dashboard/publicar/documento | El mismo DocumentoSolicitante | Cambios compartidos; validar este acceso también |
| /solicitante/convocatoria | solicitante/Convocatoria.tsx | Revisar contratos compartidos de pago sin imponer datos registrales de Documento |
| /dashboard/publicar/convocatoria | PublicarConvocatoria.tsx | Otro formulario activo que puede contradecir la nueva referencia |
| /dashboard/publicar/documento-pdf | PublicarDocumentoPDF.tsx | Ruta alternativa activa; probar y armonizar contrato de pago |
| PublicarDocumento.tsx | Import lazy existente, sin ruta asignada en App inspeccionado | No tratarlo como formulario principal ni corregirlo en lugar del activo |
| /solicitante/publicaciones/:id | solicitante/PublicacionDetalle.tsx | Orden, tipo de pago, motivo y enlace público |
| /solicitante/perfil | solicitante/Perfil.tsx | Address falta en UI; nombre editable |
| /dashboard/perfil | El mismo PerfilSolicitante | Aplicar bloqueo por rol de solicitante, sin cancelar permisos administrativos |
| /dashboard/ediciones | Ediciones.tsx + EditionController | Bloque editorial CVE/QR/PDF |
| /api/stats | SystemController::getStats | Consultas que realmente alimentan estadísticas |
| /dashboard/configuracion | Configuracion.tsx | FAQ declarada; Directorio es pestaña inicial; textos legales sin editor dedicado |
| /dashboard/paginas y /lotus/paginas | CMS existente | Reutilizable para documentos legales e información |
| /ediciones y /edicion/:code | EdicionesPublic.tsx / EditionPublic.tsx | Unificar presentación y nomenclatura |
| /p/:slug | PagePublic.tsx + PagesController | Páginas existentes, estado/publicación dependientes de BD |
| /register y /login | Register.tsx / Login.tsx | Identidad, contraseña, aceptación y orden de enlaces |
| /dashboard/promo y /lotus/banners | Promo.tsx | Gestión existente de siete espacios de banners |

## 4. Prioridades y reglas que deben conservarse

| Prioridad | Resultado |
|---|---|
| P0 | CVE breve y QR/enlace disponibles desde borrador; recorrido real de diagramación hasta publicación |
| P1 | Recuperación íntegra de solicitudes, devolución con motivo, pago de seis dígitos, estadísticas, búsqueda, registro y aceptación |
| P2 | Interfaz exacta de tres pasos, perfil, navegación, notificaciones y presentación pública |
| P3 | Cotizador por PDF, revisión publicitaria y composición final de inicio |

- Separar **CVE** (`DMV-XXXXXXXX`) y **número oficial** (`MMXXVI-0001`).
- Conservar identidad y enlaces de ediciones anteriores, índice único del CVE y reglas de numeración/papelera.
- Conservar PDF privado de borradores. Disponer del enlace para diagramación no equivale a publicar su contenido.
- Mantener controles de integridad, checksum, preparación y publicación del PDF final.
- Usar precios/tasas almacenados en cada solicitud al mostrar un borrador histórico; no recotizarlo por abrir la pantalla.
- Mantener controles de registro habilitado/suspendido; F1 no solicita activarlo automáticamente.
- Mantener correos/SMTP fuera de los ajustes de este plan: las notificaciones requeridas se resuelven dentro del sistema. El documento histórico E42 informa de un aplazamiento de correo; debe comprobarse ese antecedente antes de incorporar un cambio de mensajería externo.
- No borrar Directorio Legal ni contenido editorial al pausar accesos.

## 5. Matriz individual: vista del solicitante

“Existe” significa encontrado en código; la aceptación en ejecución se obtiene con los escenarios de la sección 10.

| ID | Requisito de F1 | Comparación actual y evidencia | Acción concreta |
|---|---|---|---|
| S0 | Logo superior | Pendiente: Topbar no contiene logo; el activo SVG ya se usa en login y cabecera pública (E02/E29/E35). | Reutilizar /Logotipo_Diario_Mercantil.svg en Topbar; adaptar fondo y tamaño a móvil. No crear otro logotipo. |
| S1 | Título principal destacado | Pendiente: título en caja mixta, sin fajón (E03). | Usar SOLICITUD DE PUBLICACIÓN DE DOCUMENTO y fajón institucional; mantener la guía de tres pasos. |
| S2 | Título/texto del paso 1 | Pendiente: Datos del Documento y descripción abreviada (E03). | Aplicar título y texto literal del catálogo de esta revisión. |
| S3 | Etiquetas visibles | Pendiente: selectores Tipo de sociedad, Tipo de acto, Estado y Oficina tienen placeholder, sin etiqueta visible equivalente (E04). | Agregar label asociado a cada control; mismo estilo que los demás. |
| S4 | Letra uniforme | Pendiente: etiqueta text-[10px], dentro del bloque Tomo (E04). | Separar identificación visual y equiparar tamaño/alineación; ancho compacto. |
| S5 | Planilla o trámite | Pendiente: etiqueta Número de planilla; máscara fija de planilla (E04/E05). | Renombrar; conservar formato PUB y registrar como decisión pendiente el formato alternativo de trámite, no descrito en F1. |
| S6 | Distribución compacta | Pendiente: grid md:grid-cols-2 y controles dispuestos por orden secuencial (E04). | Dos grupos: Tomo/Letra/Número/Año y Expediente/Fecha/Planilla; una columna móvil, sin campos comprimidos. |
| S7 | Título/texto paso 2 | Pendiente: Cargar Documento PDF y texto breve (E07). | Aplicar Adjuntar el documento digitalizado y orientación literal. |
| S8 | Advertencia de legibilidad | Parcial: explica PDF/50MB, conteo y tarifa; falta advertencia completa (E07). | Añadir texto literal sobre sellos, firmas, cortes, desenfoques y devolución. |
| S9 | Quitar orden del paso 2 | Pendiente: botón Descargar Orden activo (E07). | Ocultar/retirar botón de esta vista; no eliminar el servicio administrativo de órdenes. |
| S10 | Vista previa efectiva | Existe ProtectedPdfViewer para kind=document_pdf (E07); ejecución no comprobada. | Conservar y probar PDF recién cargado y reabierto; armonizar tipos históricos de adjunto; evitar título vacío sin visor. |
| S11 | Título/texto paso 3 | Pendiente: Datos de Pago (E08). | Usar Reportar el pago de la publicación y orientación literal. |
| S12 | Tipografía resumen | Pendiente: clases text-[11px], text-[12px], text-sm y colores distintos (E08). | Uniformar descripciones/datos con referencia a Folios/Precio por folio; conservar jerarquía del total. |
| S13 | Resumen de la orden | Pendiente: Resumen de la Orden (E08). | Cambiar exactamente a Resumen de la orden. |
| S14 | Descripción y costo | Pendiente: falta subtítulo; explicación del servicio tiene uppercase (E08). | Agregar Descripción y costo y retirar uppercase del párrafo descriptivo. |
| S15 | Razón social/datos sin corchetes | Pendiente: razón social y casi todos los valores entre corchetes; colores distintos (E08). | Retirar corchetes, unificar color, valores en negrita; razón social en mayúsculas y condición del registrador entre paréntesis. |
| S16 | Título/texto bancario | Pendiente: Datos bancarios para efectuar el pago y texto distinto (E09). | Aplicar textos literales del catálogo; no cambiar proveedor de datos. |
| S17 | Banco destino, teléfono, sin titular | Parcial: los datos existen; tarjeta muestra banco sin prefijo, Pago Móvil y Titular; copia también incluye Titular (E09). | Cambiar tarjeta y portapapeles: Banco destino, Teléfono, RIF, Monto. Quitar Titular de ambas presentaciones. |
| S18 | Información del pago realizado | Pendiente: Información del Pago Realizado (E10). | Aplicar capitalización exacta. |
| S19 | Sin tipo de operación | Pendiente: selector con única opción Pago Móvil (E10). | Retirar selector; enviar tipo pago_movil de manera fija. |
| S20 | Banco emisor vinotinto | Pendiente: menú personalizado usa bg-slate-800/700 (E10). | Usar colores institucionales con contraste, foco y selección legibles. |
| S21 | Orden de campos | Pendiente: Tipo/Banco, Referencia/Fecha, Teléfono al final (E10). | Banco emisor, Teléfono, Fecha del pago, Referencia; conservar lectura secuencial móvil. |
| S22 | Operadora sin selección automática | Pendiente: 0414 inicial y fallback al reabrir (E06/E10). | Valor inicial vacío y opción Seleccione; restaurar prefijo real cuando exista, sin inventarlo. |
| S23 | Referencia de seis dígitos | Conflicto confirmado: formulario y API exigen cuatro (E10/E11). | Nuevos pagos con exactamente seis dígitos como texto; actualizar rutas activas de pago y mensajes; conservar históricos. |
| S24 | Reportar solicitud | Pendiente: botón Reportar pago; la casilla ya menciona REPORTAR SOLICITUD (E10). | Unificar botón, confirmación y mensajes finales como Reportar solicitud. |
| S25 | Elegir tipo desde Nueva publicación | Parcial: Sidebar abre PublishChoiceModal; botón derecho de Historial navega directo a Documento (E01/E12). | Reutilizar modal existente en el botón de Historial; no agregar una elección duplicada distinta. |
| S26 | Quitar orden de listado | Pendiente: Historial contiene Descargar orden (E12). | Retirarla de acciones del solicitante; conservar descarga de publicación. |
| S27 | Columna Edición | Pendiente: tras Fecha de publicación aparece Estado; API ya aporta identidad de edición (E12/E05). | Añadir número oficial desde edition_code; guion cuando aún no esté publicada. |
| S28 | Tipo de pago legible | Defecto confirmado: el detalle imprime payments[0].type directamente, exponiendo pago_movil (E13, línea 147). | Aplicar mapa de etiquetas Pago móvil sin cambiar enum guardado; probar también pagos históricos. |
| S29 | Quitar orden del detalle | Pendiente: Descargar Orden en cabecera (E13). | Ocultar el botón; facturación futura queda fuera del desarrollo actual. |
| S30 | Ver en línea en listado | Parcial: enlace canónico existe en detalle; listado tiene descarga, sin Ver en línea (E12/E13). | Añadir enlace por edition_cve  /  /  edition_code solo si la edición publicada está disponible. |
| S31 | Dirección editable | Parcial: BD/API ya tienen address; interfaz UserProfile/formData no lo incluye (E14/E15). | Agregar carga/edición/persistencia; permitir limpiar dirección explícitamente si se decide campo opcional. |
| S32 | Nombre bloqueado | Pendiente: formulario editable y UserController::update permite name (E14/E15). | Bloquear UI y rechazar cambios por API del perfil propio; preservar edición administrativa separada. |
| S33 | Inicio separado y resumen | Pendiente: index e historial usan el mismo componente. Banners ya existen en Historial (E01/E12/E38). | Crear InicioSolicitante, mover bienvenida/banners/avisos y añadir métricas por usuario; Historial queda como listado. |
| S34 | Rehidratar solicitud devuelta | Incompatibilidad confirmada: claves canónicas de API y capitalización no coinciden con formulario (E05/E06/E04). | Adaptador de lectura/escritura de metadatos y catálogo normalizado; preservar todos los datos y snapshot comercial. |
| S35 | Título de notificación | Pendiente: ¡Publicación Confirmada! (E12). | Usar ¡Publicación realizada! en aviso existente y en Inicio nuevo. |
| S36 | Empresa en notificación | Pendiente: aviso identifica CVE/número; helper razonSocial ya existe (E12). | Reutilizar helper, mostrar empresa en mayúsculas y enlace al detalle; sin corchetes literales. |
| S37 | Cotizador por PDF y manual | Mejora condicional: cotizador actual solo manual; carga/conteo existe en solicitud (E36/E07). | Evaluar contador reutilizable sin crear solicitud; incorporar PDF si es viable, mantener opción manual y dejar resultado de evaluación. |
| S38 | Cotizador visual | Pendiente: tarjeta compacta, total USD y texto, sin bloques de desglose (E36). | Bloques Folios/Precio/Subtotal/Total según maqueta; distinguir subtotal comercial del fiscal; coherencia con precio final IVA incluido. |

## 6. Matriz individual: administrador

| ID | Requisito de F1 | Comparación actual y evidencia | Acción concreta |
|---|---|---|---|
| A1 | Recepción operativa | Observación de conservación: los endpoints de solicitudes y listado existen (E05). | Verificar recepción Documento/Convocatoria; no rediseñar el flujo que F1 declara operativo. |
| A2 | Sustituir rechazo por devolución | Hay acciones separadas: rechazo con motivo y devolución a Borrador (E16/E17). F1 reporta fallo en ejecución. | Usar devolución como acción correctiva en lista/detalle; no llamar rechazo cambiando solo etiqueta; preservar estados históricos. |
| A3 | Motivo de devolución | Parcial: servicio acepta comment, pero frontend/API envían devolución sin motivo (E16/E17/E39/E40). | Motivo obligatorio UI/API, persistencia/auditoría y aviso interno; leer comment también en Borrador, no solo reject_reason en Rechazado. |
| A4 | CVE DMV-XXXXXXXX | Conflicto: generador devuelve DM- más 24 caracteres hexadecimales (E18). | Generador criptográfico de ocho alfanuméricos mayúsculos, unicidad y reintento; compatibilidad de CVE existentes. |
| A5 | CVE/URL/QR al crear borrador | Parcial: CVE se reserva al crear; QR/URL se muestran solo Publicada+PDF válido (E19/E20). | Mostrar/copiar/descargar desde borrador sin PDF; enlace y QR estables; conservar comprobaciones para publicar. |
| A6 | Conservar edición y revisar fecha | Publicación tiene controles de preparación; fecha por defecto ya usa EditorialClock (E19/E41). | Mantener composición/PDF/publicación; verificar fecha de Caracas y no imponer otra automatización no definida. |
| A7 | Configuración general operativa | Existe getAdminSettings/saveSettings y esquema de claves (E21/E22). | Validar persistencia y lectura; no reconstruir configuración. |
| A8 | Medios de pago operativos | Panel usa hook y QR oficial cargado por administración (E09). | Conservar CRUD/carga QR; comprobar datos en formulario y acceso a imagen sin sesión cuando corresponda. |
| A9 | Directorio pausado | Pendiente: configuración inicia en Directorio Legal y sidebar tiene acceso (E21/E29). | Ocultar/deshabilitar accesos del módulo; conservar datos y configuración existente para fase futura. |
| A10 | Gestión de preguntas/respuestas | Falta implementación específica: pestaña declarada, sin formulario; CMS genérico ya existe (E21/E23). | CRUD pregunta/respuesta administrable y reflejo automático en FAQ; integrar con página/CMS existente. |
| A11 | Términos completos editables | CMS genérico disponible; no clave/editor específico en Configuración (E22/E23). | Añadir sección dedicada que edite página canónica de términos; preservar formato y contenido. |
| A12 | Privacidad editable aparte | Misma brecha que términos (E22/E23). | Sección independiente y página canónica de privacidad; no mezclar ambos textos. |
| A13 | Referencias legales enlazadas | Pendiente: términos en Documento son span y registro usa aceptación implícita (E10/E31). | Hipervínculos reales en solicitud, registro y demás referencias; páginas publicadas y accesibles. |
| A14 | Estadísticas excluyen eliminados | Defecto confirmado: /api/stats usa SystemController sin deleted_at; StatsController no es la ruta activa (E24/E25). | Corregir consultas activas de cantidades/tipos/recientes y revisar ingresos vinculados; actualizar pantalla y probar retirar/restaurar. |

## 7. Matriz individual: vista pública, registro y login

| ID | Requisito de F1 | Comparación actual y evidencia | Acción concreta |
|---|---|---|---|
| P1 | Unificar última edición/visor | Parcial: ambas vistas usan FlipbookViewer con contenedores/alturas y cabeceras distintas (E26/E27). | Extraer presentación compartida tomando EditionPublic como referencia; evitar sustituir librería innecesariamente. |
| P2 | Número romano/arábigo en visor | Parcial: título usa edition.code, dato Número usa edition_no (E27). | Mostrar edition.code también en Número y referencias visibles. |
| P3 | CVE oculto público | Pendiente: CVE en visor, cabecera de última edición y columna del listado (E26/E27). | Ocultar las tres presentaciones; conservar CVE en URL, QR y búsqueda. |
| P4 | Número oficial en listado | Pendiente: N° más edition_no, sin año romano (E26). | Usar code canónico completo y etiqueta Número de edición. |
| P5 | Razón social/acciones conservadas | Existen company_name, estado, Ver en línea y Descargar (E26). | Conservar resolución y acciones; validar edición con varias sociedades. |
| P6 | Búsqueda sin distinguir caja | Consulta LIKE/JSON sin normalización explícita; efecto depende de collation MySQL y SQLite (E28). | Reproducir con datos, aplicar normalización Unicode adecuada a motor; no dar por corregido al convertir input visual. |
| P7 | Búsqueda CVE conservada | Consulta incluye e.cve y e.code (E28). | Probar CVE anterior y DMV nuevo, conservando filtros de fechas. |
| P8 | Directorio público oculto | Pendiente: menú estático/dinámico y tarjeta Home lo exponen (E29/E30). | Ocultar en ambas fuentes y tarjeta; pausar página directa sin borrar contenido. |
| P9 | Información vinculada | CMS y enlaces Sobre el Diario/Cómo publicar/FAQ existen (E23/E29). Contenido real en BD no inspeccionado. | Auditar páginas publicadas y textos; completar contenido suministrado; enlaces estables. FAQ se cierra con A10. |
| P10 | Revisión Promo Banner | Gestión Promo, claves, selección y render ya existen (E37/E38/E30). | Pruebas por espacio: cabecera, principal, lateral, popup, historial 1-3; conservar módulo y corregir fallos reproducidos. |
| P11 | Estructura final Home | Home ya tiene presentación, servicios, lateral, última edición y banners (E30). | Ajustar composición existente después de P10/P8/P9; revisión responsive con material institucional definitivo. |
| P12 | Nombre/apellido mayúsculas | Registro usa un campo name para nombre completo/razón social sin normalización automática (E31/E32). | Normalizar Unicode UI/API; no dividir nombre/apellido ni migrar datos sin necesidad del requisito. |
| P13 | Prefijo/documento mismo renglón | Parcial: prefijo separado del input y con mb-2 (E31). | Fila flex unificada conservando prefijo y dígitos independientes. |
| P14 | Prefijos por tipo de persona | Pendiente: ambos tipos ven V/E/J/G/P; API regex admite todos sin cruzar person_type (E31/E32). | Natural V/E/P; jurídica V/J/G; limpiar selección incompatible y validar combinación en API. |
| P15 | Operadora más siete dígitos | Pendiente: phone es un input libre (E31). | Reutilizar control de teléfono, ensamblar dato persistido compatible; conservar valores históricos. |
| P16 | Mínimo nueve caracteres | Conflicto específico: mínimo actual 12 en frontend/backend (E33/E34). | Para cumplir exactamente F1, ajustar política compartida a 9 y textos; probar 8/9/12. No invalidar claves existentes. |
| P17 | Etiqueta de dirección | Parcial: sección Dirección de Habitación / Fiscal y textarea Dirección Completa (Manual) (E31). | Usar Dirección de habitación o domicilio fiscal; conservar Estado/Municipio y persistencia. |
| P18 | Aceptación obligatoria registro | Pendiente: texto Al crear una cuenta, acepta..., sin casilla/persistencia de aceptación (E31/E32). | Casilla previa al botón con enlace; API exige aceptación y registra fecha/versión del texto vigente. |
| P19 | Etiqueta login | Pendiente: N° de documento (E35). | Usar Nro. de documento de identidad. |
| P20 | Acceso administrativo discreto | Pendiente: toggle está entre documento y contraseña (E35). | Mover debajo de Ingresar y antes de crear cuenta, preservando acceso administrativo histórico. |

## 8. PDF previo: qué ya está aplicado y qué falta

No copiar los valores de ejemplo de F2 como configuración real. Banco, RIF, teléfono, tarifa y fecha de las imágenes son referencias de presentación.

| Referencia F2 | Estado actual | Trabajo requerido |
|---|---|---|
| Logo y encabezado superior | Logo SVG existente en otras vistas; falta en Topbar | Reutilizar activo y añadirlo al área privada |
| Textos orientadores de los tres pasos | Títulos y ayudas actuales no coinciden | Aplicar catálogo de textos de F1, que actualiza el paso 2 |
| Tipos Titular/Suplente/Auxiliar | Opciones y validación backend existentes | Conservar; resolver capitalización/rehidratación |
| Letras A-E | UI y backend existentes | Conservar; uniformar etiqueta |
| Tomo/Número de máximo tres dígitos | UI y backend existentes | Probar ceros iniciales, pegado y límites; no reimplementar sin necesidad |
| Año hasta año actual | YearPicker y backend usan límite; backend dispone de EditorialClock | Conservar y verificar cambio de año en Caracas |
| Expediente 3 dígitos-guion-hasta 8 | Formato implementado; API lo almacena en numero_expediente | Corregir lectura al reabrir; validar entradas |
| Planilla 3.4.1.hasta6 dígitos | Formato implementado; API lo almacena en numero_planilla | Corregir lectura; diferenciar futuro formato de trámite |
| Mayúsculas de nombres registrales | UI parcial y backend normaliza también selectores | Conservar nombres; alinear valores de opciones para evitar selectores vacíos |
| Fechas no futuras | Controles usan fecha UTC del navegador; backend registral usa strtotime/time | Uniformar día de Caracas y formato de fecha, no solo comparar timestamps |
| Solo PDF y conteo automático | Implementado | Validar archivo válido, límite y cambio de documento; texto de legibilidad pendiente |
| Eliminar “+ IVA” del aviso | El aviso del formulario principal ya dice USD por folio | Conservar; comprobar rutas alternativas |
| Ocultar bloque subtotal/IVA paso 2 | Formulario principal muestra folios/precio/total | Confirmación visual; no borrar cálculo interno |
| Ocultar subtotal/IVA paso 3 | JSX del desglose está comentado | Mantener oculto en esta pantalla; no marcarlo como pendiente por una búsqueda de texto |
| Precio por folio equivalente a uno | Ya divide USD por folios; multiplica por BCV actual | Usar snapshot unitario/tasa del mismo borrador y total |
| Banco/RIF/teléfono/monto/QR/copiar | Panel existe con método configurado y QR oficial subido | Ajustar etiquetas, quitar Titular también al copiar, probar datos reales |
| Referencia de cuatro dígitos | Coincide con implementación actual | F1 S23 la reemplaza por seis para nuevos reportes |
| Operadora y siete dígitos | Lista/sufijo existen; 0414 predeterminada | Selector vacío para captura nueva; conservar prefijo real en edición |
| Aceptación y REPORTAR SOLICITUD | Casilla existe; enlace es span y botón dice Reportar pago | Hipervínculo real y botón consistente |
| Quitar descargas de orden | Siguen en paso 2, listado y detalle | Retirar de esos tres lugares; conservar servicios administrativos |

## 9. Secuencia de implementación con entregables verificables

### Paso 1. Fijar línea base y validar el sistema en ejecución

**Entrega:** matriz de 73 puntos con columna de reproducción y evidencia visual.

1. Registrar commit/versión del entorno de prueba y compararlo con la copia local.
2. Conservar cambios previos del árbol de trabajo.
3. Preparar cuentas solicitante/administrador y datos de prueba; no cambiar datos reales para producir evidencia.
4. Capturar los tres pasos y pantallas relevantes en escritorio y móvil.
5. Registrar respuestas API de creación/detalle de edición, detalle de solicitud, configuración, páginas y estadísticas.
6. Comprobar collation real de MySQL, claves de metadatos existentes y versiones de referencias de pago.
7. Mantener estados: confirmado en código, reproducido, implementado, verificado. No confundirlos.

**Cierre:** conocer si el despliegue coincide con el código local y contar con casos de reproducción. Las discrepancias se añaden a la matriz, sin borrar los hallazgos locales.

### Paso 2. Resolver CVE nuevo y QR/enlace en borrador

**P0; A4-A6. Entrega:** borrador diagramable con identidad estable.

1. Cambiar EditionIdentityService::cve() al formato DMV más ocho alfanuméricos.
2. Mantener cve VARCHAR(32): admite tanto el formato anterior como el nuevo. La migración de identidad ya crea uq_editions_cve; inspeccionar BD antes de proponer otro índice.
3. Añadir reintento limitado ante colisión específica del CVE. No reintentar indiscriminadamente otros conflictos de composición/numeración.
4. Mantener número romano/arábigo y reserva transaccional.
5. Mostrar CVE, URL canónica y QR desde que exista el borrador, sin exigir file_is_valid.
6. Permitir copiar identidad/enlace y descargar QR para diagramación; validar calidad, margen y lectura desde el PDF impreso/exportado.
7. Mantener el botón Publicar sujeto a los controles de preparación y PDF válido.
8. Conservar acceso público restringido a ediciones publicadas. Mientras sea borrador, comunicar “Edición aún no publicada” en la experiencia de prueba; no exponer listado de solicitudes ni archivo privado.
9. Conservar CVE/URL al cambiar composición o subir un nuevo PDF.
10. Verificar que el QR de edición codifica el enlace canónico, no ID de solicitud, número reciclable ni QR bancario.

**Cierre:** sin PDF final se obtiene QR; se integra al PDF, se publica y se escanea el mismo QR. CVE anteriores siguen operativos. No se exige crear ediciones vacías: el requisito actual de solicitudes asociadas se conserva.

### Paso 3. Corregir contrato de metadatos y carga de borradores

**P1; S34 y validaciones F2. Entrega:** datos íntegros al reabrir.

| Backend actual | Input actual | Problema |
|---|---|---|
| fecha_registro | meta.fecha | Campo puede verse vacío |
| numero_expediente | meta.expediente | Campo puede verse vacío |
| numero_planilla | meta.planilla | Campo puede verse vacío |
| estado en mayúsculas | Opciones y REGISTROS_POR_ESTADO con caja mixta | Selección no coincide y catálogo de oficinas puede no resolver |
| tipo_sociedad en mayúsculas | Opciones/TRAMITES_POR_TIPO con caja mixta | Selección y actos dependientes pueden no resolver |
| oficina/tipo_acto en mayúsculas | Opciones de catálogo con otra caja | Valor guardado puede no figurar en el desplegable |

1. Definir DTO canónico y adaptador que lea claves nuevas e históricas.
2. Hacer que ambos lados utilicen los mismos valores de opción; separar texto visible del valor estable.
3. No vaciar oficina/acto al cargar los datos; limpiar dependencias solo si el usuario cambia Estado o sociedad.
4. Restaurar solicitante, dirección de solicitud, pagos y archivo desde la solicitud guardada, evitando que la carga del perfil sobrescriba datos del trámite.
5. Elegir el pago a restaurar mediante una regla explícita. API ordena hoy por fecha; añadir desempate estable si se usa el primer pago.
6. Recuperar snapshot comercial; no calcular la presentación con una tasa diferente de la almacenada.
7. Revisar vistas de resumen/detalle para que también lean claves canónicas.

**Cierre:** guardar, cerrar, devolver, reabrir y comparar todos los campos; corregir solo uno sin cambiar otros.

### Paso 4. Implementar devolución con motivo de extremo a extremo

**P1; A2-A3. Entrega:** Solicitud devuelta con motivo visible y editable.

1. Reutilizar returnToDraft y su transición existente.
2. Incorporar cuadro de motivo obligatorio antes de confirmar.
3. Extender returnToDraftLegal(id) para enviar JSON; comprobar estado HTTP y error de negocio antes de mostrar éxito.
4. Leer motivo en LegalController y pasarlo a returnToDraft(id, comment).
5. Validar motivo vacío también en servidor y auditar actor, estado anterior y motivo.
6. Mostrar motivo en Historial, detalle y formulario reabierto en Borrador. Actualmente el detalle muestra reject_reason solo para Rechazado.
7. Cambiar las acciones correctivas de listado/detalle a devolución; preservar historial de rechazos existentes.
8. Si la solicitud está vinculada a una edición activa, respetar los bloqueos de composición; no dejarla simultáneamente corregible y publicable sin resolver esa asociación.

**Cierre:** motivo idéntico en administración y solicitante; estado Borrador; reenvío posterior correcto. “Rechazar pago” sigue siendo una acción distinta de devolver solicitud.

### Paso 5. Ajustar captura y validación de pagos

**P1; S19-S24; F2. Entrega:** contrato uniforme de seis dígitos.

1. Recorrer todos los productores de addLegalPayment, incluidos pagos adicionales administrativos, SuperAdmin y rutas alternativas activas.
2. Cambiar regex de API, longitudes, placeholders, validación previa y mensajes a seis dígitos.
3. Conservar referencia como cadena para preservar ceros iniciales.
4. Guardar operadora vacía al crear; no asignar 0414 al faltar un dato histórico.
5. Validar operadora permitida y siete dígitos de sufijo; formar once dígitos para el almacenamiento actual.
6. Mantener pagos históricos de cuatro dígitos. Conservar registro anterior cuando no se esté realizando un pago nuevo; no recapturar automáticamente al reenviar una solicitud corregida.
7. Eliminar selector de operación; conservar enum pago_movil.
8. Ordenar los campos y usar fecha de Caracas.
9. Unificar envío/errores para evitar mostrar una solicitud reportada si solo se guardó parte del proceso.

**Cierre:** referencia 001234 conserva sus ceros; cinco/siete dígitos rechazados; pago histórico permanece consultable; corrección de documento no genera un pago duplicado.

### Paso 6. Aplicar interfaz completa de los tres pasos

**P2; S0-S18, S20-S24; F2. Entrega:** formulario comparable con el modelo.

1. Incorporar logo del activo existente en Topbar.
2. Aplicar títulos, ayudas y capitalización del catálogo de textos.
3. Uniformar etiquetas y distribuir campos registrales.
4. Advertencia de legibilidad y vista previa efectiva.
5. Retirar descargas de orden en paso 2.
6. Añadir Descripción y costo; quitar uppercase descriptivo/corchetes, unificar colores y negritas.
7. Conservar ocultos los desgloses ya ajustados.
8. Mostrar precio unitario y total desde un único snapshot.
9. Ajustar PaymentMethodsPanel y texto del portapapeles; no regenerar su QR oficial subido.
10. Cambiar selector del banco a vinotinto, orden de campos, título y botón.
11. Convertir términos a enlace real.

**Cierre:** capturas escritorio/móvil de los tres pasos; comparación textual y visual; PDF y envío conservan comportamiento.

### Paso 7. Ajustar historial, detalle y navegación

**P2; S25-S30. Entrega:** seguimiento coherente.

1. Reutilizar PublishChoiceModal desde Nueva publicación de Historial.
2. Quitar orden de listado y detalle del solicitante.
3. Agregar Edición después de Fecha de publicación con edition_code.
4. Mapear pago_movil a Pago móvil.
5. Añadir Ver en línea usando enlace canónico existente, conservando Descargar publicación.
6. Diferenciar solicitud pendiente, publicada y archivo no disponible.

**Cierre:** dos accesos de Nueva publicación ofrecen la misma selección; número oficial y URL correctos por solicitud.

### Paso 8. Perfil e Inicio del solicitante

**P1/P2; S31-S36. Entrega:** inicio independiente y perfil completo.

1. Agregar address al tipo, carga y envío del perfil; el backend ya tiene campo.
2. Bloquear name para rol solicitante en UI y endpoint; mantener permisos administrativos.
3. Permitir edición de dirección conforme a su carácter obligatorio/opcional; el update actual ignora cadenas vacías.
4. Crear InicioSolicitante y asignarlo al index de /solicitante.
5. Reubicar resumen, avisos y AdvertisingSlider existentes.
6. Calcular métricas de registros vigentes del usuario. La lista actual es limitada: no contar únicamente las filas cargadas si puede truncarse.
7. Cambiar título y contenido de notificación a empresa, reutilizando razonSocial.
8. Al separar componentes, conservar cierre de avisos y evitar duplicarlos en ambas páginas.

**Cierre:** Inicio y Mis publicaciones tienen finalidades distintas; nombre no cambia por petición manipulada del solicitante; dirección se guarda y avisos identifican empresa.

### Paso 9. Estadísticas administrativas

**P1; A14. Entrega:** indicadores ajustados a registros vigentes.

1. Modificar consultas de SystemController::getStats, que sirve /api/stats.
2. Aplicar deleted_at IS NULL a solicitudes/ediciones vigentes.
3. Revisar conteos por tipo, recientes y sumas relacionadas, sin eliminar historial contable.
4. Definir si un indicador de ingresos representa actividad vigente o cobros históricos; no excluir cobros solo por ocultar una publicación sin definir su significado.
5. Revisar PanelHome: clearStats devuelve ok, aunque la confirmación promete borrar publicaciones/ediciones/pagos. Corregir la presentación para que un botón de actualización no prometa un borrado que la API no realiza.
6. Recargar indicadores tras operaciones y al volver al dashboard; no atribuir el problema a caché sin evidencia.

**Cierre:** retirar/restaurar cambia conteos esperados; cifras contrastadas con consultas base; una actualización de indicadores no borra datos.

### Paso 10. Contenido administrable y pausa del Directorio

**P2; A9-A13, P8-P9, P18. Entrega:** FAQ/textos legales y accesos coherentes.

1. Cambiar pestaña inicial de Configuración a General.
2. Pausar accesos del Directorio en Sidebar, menú público por defecto, menú generado desde pages, tarjeta Home y acceso directo a página.
3. Conservar registros y contenidos del Directorio.
4. Implementar CRUD específico de FAQ: pregunta/respuesta con validación y reflejo en sección pública existente.
5. Añadir editores independientes de términos/privacidad en Configuración.
6. Reutilizar CMS/pages como fuente única para las páginas legales; no mantener copias distintas en settings y pages.
7. Reservar rutas/slugs canónicos y conservar versiones para identificar qué texto aceptó cada usuario.
8. Conectar todos los enlaces legales y evitar que el menú automático publique páginas auxiliares como enlaces de navegación no deseados.
9. Completar contenido solo con textos suministrados/revisados.

**Cierre:** administrador crea/edita/elimina FAQ y cambia cada texto legal; consulta pública refleja la versión guardada; Directorio no aparece ni se borra.

### Paso 11. Ediciones públicas y búsqueda

**P1/P2; P1-P7. Entrega:** visor coherente y búsqueda fiable.

1. Extraer cabecera/visor compartidos a partir de EditionPublic.
2. Conservar FlipbookViewer, descarga y filtros existentes.
3. Usar code oficial en título, Número, tabla y tarjetas.
4. Ocultar CVE en visor, última edición y columna del listado; conservarlo en URL/búsqueda.
5. Reproducir búsqueda con mayúsculas, minúsculas y tildes.
6. Revisar collation de JSON_UNQUOTE y campos MySQL; aplicar solución Unicode consistente con ambos motores.
7. Probar razón social de varias solicitudes por edición, formatos históricos y filtros.
8. Mantener orden de publicación actual y protección de edición retirada/PDF inválido.

**Cierre:** mismas coincidencias por cambio de caja; mismo número oficial en documento, tabla y visor; CVE sigue buscando sin exponerse en las zonas solicitadas.

### Paso 12. Registro y login

**P1/P2; P12-P20. Entrega:** formulario y servidor con reglas coherentes.

1. Normalizar name en mayúsculas con acentos sin separar campos que actualmente son únicos.
2. Unificar prefijo/número en una fila.
3. Filtrar opciones por tipo y validar person_type+prefijo en API.
4. Reutilizar operadora/sufijo en teléfono, manteniendo formato persistido.
5. Cambiar política de mínimo 12 a 9 conforme a F1; actualizar controles y mensajes que usan la política compartida. No alterar hashes ni exigir reinicio de claves existentes.
6. Usar etiqueta de dirección exacta.
7. Añadir casilla obligatoria y enlaces legales.
8. Registrar aceptación y versión vigente en backend dentro del registro; bloquear API cuando falta, aunque se omita el control visual.
9. Conservar registro suspendido/habilitado y auto-login existente.
10. Ajustar login y reubicar acceso administrativo.

**Cierre:** 8 caracteres rechazados, 9 aceptados si cumple las demás reglas; sin aceptación no hay cuenta; registro suspendido sigue bloqueando altas.

### Paso 13. Cotizador, banners e inicio público

**P3; S37-S38, P10-P11. Entrega:** mejoras complementarias con alcance definido.

1. Mejorar cotizador manual con bloques, tarifa final y estimación.
2. Evaluar conteo PDF local reutilizable o endpoint transitorio sin solicitud ni archivo persistente; no usar ensureDraft para cotizar.
3. Si se habilita PDF, ambas modalidades calculan igual número de folios y precio; permitir cambio/eliminación del archivo.
4. Probar los siete espacios de Promo existentes con guardado y acceso público.
5. Revisar popup/cierre, reemplazo y retiro de imagen, proporciones y móvil.
6. Ajustar Home existente, quitar Directorio y cerrar páginas institucionales.
7. Validar con material final; no extender la fase a construir facturación o desarrollar Directorio.

**Cierre:** resultados de viabilidad del PDF documentados; cotizador manual terminado; banners probados y estructura pública coherente.

### Paso 14. Cierre de matriz y paquete de implementación

1. Registrar evidencia de cada punto individual.
2. Ejecutar comprobaciones pertinentes después de modificar código: typecheck/build y pruebas relevantes frontend/PHP.
3. Ampliar pruebas existentes de identidad, integridad, publicación, estados, snapshots y PaymentMethodsPanel; no crear pruebas triviales para cada cambio de texto.
4. Revisar migraciones necesarias: aceptación y FAQ si se almacenan estructuradas. Perfil address ya existe; CVE admite nuevo formato, por lo que no presuponer migraciones para esos dos cambios.
5. Documentar diferencias de entorno, decisiones condicionadas y contenido pendiente.
6. Entregar cambios revisables antes de una etapa posterior de despliegue.

**Cierre:** P0/P1 aceptados y ningún punto desaparece de la matriz; P3 condicional registra decisión y resultado, no un estado ambiguo.

## 10. Escenarios de aceptación que deben ejecutarse

| Caso | Procedimiento | Resultado exigido |
|---|---|---|
| T01 - Edición desde borrador | Crear con solicitudes elegibles, sin PDF final | CVE DMV-XXXXXXXX, enlace y QR descargables inmediatamente |
| T02 - Diagramación completa | Incorporar QR/CVE al PDF, cargar y publicar | El mismo QR abre el PDF/edición correcta |
| T03 - Identidad y compatibilidad | Simular colisión y abrir CVE antiguo; retirar/reutilizar número de edición de prueba | Colisión reintentada sin duplicar composición; enlaces antiguos no cambian de dueño |
| T04 - Publicación incompleta | Intentar publicar sin PDF válido | Rechazo controlado; tener QR no habilita publicación incompleta |
| T05 - Reapertura de metadatos | Crear/guardar/cerrar/reabrir y devolver con claves canónicas e históricas | Fecha, planilla, expediente y todos los selectores visibles |
| T06 - Devolución | Motivo vacío y luego válido; reabrir como solicitante | Vacío rechazado; motivo visible; corrección/reenvío sin pérdida |
| T07 - Nuevo pago | Banco, operadora expresa, teléfono y referencia 001234 | Se guarda como cadena de seis dígitos; falta de operadora o longitud errónea rechazada en API |
| T08 - Pago histórico | Reabrir solicitud con referencia antigua de cuatro dígitos y corregir solo datos registrales | Pago conservado; no se inventan dígitos ni se duplica el reporte |
| T09 - Snapshot | Cambiar tarifa/tasa de prueba después de guardar y reabrir | Precio por folio y total mantienen los valores del trámite; no recotización accidental |
| T10 - Vista previa | PDF nuevo y adjunto histórico; reemplazar documento | PDF visible, folios actualizados y ningún encabezado de vista previa vacío |
| T11 - Navegación | Ambos botones Nueva publicación, Inicio, Historial y Ver en línea | Selección Documento/Convocatoria consistente y rutas correctas |
| T12 - Perfil | Editar dirección; intentar modificar nombre por HTTP como solicitante | Dirección persistida, nombre protegido; administrador conserva su canal autorizado |
| T13 - Estadísticas | Anotar conteos, retirar y restaurar solicitud/edición de prueba | Dashboard refleja registros vigentes y no promete borrar datos al actualizar |
| T14 - Búsqueda | empresa/EMPRESA/EmPrEsA y nombres acentuados; CVE viejo/nuevo; fechas | Mismas coincidencias por caja; búsquedas y filtros conservados |
| T15 - Presentación pública | Última edición y acceso Ver en línea | Composición compartida, code completo, CVE oculto en metadatos/listado |
| T16 - Contenidos | Editar FAQ/términos/privacidad; abrir enlaces y Directorio | Actualización pública correcta, páginas legales separadas y Directorio pausado |
| T17 - Registro | Tipo natural/jurídico; 8/9/12 caracteres; casilla ausente/presente | Prefijos permitidos, política coherente y aceptación persistida |
| T18 - Registro suspendido | Probar alta con registration_enabled=0 en entorno de prueba | Se conserva bloqueo tanto en pantalla como API |
| T19 - Banners | Guardar/reemplazar/quitar imagen en cada uno de siete espacios | Render correcto, retiro efectivo, popup cerrable y móvil sin deformación |
| T20 - Cotizador | Folios manuales y PDF, si se habilita | Mismo costo estimado para mismos folios; sin crear solicitud |
| T21 - Diseño | Capturas escritorio/móvil de tres pasos, perfil, lista y registro | Textos exactos, etiquetas visibles, columnas legibles y sin acciones retiradas |
| T22 - Permisos y regresión | Accesos solicitante/admin/público, archivos privados y ediciones retiradas | Sin apertura accidental de borradores ni modificación de publicaciones terminadas |

Estos escenarios están planificados; no se reportan como aprobados en esta entrega.

## 11. Catálogo de textos que evita interpretaciones durante los ajustes

- Encabezado: **SOLICITUD DE PUBLICACIÓN DE DOCUMENTO**.
- Paso 1: **Datos registrales del documento**.
- Orientación paso 1: “Estimado usuario, por favor complete los campos según los datos que constan en el documento debidamente protocolizado.”
- Paso 2: **Adjuntar el documento digitalizado**.
- Orientación paso 2: “Estimado(a) usuario: para continuar con la solicitud, deberá digitalizar todos los folios (páginas) del documento en formato PDF y adjuntar en este paso.”
- Advertencia: “Importante: Asegúrese de que todos los folios (páginas) del documento estén correctamente digitalizadas y sean totalmente legibles. Verifique que textos, datos, sellos y firmas se visualicen completos, sin cortes, desenfoques ni zonas oscuras. Si el documento presenta información ilegible o incompleta, la solicitud podrá ser devuelta para su corrección.”
- Paso 3: **Reportar el pago de la publicación**.
- Orientación paso 3: “Estimado(a) usuario: a continuación, se muestra el detalle de su orden de servicio y el monto correspondiente a cancelar.”
- **Resumen de la orden** y **Descripción y costo**.
- Descripción: “Servicio de publicación electrónica en el Diario Mercantil de Venezuela de un documento protocolizado que corresponde a la razón social:”.
- **Datos bancarios para el pago**.
- Ayuda bancaria: “A continuación, se detallan los datos para la realización del pago móvil”.
- **Banco destino:**, **RIF:**, **Teléfono:** y **Monto:**.
- **Información del pago realizado**.
- Campo: **Número de planilla (PUB) o número de trámite**.
- Referencia: **Últimos 6 dígitos**.
- Botón final: **Reportar solicitud**.
- Notificación: **¡Publicación realizada!** “El documento de la empresa NOMBRE DE LA EMPRESA ha sido publicado exitosamente.” El nombre se sustituye por el dato real en mayúsculas.
- Aceptación de registro: “Acepto los Términos y condiciones del Diario Mercantil de Venezuela.”
- Dirección: **Dirección de habitación o domicilio fiscal**.
- Login: **Nro. de documento de identidad**.
- Acceso de registro: **¿No tienes cuenta? Crear cuenta**.

Se preserva la redacción de F1; cualquier corrección editorial adicional se registra separadamente. La advertencia de legibilidad orienta al usuario: no implica implementar reconocimiento automático de firmas/sellos ni OCR.

## 12. Decisiones abiertas delimitadas

| Tema | Qué falta | Avance posible sin esa definición |
|---|---|---|
| Formato de “número de trámite” | F1 amplía etiqueta sin indicar máscara/longitud distinta de PUB | Renombrar y conservar PUB; evaluar ejemplos antes de rechazar trámites |
| Alcance de CVE breve en ediciones antiguas | F1 exige formato nuevo pero no define recodificación histórica | Nuevas ediciones DMV; mantener CVE impresos y enlaces existentes |
| Fecha de edición | A6 menciona eventual automatización sin otra regla | Conservar fecha automática actual de Caracas y revisión manual |
| Contenido institucional y legal | Textos definitivos y versiones publicadas | Construir gestión/enlaces; cargar contenido existente verificable |
| Cotizador por PDF | F1 condiciona a viabilidad y complejidad | Terminar modalidad manual y diseño; decidir PDF con evidencia técnica |
| Indicadores monetarios | Distinguir cobros históricos de registros editoriales vigentes | Corregir conteos; evitar cambios contables arbitrarios |
| Sistema desplegado | Versión/BD/configuración aún no contrastadas | Hallazgos y tareas locales definidos; validar entorno en Paso 1 |

No se fijan estimaciones de horas con una apariencia de precisión. Después del Paso 1 se pueden estimar entregas con base en fallos reproducidos y contenido disponible.

## 13. Entregas y criterio de finalización

1. **Editorial:** Pasos 1-2, T01-T04. Es la primera entrega y desbloquea diagramación.
2. **Solicitudes y pagos:** Pasos 3-6, T05-T10/T21. Incluye incompatibilidades de datos, no solo textos.
3. **Solicitante y administración:** Pasos 7-10, T11-T13/T16.
4. **Consulta y acceso:** Pasos 11-12, T14-T18.
5. **Complementos y cierre:** Pasos 13-14, T19-T22 y matriz final.

Cada entrega incluye archivos afectados, comparación antes/después, resultados de pruebas y decisiones pendientes. El cierre exige evidencia para los puntos corregidos y comprobación de conservación para A1/A6-A8/P5/P7.

La planificación no incluye desarrollo definitivo del Directorio, facturación electrónica, rediseño general del sistema ni cambios de correo. Un despliegue posterior requiere validar el paquete, respaldo y procedimiento de reversión; no se realiza durante la elaboración de este plan.

## 14. Índice de evidencia del código local

Las líneas enlazadas son puntos de entrada de los archivos inspeccionados al preparar esta versión. Pueden desplazarse durante una implementación posterior.

| Ref. | Evidencia | Archivo |
|---|---|---|
| E01 | Rutas activas e Inicio duplicado | [frontend/src/App.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/App.tsx:189>) |
| E02 | Encabezado privado sin logo | [frontend/src/components/Topbar.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/Topbar.tsx:45>) |
| E03 | Texto de cabecera y paso 1 | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:773>) |
| E04 | Etiquetas, selectores y distribución registral | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:791>) |
| E05 | Metadatos normalizados por API | [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:269>) |
| E06 | Reapertura del formulario y pagos | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:462>) |
| E07 | Paso 2 y vista previa | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:974>) |
| E08 | Resumen, formato, IVA y datos de pago | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:1200>) |
| E09 | Panel bancario y texto copiado | [frontend/src/components/PaymentMethodsPanel.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PaymentMethodsPanel.tsx:16>) |
| E10 | Captura de pago, operadora y aceptación | [frontend/src/pages/solicitante/Documento.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Documento.tsx:1290>) |
| E11 | Validación de referencia en servidor | [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:521>) |
| E12 | Historial, aviso y Nueva publicación | [frontend/src/pages/solicitante/Historial.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Historial.tsx:67>) |
| E13 | Detalle solicitante y descarga de orden | [frontend/src/pages/solicitante/PublicacionDetalle.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/PublicacionDetalle.tsx:91>) |
| E14 | Perfil: campos disponibles | [frontend/src/pages/solicitante/Perfil.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Perfil.tsx:15>) |
| E15 | Actualización del perfil propio | [backend/src/UserController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/UserController.php:114>) |
| E16 | Devolución administrativa | [frontend/src/pages/PublicacionDetalle.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/PublicacionDetalle.tsx:114>) |
| E17 | Transición a borrador y comentario | [backend/src/Services/LegalRequestStateMachine.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/LegalRequestStateMachine.php:158>) |
| E18 | CVE y nomenclatura editorial | [backend/src/Services/EditionIdentityService.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Services/EditionIdentityService.php:9>) |
| E19 | CVE reservado al crear edición | [backend/src/EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php:379>) |
| E20 | QR restringido a Publicada | [frontend/src/pages/Ediciones.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Ediciones.tsx:648>) |
| E21 | Gestión de configuración y pestaña FAQ | [frontend/src/pages/Configuracion.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Configuracion.tsx:11>) |
| E22 | Esquema de configuración | [backend/src/Http/SettingSchema.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/Http/SettingSchema.php:6>) |
| E23 | CMS existente de páginas | [backend/src/PagesController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PagesController.php:58>) |
| E24 | Estadísticas realmente conectadas | [backend/src/SystemController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/SystemController.php:20>) |
| E25 | Ruta de estadísticas y ProfileProxy | [backend/public/index.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/public/index.php:68>) |
| E26 | Última edición y listado público | [frontend/src/pages/EdicionesPublic.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EdicionesPublic.tsx:1>) |
| E27 | Visor público, número y CVE | [frontend/src/pages/EditionPublic.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/EditionPublic.tsx:121>) |
| E28 | Búsqueda pública MySQL/SQLite | [backend/src/EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php:175>) |
| E29 | Navegación pública estática y dinámica | [frontend/src/components/PublicHeader.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/PublicHeader.tsx:68>) |
| E30 | Inicio público, Directorio y banners | [frontend/src/pages/Home.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Home.tsx:63>) |
| E31 | Registro: prefijos y formulario | [frontend/src/pages/Register.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Register.tsx:162>) |
| E32 | Registro y validación de identidad API | [backend/src/AuthController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/AuthController.php:255>) |
| E33 | Mínimo de contraseña frontend | [frontend/src/utils/passwordPolicy.ts](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/utils/passwordPolicy.ts:1>) |
| E34 | Mínimo de contraseña backend | [backend/src/PasswordPolicy.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/PasswordPolicy.php:7>) |
| E35 | Login y acceso administrativo | [frontend/src/pages/Login.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Login.tsx:80>) |
| E36 | Cotizador actual del solicitante | [frontend/src/pages/solicitante/Cotizador.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/solicitante/Cotizador.tsx:1>) |
| E37 | Gestión existente de banners | [frontend/src/pages/Promo.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/pages/Promo.tsx:37>) |
| E38 | Banners ya presentes en Historial | [frontend/src/components/AdvertisingSlider.tsx](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/components/AdvertisingSlider.tsx:15>) |
| E39 | Endpoint de devolución sin motivo | [backend/src/LegalController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/LegalController.php:370>) |
| E40 | Cliente de devolución sin cuerpo | [frontend/src/lib/api.ts](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/frontend/src/lib/api.ts:500>) |
| E41 | Acceso público protege borradores | [backend/src/EditionController.php](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/backend/src/EditionController.php:58>) |
| E42 | Antecedentes de implementación, no validación actual | [docs/IMPLEMENTACION_PLAN_GLOBAL_2026-10-07.md](<E:/08 - PROYECTOS AGOSTO 2026/DIARIO MERCANTIL/docs/IMPLEMENTACION_PLAN_GLOBAL_2026-10-07.md:1>) |
