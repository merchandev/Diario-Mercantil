# Plan de acción paso a paso - Diario Mercantil de Venezuela

Fecha: 12 de octubre de 2026\\
Estado: planificación; ajustes pendientes de ejecución.\\
Objetivo: atender la revisión final, resolver primero el bloqueo de diagramación de ediciones y verificar después los flujos de solicitante, administración y consulta pública.

## 1. Alcance y fuentes

Este documento responde a la solicitud de entregar primero un plan en Markdown. Las observaciones de los PDF se toman como requisitos y referencias para planificar; no constituyen una orden de implementar, publicar, enviar comunicaciones o desplegar cambios durante esta entrega.

Fuentes revisadas:

- **F1:** `Observaciones finales - Sistema Diario Mercantil de Venezuela - v1026.pdf`, 15 páginas. Se identifican los puntos como S0-S38 (solicitante), A1-A14 (administrador) y P1-P20 (vista pública, registro y login).
- **F2:** `Revisión-Sistema-Diario-Mercantil-v826.pdf`, 3 páginas. Se revisaron el texto y las imágenes de las tres páginas para recuperar también las anotaciones visuales.
- Código local y documentación del proyecto, especialmente formularios del solicitante, identidad de ediciones y pantalla de administración de ediciones.

La revisión del código es preliminar y de lectura. No se ejecutaron pruebas del sistema ni se verificó el comportamiento de producción. Los informes históricos de validación sirven como antecedentes y no demuestran que las observaciones finales estén resueltas.

**Carpeta actual localizada:** `E:\08 - PROYECTOS AGOSTO 2026\DIARIO MERCANTIL`. La ruta de contexto sin el prefijo `08 -` ya no existe.

## 2. Prioridades y decisiones de planificación

| Nivel | Alcance | Orden |
|---|---|---|
| P0 - Bloqueante | CVE breve, enlace estable y QR disponibles al crear el borrador de edición | Primero |
| P1 - Funcional | Devoluciones con motivo y datos completos; referencia de pago; estadísticas; búsqueda; registro y aceptación | Después del flujo editorial |
| P2 - Interfaz | Tres pasos, encabezados, campos, navegación, perfil, listas y visor público | En bloques verificables |
| P3 - Complementario | Cotizador por PDF, banners, inicio e información institucional | Al final |

Decisiones para resolver diferencias entre documentos:

1. **Referencia de pago:** F1 S23 sustituye los cuatro dígitos de F2 por los últimos **seis dígitos** para nuevos reportes. Preservar los pagos históricos; no completar referencias antiguas con dígitos inventados.
2. **Paso 2:** utilizar “Adjuntar el documento digitalizado”, como indica F1 S7.
3. **Datos bancarios:** F2 señala un fallo de configuración; F1 A7-A8 confirma que configuración y medios de pago funcionan. Verificar su lectura en el formulario y conservar lo que ya funciona.
4. **Importes e IVA:** F2 pide ocultar desglose de subtotal/IVA y la mención “+ IVA” en las pantallas indicadas. Se trata de presentación; no cambiar la fórmula de cobro ni la configuración fiscal por esta observación.
5. **Mayúsculas:** aplicarlas a nombres y datos registrales previstos. Conservar textos explicativos en mayúsculas y minúsculas según F1; no convertir contraseñas, correos o contenido editorial.
6. **CVE y número de edición:** son identificadores diferentes. El CVE nuevo será `DMV-XXXXXXXX`; el número oficial seguirá siendo, por ejemplo, `MMXXVI-0001`.
7. **Disponibilidad en borrador:** generar y permitir copiar/descargar QR, CVE y enlace para diagramación. Propuesta técnica: antes de publicar, el enlace informa que la edición aún no está disponible, sin exponer el PDF privado. Al publicar, el mismo enlace muestra la edición.
8. **Compatibilidad:** conservar CVE y enlaces existentes. El nuevo formato se aplicará a nuevas ediciones, salvo que posteriormente se acuerde una migración específica.
9. **Funcionalidades condicionadas:** cotización mediante PDF, banners y ajustes de inicio se incluyen como mejoras con evaluación previa, respetando el carácter secundario indicado en F1.

## 3. Hallazgos preliminares del proyecto

