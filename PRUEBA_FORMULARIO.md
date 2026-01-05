# 🧪 Guía para Probar el Formulario de Documentos

## ✅ Correcciones Implementadas

1. **Validación mejorada** - Solo valida campos críticos (razón social, tipo de sociedad, tipo de trámite)
2. **Botón de submit** - Ahora tiene `type="submit"` explícito
3. **Manejo de estado** - `setReq(r)` después de crear solicitud
4. **Logging detallado** - Console.log en cada paso para debugging

## 📝 Pasos para Probar

### 1. Levantar el Sistema

```bash
cd e:\DASHBOARD
docker-compose up
```

### 2. Abrir el Formulario

Navegue a: `http://localhost:5173/dashboard/solicitante/documento`

### 3. Llenar el Paso 1 (Información del Documento)

**Campos mínimos requeridos:**
- ✅ **Razón social** (obligatorio)
- ✅ **Tipo de sociedad** (obligatorio) - Seleccione de la lista
- ✅ **Tipo de trámite** (obligatorio) - Se habilita después de seleccionar sociedad

**Campos opcionales** (puede dejarlos vacíos para prueba rápida):
- Estado
- Registro mercantil
- Registrador
- Tomo, Número, Año
- Expediente, Fecha, Planilla

### 4. Hacer Click en "Continuar"

El botón debería:
1. Mostrar "Guardando..."
2. Crear/actualizar la solicitud en el backend
3. Avanzar automáticamente al **Paso 2**

### 5. Verificar en la Consola del Navegador

Presione `F12` para abrir las DevTools y vaya a la pestaña **Console**.

Debería ver logs como:
```
saveStep1 ejecutado {meta: {...}}
Validaciones pasadas, guardando...
Creando nueva solicitud
Solicitud creada: 123
Avanzando a paso 2
```

### 6. Paso 2 - Subir PDF

1. Arrastre o seleccione un archivo PDF
2. El sistema analizará automáticamente el documento
3. Mostrará: número de folios, precio en USD y Bs.
4. Click en "Continuar al pago →"

### 7. Paso 3 - Datos de Pago

1. Complete los datos personales
2. Seleccione tipo de pago (Pago móvil o Transferencia)
3. Ingrese datos bancarios
4. Acepte términos
5. Click en "Enviar Solicitud"

## 🐛 Troubleshooting

### Problema: El botón "Continuar" no hace nada

**Solución:**
1. Abra la consola del navegador (F12)
2. Verifique si hay errores en rojo
3. Verifique los logs de `saveStep1`
4. Asegúrese de llenar los 3 campos obligatorios

### Problema: Error "Por favor ingrese la razón social"

**Solución:**
- El campo "Razón o denominación social" está vacío
- Ingrese cualquier texto (ej: "Compañía de Prueba C.A.")

### Problema: No aparece la lista de trámites

**Solución:**
- Primero debe seleccionar el "Tipo de sociedad"
- Luego se habilitará automáticamente el selector de "Tipo de trámite"

### Problema: Error al crear solicitud

**Solución:**
1. Verifique que el backend esté corriendo: `http://localhost:8000/api/ping`
2. Verifique que esté logueado (token válido)
3. Revise logs del backend en Docker

## 📊 Verificar en Backend

Para ver las solicitudes creadas:

```bash
# Conectar al contenedor del backend
docker exec -it dashboard-backend sh

# Ver la base de datos
cd /var/www/html
php -r "
\$pdo = new PDO('sqlite:dashboard.db');
\$stmt = \$pdo->query('SELECT id, status, name, pub_type, created_at FROM legal_requests ORDER BY id DESC LIMIT 5');
while(\$row = \$stmt->fetch(PDO::FETCH_ASSOC)) {
  print_r(\$row);
}
"
```

## ✨ Resultado Esperado

Cuando todo funcione correctamente:

1. ✅ Paso 1 → Paso 2 (transición automática)
2. ✅ Paso 2 → Paso 3 (después de subir PDF)
3. ✅ Paso 3 → Confirmación y reset del formulario
4. ✅ Solicitud guardada con status "Por verificar"
5. ✅ Visible en panel de admin para aprobación

## 🔍 Logs Esperados en Consola

```
// Al hacer click en Continuar (Paso 1)
saveStep1 ejecutado {meta: {tipo_sociedad: "Compañía Anónima (C.A.)", ...}}
Validaciones pasadas, guardando...
Creando nueva solicitud
Solicitud creada: 1
Avanzando a paso 2

// Al subir PDF (Paso 2)
Documento analizado: 5 folios detectados

// Al enviar (Paso 3)
¡Solicitud enviada exitosamente! Su documento será verificado...
```
