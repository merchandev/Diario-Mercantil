# 🧪 Prueba de Flujo de Publicaciones

## Estado Actual
✅ **Backend**: Filtra correctamente por `user_id` para solicitantes
✅ **Frontend Solicitante**: Muestra publicaciones propias en `/solicitante/historial`
✅ **Frontend Admin**: Muestra todas las publicaciones en `/dashboard/publicaciones`
✅ **Navegación**: Corregida para redirigir a `/solicitante/historial` después de crear publicación

## 📋 Pruebas a Realizar

### Prueba 1: Solicitante - Ver Publicaciones Existentes
1. Abrir navegador en `http://localhost:5173/login`
2. Hacer login con:
   - Usuario: `J000111222`
   - Contraseña: `Test#2025!`
3. ✅ Verificar redirección a `/solicitante/historial`
4. ✅ Debe mostrar **9 publicaciones** del usuario solicitante
5. Verificar estados visibles:
   - Borrador (2)
   - Por verificar (4)
   - En trámite (1)
   - Publicada (2)

### Prueba 2: Solicitante - Crear Nueva Publicación
1. En `/solicitante/historial`, hacer clic en "Nueva Publicación"
2. Completar formulario de documento:
   - Subir PDF de prueba
   - Completar datos del solicitante
   - Reportar pago
3. ✅ Al enviar, debe redirigir a `/solicitante/historial`
4. ✅ La nueva publicación debe aparecer en la lista con estado "Por verificar"
5. El contador de publicaciones debe incrementar

### Prueba 3: Admin - Ver Todas las Publicaciones
1. Cerrar sesión del solicitante
2. Hacer login como admin:
   - Usuario: `V12345678`
   - Contraseña: `Admin#2025!`
3. ✅ Verificar redirección a `/dashboard`
4. Ir a "Publicaciones" en el menú
5. ✅ Debe mostrar **TODAS las publicaciones** (14+ registros)
6. Verificar que se ven tanto las del admin como las del solicitante

### Prueba 4: Admin - Gestionar Estados
1. En `/dashboard/publicaciones`, seleccionar una publicación "Por verificar"
2. Hacer clic en "Detalles"
3. Cambiar estado a "En trámite"
4. ✅ Verificar que el cambio se refleja en la lista
5. Cerrar sesión y hacer login como solicitante
6. ✅ Verificar que el nuevo estado se muestra en `/solicitante/historial`

## 🔍 Verificaciones en Consola del Navegador

### Para Solicitante (`/solicitante/historial`)
Debes ver:
```
🔄 [Historial Solicitante] Iniciando carga con opciones: undefined
🔍 [Historial Solicitante] URL actual: /solicitante/historial
✅ [Historial Solicitante] Datos cargados: 9 publicaciones
📋 [Historial Solicitante] Primeros 3 registros: [...]
```

### Para Admin (`/dashboard/publicaciones`)
Debes ver:
```
🔄 [Publicaciones Admin] Recargando lista de publicaciones...
✅ [Publicaciones Admin] Cargadas: 14 publicaciones
📋 [Publicaciones Admin] Primeras 3: [...]
```

## 🐛 Solución de Problemas

### Problema: El historial aparece vacío
**Solución**: 
1. Abrir DevTools (F12) → Console
2. Verificar que no hay errores 401 (token inválido)
3. Si hay error 401, hacer logout y login nuevamente
4. Verificar que la URL sea correcta (`/solicitante/historial` para solicitantes)

### Problema: No se ve la nueva publicación después de crearla
**Solución**:
1. Verificar en la consola que aparece "Por verificar" como estado
2. Recargar la página manualmente (F5)
3. Verificar en backend con: `docker exec dashboard-backend php scripts/test_legal_list.php`

### Problema: Admin no ve todas las publicaciones
**Solución**:
1. Verificar que el rol del usuario es "admin" (no "solicitante")
2. Verificar en DevTools → Console los logs de carga
3. Verificar en backend logs: `docker logs dashboard-backend --tail 50`

## ✅ Resultado Esperado

- ✅ Solicitante ve solo SUS publicaciones (9 registros)
- ✅ Admin ve TODAS las publicaciones (14+ registros)
- ✅ Crear nueva publicación funciona y se muestra inmediatamente
- ✅ Cambios de estado por admin se reflejan para solicitante
- ✅ Navegación correcta después de crear publicación (`/solicitante/historial`)
