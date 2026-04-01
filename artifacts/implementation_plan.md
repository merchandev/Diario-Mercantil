# Correcciones y Ajustes del Proceso Editorial (Diario Mercantil)

Este plan aborda de forma estructurada las más de 30 observaciones indicadas sobre el flujo de solicitudes, vistas de detalle, y gestión de ediciones. Se ha dividido en los siguientes módulos para asegurar que cada punto indicado se cumpla a cabalidad.

## 1. Mis Publicaciones (Vista de Lista del Solicitante y Admin) ✅
- **[Punto 1 y 29] Razón Social:** Se cambiará la procedencia de los datos para que en lugar del nombre del usuario ("Usuario de Prueba"), la tabla extraiga prioritariamente la `razón social` o `denominación` ingresada en la Solicitud (Paso 1).
- **[Punto 2 y 14] Fecha de Solicitud real:** El campo "Fecha de solicitud" usará el `created_at` generado por el sistema al iniciar el trámite, y NO la fecha registral del documento de la Fase 1.
- **[Punto 3] Bloqueo de Edición/Eliminación:** Garantizaremos que aquellas publicaciones que ya pasaron de la fase 'Borrador' o 'Pendiente' (ej. están en 'Por verificar') no tengan visibles los botones de Editar o Eliminar.
- **[Punto 4] Corrección de Filtros:** Se revisará la lógica del filtro visual del historial superior (Botones de estado) para garantizar que las tablas en la interfaz respondan a los cambios.

## 2. Vista de Detalles de Publicación (Usuario y Administrador) ✅
- **[Punto 5 y 6] Datos Registrales:** Se renombrará de "Información Adicional" a "Datos registrales del documento" y se estructurarán claramente todos los campos completados en el Paso 1 (tipo de acto, registro mercantil, tomo, expediente, planilla, etc).
- **[Punto 7, 11, 12] Datos del Solicitante:** En la vista del **usuario solicitante**, se ocultarán sus propios datos identificativos por redundancia. En la vista del **Administrador**, SÍ se mantendrán para contacto y validación. Ambas vistas mantendrán la misma coherencia de diseño.
- **[Punto 8 y 13] Historial de Pago:** Se agregará el número de teléfono emisor en la visualización de los detalles del pago móvil para agilizar las conciliaciones de fondos.
- **[Punto 9 y 15] Ocultar datos prematuros:** Mientras el documento NO esté en estado 'Publicado', no se visualizarán los elementos como Fecha de publicación, Código QR, Enlace público ni Estado de manera anticipada.
- **[Punto 10] Botón Definitivo:** Cuando pase a 'Publicada', aparecerá la funcionalidad de ver el enlace o descargar la edición directamente desde esta vista.
- **[Punto 16] Número de orden en revisión Admin:** Se verificará que el campo asigne y muestre correctamente el número de orden (`order_no`) correspondiente en vez de figurar vacío.

## 3. Corrección Crítica del Flujo y Fechas de Publicación ✅
- **[Punto 20, 21, 22, 23, 24, 25] Lógica Transicional:** Cambiaremos el comportamiento al aprobar pagos. Verificar un pago ahora cambiará el estado de la solicitud exclusivamente a **"En trámite"**, no a "Publicada". No generará fecha de publicación en este momento, ya que aún falta incorporarlo a una edición editorial verdadera.

## 4. Gestión Estructural de Ediciones (Administrador) ✅
- **[Punto 26] Renombrado:** "Fecha de Publicación" será cambiado a "Fecha de la Edición".
- **[Punto 27] Bloqueo Cronológico:** El sistema incorporará la limitación que impida seleccionar una fecha de edición anterior a la última edición publicada. 
- **[Punto 28] Filtro de Selección de Órdenes:** Al seleccionar publicaciones para incluirlas en una edición, SÓLO se mostrarán en la lista desplegable aquellas solicitudes que tengan estado **"En trámite"**. (Se excluirán "Publicadas", y "Por Verificar").
- **[Punto 30, 32, 34, 35, 39, 40, 41] Proceso de Borrador a Publicación Efectiva:**
  * **Fase 1 (Creación / Borrador Ejecutivo):** Permitimos asignar publicaciones, Fecha, y generar y mostrar el Código de Verificación y el QR en los detalles de la edición temporal, SIN subir todavía el PDF consolidado general. 
  * **Fase 2 (Publicar Edición):** Habrá un apartado de detalles y un botón confirmar de **"Publicar edición"**, requiriendo cargar el PDF. Esto cambiará la Edición de Borrador a pública. Al hacer esto las órdenes anidadas en ella pasarán de "En trámite" a "Publicada", y la edición estará en la calle ("Visor Público").
- **[Punto 33] CEV en Mayúsculas:** El código de verificación prefijará siempre como `DMV-` (todo en mayúsculas).

## 5. Visor Público de Ediciones ✅
- **[Punto 42, 43] Acceso Inmediato:** Al entrar en la vista pública, se instanciará directamente el visor leyendo de la última edición publicada disponible, dejando la lista o historial detrás de un panel de filtro o búsqueda secundario.
- **[Punto 44] Etiquetas CEV:** Se normalizará que muestre claramente "Código de Verificación Electrónica CEV" y el Nro. de edición correlativo.

## 6. Correcciones en Formularios (Paso 1 al 3 y Convocatorias - Punto 45 y Capturas de Pantalla) ✅
* **Paso 1:**
  * Transformación e input automático estricto a **Mayúsculas sostenidas** (e.g. `INVERSIONES MATURIN C.A.`).
  * Inclusiones de dropdown directos para el `Tipo de registrador` (Opciones: Titular / Suplente / Auxiliar).
  * Fijación de longitudes y validadores nativos para forzar estructura: Tomos, Letras y Número <= 3 dígitos o A/B/C/D. Expediente <= números. Año sin sobrepasar el actual. Nro de planilla sin fecha futura de ser posible.
* **Paso 2:**
  * Se simplificará estéticamente el resumen para **ocultar temporalmente** el desglose de IVA y Subtotal en la calculadora en vivo basándonos en la captura, dejando limpio el Total en USD y BS equivalente.
* **Paso 3:**
  * Se alineará el diseño de la derecha (resumen de la orden) como señala la captura de pantalla usando los formatos requeridos.
  * Inputs rigurosos en **Datos bancarios emitidos**: Teléfono de solo 7 dígitos, select manual para prefijo de celular. Referencia anclada e informada para que contenga **exclusivamente 4 dígitos finales**.
  * Se aplicarán paralelos a Convocatorias.

## 📋 Verificación y Preguntas Abiertas

> [!WARNING]
> La refactorización del flujo de las "Ediciones" (Dividirlo en 1. Borrador, y luego pasar al 2. "Publicar Edición") tomará cambios substanciales a la vista `/pages/Ediciones.tsx`. Modificaré los botones y crearé un modal o panel lateral nuevo dentro de esa vista para alojar el "Borrador". 
> 
> **¿Estás de acuerdo con este plan?** Si apruebas, comenzaré a modificar ordenadamente de la sección 1 a la 6.