| Hallazgo comprobado en código | Consecuencia para el plan |
|---|---|
| `EditionController::create()` genera y guarda el CVE durante la creación del borrador | Revisar y ampliar ese flujo; no reconstruirlo desde cero |
| `EditionIdentityService::cve()` devuelve `DM-` seguido de 24 caracteres hexadecimales | Cambiar el generador para las ediciones nuevas |
| `Ediciones.tsx` muestra QR/enlace solo si el estado es Publicada y el PDF es válido | El bloqueo visible está en la disponibilidad de esos elementos en la interfaz |
| El botón de publicar utiliza controles de validez y preparación de edición | Conservar esas comprobaciones aunque el QR se habilite antes |
| `solicitante/Documento.tsx` y `Convocatoria.tsx` usan referencia de cuatro dígitos y operadora predeterminada 0414 | Actualizar formularios y revisar validaciones compartidas/API |
| Hay formularios alternativos y rutas de publicación adicionales | Identificar las rutas activas y evitar comportamientos inconsistentes |
| Existen servicios y pruebas de identidad, integridad y publicación de ediciones | Ampliar pruebas específicas sobre la solución existente |
| El árbol de trabajo contiene cambios previos | Conservarlos y limitar la futura intervención a archivos relacionados |

No se clasifica una observación como resuelta solo porque una corrección figure en un informe antiguo.

## 4. Ejecución paso a paso

### Paso 1. Preparar una línea base y una matriz de seguimiento

**Prioridad:** preparación. **Fuentes:** F1 completo y F2 completo.

- [ ] Identificar rutas activas para Documento, Convocatoria, inicio, perfil, registro, ediciones y páginas públicas.
- [ ] Revisar instrucciones locales aplicables, cambios existentes y versiones efectivas de frontend/backend.
- [ ] Crear una matriz con referencia, requisito, pantalla/API afectada, prioridad, dependencia, estado y evidencia de cierre.
- [ ] Reproducir los fallos con una cuenta solicitante y una administrativa en un entorno de prueba.
- [ ] Registrar estado inicial de ediciones, solicitudes, métodos de pago y configuración.
- [ ] Preparar datos de prueba para solicitud nueva, devolución, pago histórico, borrador y edición publicada.

**Resultado esperado:** alcance trazable y línea base reproducible. A1, A6-A8 y P5/P7 se registran como comprobaciones de conservación, no como fallos nuevos.

### Paso 2. Ajustar la identidad de nuevas ediciones

**Prioridad:** P0. **Fuente:** A4.

- [ ] Generar el CVE como `DMV-` más ocho caracteres alfanuméricos aleatorios en mayúsculas.
- [ ] Garantizar unicidad mediante restricción en base de datos y reintento controlado ante colisiones.
- [ ] Revisar campos, índices, validadores, búsquedas y rutas que puedan asumir el formato largo anterior.
- [ ] Mantener el código oficial anual romano/arábigo independiente del CVE.
- [ ] Preservar CVE y enlaces antiguos, incluidas las reglas existentes de retiro y papelera.

**Archivos iniciales:** `backend/src/Services/EditionIdentityService.php`, `backend/src/EditionController.php`, migraciones y pruebas de identidad.

**Aceptación:** una edición nueva obtiene un CVE que cumple `^DMV-[A-Z0-9]{8}$`; distintas ediciones no comparten CVE y los enlaces anteriores siguen resolviendo el registro correcto.

### Paso 3. Entregar CVE, enlace y QR desde el borrador

**Prioridad:** P0. **Fuente:** A5; conservación de A6.

- [ ] Confirmar que la respuesta de creación y la consulta de detalle entregan identidad suficiente para construir un enlace canónico.
- [ ] Mostrar automáticamente CVE, enlace y QR al terminar la creación del borrador.
- [ ] Permitir copiar CVE/enlace y descargar el QR con calidad suficiente para diagramación.
- [ ] Eliminar la dependencia de PDF válido/publicación para mostrar y descargar esos elementos.
- [ ] Mantener el mismo CVE, URL y contenido del QR al editar, cargar PDF y publicar.
- [ ] Mantener los controles actuales que impiden publicar una edición incompleta.
- [ ] Mostrar un estado claro en el enlace de una edición aún no publicada.
- [ ] Revisar la fecha predeterminada con `America/Caracas`; A6 menciona eventual automatización, pero no define nuevas reglas de programación.

**Archivos iniciales:** `frontend/src/pages/Ediciones.tsx`, `backend/src/EditionController.php`, servicios de preparación/publicación y ruta pública de edición.

**Aceptación principal:** crear borrador sin PDF definitivo, descargar QR, incorporarlo al PDF diagramado, cargar el PDF y publicar; el QR impreso debe abrir la misma edición sin regenerarse.

### Paso 4. Corregir devoluciones y recuperación del borrador de solicitud

**Prioridad:** P1. **Fuentes:** A2-A3 y S34.

- [ ] Diagnosticar la acción de rechazo y establecer “Volver a borrador” como acción de corrección según la observación final.
- [ ] Usar “Solicitud devuelta” en la comunicación al solicitante.
- [ ] Solicitar un motivo de devolución y guardarlo en historial/auditoría.
- [ ] Mostrar el motivo en la solicitud y en su notificación.
- [ ] Recuperar todos los datos registrales, selectores, datos de pago y adjuntos al reabrir el borrador.
- [ ] Conservar datos anteriores al corregir solo un campo; revisar la dependencia Estado/Oficina de Registro.
- [ ] Mantener las restricciones de edición de solicitudes ya publicadas.

**Aceptación:** una solicitud enviada se devuelve con motivo visible, el solicitante encuentra sus datos completos, corrige el campo indicado y vuelve a remitirla sin pérdida de información.

### Paso 5. Aplicar identidad visual y ajustar el paso 1

**Prioridad:** P2, con validaciones P1. **Fuentes:** S0-S6 y F2 página 1.

- [ ] Incorporar el logo oficial en la parte superior con comportamiento adecuado en móvil.
- [ ] Presentar “SOLICITUD DE PUBLICACIÓN DE DOCUMENTO” en mayúsculas y con un fajón que lo destaque.
- [ ] Utilizar “Datos registrales del documento” y el texto orientador de F1 S2.
- [ ] Incorporar etiquetas visibles para Tipo de sociedad, Tipo de acto inscrito, Estado y Oficina de Registro Mercantil.
- [ ] Uniformar el campo Letra y renombrar “Número de planilla (PUB) o número de trámite”.
- [ ] Organizar Tomo/Letra/Número/Año y Expediente/Fecha/Planilla en filas compactas; adaptar columnas a pantallas pequeñas.
- [ ] Normalizar nombres y razón social a mayúsculas en visualización y persistencia, conservando acentos.
- [ ] Verificar tipos de registrador Titular/Suplente/Auxiliar y letras A/B/C/D/E.
- [ ] Verificar Tomo y Número: solo dígitos, máximo tres.
- [ ] Verificar año hasta el año actual y fecha registral no futura.
- [ ] Verificar expediente: tres dígitos, guion y entre uno y ocho dígitos.
- [ ] Verificar planilla: tres dígitos, punto, cuatro dígitos, punto, un dígito, punto y entre uno y seis dígitos.
- [ ] Revisar cómo admitir “número de trámite”: F1 amplía la etiqueta, pero no especifica un formato alternativo; registrar ejemplos reales antes de imponer una máscara adicional.

**Aceptación:** campos identificados, formato coherente en escritorio/móvil y validaciones equivalentes en cliente y servidor. No bloquear trámites válidos por una nomenclatura no definida.

### Paso 6. Ajustar el paso 2 y la presentación de costos

**Prioridad:** P2. **Fuentes:** S7-S10 y F2 página 2.

- [ ] Utilizar “Adjuntar el documento digitalizado” y el texto orientador completo de S7.
- [ ] Incorporar la advertencia de legibilidad de S8: textos, datos, sellos y firmas completos; posibilidad de devolución para corrección.
- [ ] Conservar aceptación exclusiva de PDF, conteo de páginas y cálculo correspondiente.
- [ ] Ocultar la mención “+ IVA” y el bloque de desglose marcado en F2, preservando el total calculado.
- [ ] Retirar “Descargar orden” de este paso.
- [ ] Mantener vista previa solo si abre efectivamente el archivo cargado; corregirla si es viable u ocultarla si no lo es.
- [ ] Verificar cambio de PDF, actualización de folios y recuperación del adjunto en borradores.

**Aceptación:** PDF visible cuando existe vista previa, páginas y total correctos, mensajes completos y ninguna acción de descarga de orden en este paso.

### Paso 7. Unificar resumen de orden e instrucciones de pago

**Prioridad:** P2. **Fuentes:** S11-S18 y F2 página 3.

- [ ] Utilizar “Reportar el pago de la publicación” y el texto orientador de S11.
- [ ] Unificar tipografía, jerarquía, tamaño y colores del resumen.
- [ ] Utilizar “Resumen de la orden” y “Descripción y costo”.
- [ ] Incorporar la descripción del servicio de S14 en mayúsculas y minúsculas.
- [ ] Mostrar razón social en mayúsculas/negrita; datos registrales en negrita, sin corchetes.
- [ ] Mantener la condición del registrador entre paréntesis.
- [ ] Mostrar precio por folio equivalente a un folio; ocultar el desglose señalado en F2 y conservar el total.
- [ ] Utilizar “Datos bancarios para el pago”, “Banco destino:” y “Teléfono:”; retirar “Titular”.
- [ ] Mostrar los datos configurados, RIF, teléfono, monto de la orden, QR bancario y “Copiar datos”.
- [ ] Utilizar “Información del pago realizado”.

**Aceptación:** resumen legible y coherente con los PDF; datos bancarios obtenidos de configuración y monto idéntico al total de la orden. El QR bancario y el QR de edición tienen finalidades distintas y se validan por separado.

### Paso 8. Corregir captura de pago y envío de solicitud

**Prioridad:** P1. **Fuentes:** S19-S24 y F2 página 3.

- [ ] Retirar selector “Tipo de operación” y mantener Pago móvil como método del proceso.
- [ ] Uniformar el selector de Banco emisor con la identidad visual vinotinto.
- [ ] Ordenar campos: Banco emisor, Teléfono, Fecha del pago y Referencia.
- [ ] Iniciar el selector de operadora vacío; exigir selección expresa.
- [ ] Conservar opciones 0412/0414/0416/0422/0424/0426 y siete dígitos de teléfono.
- [ ] Exigir seis dígitos de referencia en nuevos reportes, conservando ceros iniciales.
- [ ] Validar fecha no futura utilizando la fecha de Caracas.
- [ ] Sincronizar formularios, validadores compartidos, API y mensajes; revisar pagos adicionales y Convocatoria para evitar reglas contradictorias.
- [ ] Cambiar botón final a “Reportar solicitud”.
- [ ] Mantener aceptación de términos y enlazar la página pública correspondiente.
- [ ] Permitir conservar referencias históricas de cuatro dígitos; exigir seis cuando se capture un reporte nuevo.

**Aceptación:** referencias nuevas de seis dígitos válidas; cuatro dígitos rechazados en reportes nuevos; operadora obligatoria; cuenta, fecha, monto y teléfono validados también en servidor.

### Paso 9. Ajustar navegación, listas y detalle del solicitante

**Prioridad:** P2. **Fuentes:** S25-S30.

- [ ] Hacer que los accesos “Nueva publicación” permitan elegir Documento o Convocatoria.
- [ ] Ocultar “Descargar orden” en listado y detalle del solicitante; reservar facturación futura fuera de este alcance.
- [ ] Añadir “Edición” después de “Fecha de publicación”, con el número oficial cuando corresponda.
- [ ] Mostrar “Pago móvil” en lugar de la nomenclatura interna `pago_movil`.
- [ ] Incorporar “Ver en línea” para solicitudes publicadas con enlace disponible; definir estado vacío para pendientes.
- [ ] Conservar permisos y vínculo entre solicitud, edición y publicación pública.

**Aceptación:** ambos accesos de nueva publicación coinciden; ninguna descarga de orden visible para solicitante; el enlace público abre la edición/publicación correcta.

### Paso 10. Ajustar perfil, inicio y notificaciones

**Prioridad:** P1/P2. **Fuentes:** S31-S36.

- [ ] Añadir Dirección al perfil y persistirla correctamente.
- [ ] Mostrar nombre completo sin edición ordinaria; impedir cambios también en la API del solicitante.
- [ ] Separar Inicio de Mis publicaciones.
- [ ] Incorporar un resumen con indicadores sencillos calculados solo para el usuario autenticado.
- [ ] Preparar ubicación de banners y habilitarlos cuando se pruebe el módulo.
- [ ] Utilizar “¡Publicación realizada!”.
- [ ] Identificar expresamente la empresa en mayúsculas en la notificación y enlazar su publicación.

**Aceptación:** dirección editable, nombre estable, inicio diferenciado, indicadores propios correctos y notificación reconocible por razón social.

### Paso 11. Ajustar administración de contenidos y estadísticas

**Prioridad:** P1/P2. **Fuentes:** A7-A14, P8 y P9.

- [ ] Verificar y conservar precios, referencias y medios de pago operativos.
- [ ] Mantener Directorio Legal pausado y ocultar su acceso público.
- [ ] Habilitar gestión de preguntas frecuentes: crear, editar y eliminar pregunta/respuesta.
- [ ] Reflejar cambios en la página pública correspondiente.
- [ ] Administrar por separado el texto completo de Términos y condiciones y Políticas de privacidad.
- [ ] Enlazar ambas páginas desde todos los lugares donde se mencionan.
- [ ] Revisar indicadores administrativos, filtros de eliminación lógica, estados y cachés.
- [ ] Comprobar actualización al retirar, enviar a papelera y restaurar registros según las reglas existentes.

**Aceptación:** contenido administrable y visible públicamente; indicadores corresponden a registros vigentes y se actualizan después de las operaciones.

### Paso 12. Unificar ediciones públicas y corregir búsqueda

**Prioridad:** P1/P2. **Fuentes:** P1-P7.

- [ ] Usar el visor “Ver en línea” como referencia para la última edición y accesos del archivo.
- [ ] Mostrar nomenclatura oficial completa, por ejemplo `MMXXVI-0001`, en visor y listados.
- [ ] Ocultar el CVE debajo de los datos generales del visor y retirar su columna del listado público.
- [ ] Conservar Fecha de edición, Número de edición, Razón social, Estado y acciones.
- [ ] Hacer la búsqueda por razón social insensible a mayúsculas/minúsculas en servidor.
- [ ] Mantener búsqueda por CVE completo para formatos antiguos y nuevos.
- [ ] Conservar organización por razón social, “Ver en línea” y descarga operativas.

**Aceptación:** “empresa”, “EMPRESA” y una combinación mixta producen las mismas coincidencias; visor, lista y documento coinciden en el número oficial.

### Paso 13. Ajustar registro de cuenta y login

**Prioridad:** P1/P2. **Fuentes:** P12-P20.

- [ ] Normalizar Nombre y Apellido a mayúsculas sin afectar contraseña ni correo.
- [ ] Colocar letra identificadora y número de identidad en el mismo renglón.
- [ ] Persona natural: opciones V/E/P. Persona jurídica: opciones V/J/G según la especificación recibida.
- [ ] Actualizar opciones al cambiar tipo de persona y validar combinaciones también en servidor.
- [ ] Dividir teléfono en operadora y siete dígitos cuando sea viable.
- [ ] Exigir mínimo nueve caracteres de contraseña en nuevos registros; revisar coherencia con recuperación/cambio.
- [ ] Usar “Dirección de habitación o domicilio fiscal”.
- [ ] Exigir aceptación expresa de términos mediante casilla e hipervínculo; registrar la aceptación.
- [ ] Utilizar “Nro. de documento de identidad” en login.
- [ ] Reubicar acceso administrativo debajo de Ingresar y mantener después “¿No tienes cuenta? Crear cuenta”.

**Aceptación:** creación bloqueada sin aceptación o con contraseña corta; combinaciones de identidad correctas; dirección y aceptación persistidas; login conserva su funcionamiento.

### Paso 14. Mejorar cotizador, banners y páginas informativas

**Prioridad:** P3. **Fuentes:** S37-S38 y P9-P11; dependencia parcial de S33.

- [ ] Mejorar bloques de folios, precio por folio y monto estimado.
- [ ] Evaluar reutilización del conteo PDF del paso 2 para cotización sin crear una solicitud.
- [ ] Si la evaluación es favorable, habilitar carga de PDF y conservar ingreso manual de folios.
- [ ] Mantener coherencia de tarifas/tasa y explicar el carácter estimado del cálculo.
- [ ] Probar Promo Banner: selección, guardado, render y adaptación a pantallas pequeñas.
- [ ] Completar Sobre el Diario, Cómo publicar y Preguntas frecuentes con contenido revisado.
- [ ] Definir estructura final del inicio público después de validar banners.
- [ ] Aplicar banners al inicio del solicitante cuando corresponda.

**Aceptación:** cotizador claro, ambas modalidades coherentes si se habilita PDF, banners funcionales y páginas enlazadas. El contenido institucional definitivo requiere textos suministrados o revisados por el responsable; no inventar políticas ni compromisos comerciales.

### Paso 15. Verificación integral y cierre

**Prioridad:** cierre. **Dependencia:** pasos anteriores.

- [ ] Ejecutar typecheck, build y pruebas frontend pertinentes.
- [ ] Ejecutar pruebas PHP relacionadas y validación de sintaxis de archivos modificados.
- [ ] Probar identidad/colisiones, enlaces antiguos y estabilidad de QR/CVE.
- [ ] Recorrer solicitud completa, devolución/corrección, nueva remisión, creación de edición, diagramación, carga de PDF y publicación.
- [ ] Probar perfiles solicitante/administrador y acceso público sin sesión.
- [ ] Verificar diseño en escritorio/móvil y textos contra la matriz.
- [ ] Revisar migraciones, si son necesarias, en una base de prueba y preservar datos históricos.
- [ ] Documentar cada cierre con evidencia y dejar explícitas las mejoras condicionadas que no se ejecuten.

**Aceptación:** sin fallos bloqueantes en el ciclo editorial ni pérdida de datos en solicitudes; todas las observaciones tienen estado y evidencia. Estos controles están previstos, no ejecutados en esta entrega.

## 5. Cobertura completa de observaciones

| Fuente y puntos | Paso | Tratamiento |
|---|---|---|
| S0-S6 | 5 | Logo, encabezado, etiquetas, planilla y distribución |
| S7-S10 | 6 | PDF, legibilidad, orden y vista previa |
| S11-S18 | 7 | Textos, resumen, tipografía y datos bancarios |
| S19-S24 | 8 | Pago móvil, operadora, seis dígitos y envío |
| S25-S30 | 9 | Nueva publicación, edición, detalle y enlace |
| S31-S33 | 10 y 14 | Perfil e inicio |
| S34 | 4 | Datos completos al volver a borrador |
| S35-S36 | 10 | Notificación de publicación |
| S37-S38 | 14 | Cotizador y presentación |
| A1 | 1 y 15 | Conservar recepción de solicitudes operativa |
| A2-A3 | 4 | Devolución con motivo |
| A4 | 2 | CVE breve |
| A5 | 3 | CVE/enlace/QR desde borrador |
| A6 | 3 y 15 | Conservar publicación y revisar fecha |
| A7-A8 | 7 y 11 | Conservar configuración y medios de pago |
| A9-A13 | 11 | Directorio pausado, FAQ y textos públicos |
| A14 | 11 | Estadísticas de registros vigentes |
| P1-P4 | 12 | Visor, número oficial y CVE oculto |
| P5 | 12 y 15 | Conservar acciones y organización por razón social |
| P6-P7 | 12 | Búsqueda por razón social y CVE |
| P8 | 11 | Directorio público oculto |
| P9-P11 | 14 | Información, banners e inicio público |
| P12-P20 | 13 | Registro y login |
| F2 página 1 | 5 | Formatos, mayúsculas y datos registrales |
| F2 página 2 | 6 | PDF y desglose de costos |
| F2 página 3 | 7 y 8 | Resumen, precio por folio, banco y envío; referencia actualizada por F1 |

## 6. Entregas previstas y dependencias

| Entrega | Pasos | Evidencia principal |
|---|---|---|
| 1. Flujo editorial desbloqueado | 1-3 | Borrador con CVE/enlace/QR; QR incorporado al PDF y estable después de publicar |
| 2. Solicitud y correcciones | 4-8 | Tres pasos ajustados; devolución recuperable; pago de seis dígitos |
| 3. Experiencia del solicitante | 9-10 | Navegación, perfil, inicio y notificaciones |
| 4. Administración y consulta pública | 11-13 | CMS, estadísticas, visor, búsqueda, registro y login |
| 5. Complementos y cierre | 14-15 | Cotizador/banners según viabilidad y matriz final de validación |

Dependencias específicas:

- El paso 3 depende de definir identidad en el paso 2.
- Los enlaces legales y la aceptación de los pasos 8 y 13 se cierran con las páginas administrables del paso 11.
- Los banners de Inicio del solicitante se cierran con el paso 14.
- Las pruebas de publicación/notificación requieren completar el flujo editorial.
- No se fijan horas o fechas de entrega sin reproducir los fallos y evaluar los módulos de contenido.

## 7. Límites y preparación de una implementación posterior

- La entrega actual crea únicamente este plan; no modifica lógica, base de datos ni producción.
- La facturación electrónica y el desarrollo definitivo del Directorio Legal quedan fuera del alcance.
- Conservar datos, PDF, CVE y enlaces históricos durante los ajustes.
- Antes de un despliegue posterior: preparar copia de base de datos y almacenamiento, validar migraciones y documentar reversión.
- El despliegue se trata como una etapa posterior al cierre verificable de los cambios.

**Primer resultado a implementar:** crear una edición en borrador y obtener inmediatamente su CVE `DMV-XXXXXXXX`, enlace estable y QR descargable para diagramación.
