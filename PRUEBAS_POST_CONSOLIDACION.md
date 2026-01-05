# 🧪 Pruebas Post-Consolidación

## ✅ Sistema Consolidado - Verificación Final

### 📋 Checklist de Verificación

#### 1. Servicios Docker
- [x] Solo 2 contenedores activos (backend + frontend)
- [x] Backend en puerto 8000 (healthy)
- [x] Frontend en puerto 5173 (healthy)
- [x] Backend-new eliminado

#### 2. Backend API
- [x] Base de datos preservada (18 publicaciones)
- [x] Admin puede ver todas las publicaciones
- [x] Solicitante ve solo sus publicaciones
- [x] Lógica de filtrado mejorada

#### 3. Frontend
- [x] Parámetros undefined corregidos
- [x] Logs de depuración agregados
- [x] Conexión con backend funcionando

---

## 🔍 Pruebas Manuales Recomendadas

### Prueba 1: Login como Administrador

1. Abrir navegador en `http://localhost:5173/login`
2. Ingresar credenciales:
   - Usuario: `V12345678`
   - Password: `Admin#2025!`
3. Hacer clic en "Iniciar sesión"
4. Verificar redirección a `/dashboard`

**Resultado esperado**: Login exitoso, dashboard visible

### Prueba 2: Ver Publicaciones como Admin

1. Desde el dashboard, ir a "Publicaciones"
2. Abrir consola del navegador (F12)
3. Verificar logs en consola:
   ```
   🔄 [Publicaciones Admin] Recargando lista de publicaciones...
   🔍 [Publicaciones Admin] Filtros: {q: "", status: "Todos", ...}
   🔑 [Publicaciones Admin] Token presente: true
   📤 [Publicaciones Admin] Enviando request con filtros: {...}
   🌐 [API] listLegal request URL: /api/legal
   🌐 [API] listLegal response status: 200
   ✅ [Publicaciones Admin] Cargadas: 18 publicaciones
   ```

**Resultado esperado**: 
- Ver tabla con 18 publicaciones
- Mezcla de user_id 1 y 2
- Estados variados (Por verificar, Borrador, Publicada, etc.)

### Prueba 3: Filtrar por Estado

1. En Publicaciones, seleccionar filtro "Por verificar"
2. Hacer clic en "Filtrar"
3. Verificar que se muestran solo publicaciones con estado "Por verificar"

**Resultado esperado**: ~8 publicaciones filtradas

### Prueba 4: Cerrar Sesión y Login como Solicitante

1. Hacer clic en "Salir"
2. Login con credenciales de solicitante:
   - Usuario: `J000111222`
   - Password: `Test#2025!`
3. Verificar redirección a `/solicitante/historial`

**Resultado esperado**: Login exitoso, vista de solicitante

### Prueba 5: Ver Publicaciones como Solicitante

1. En "Mis publicaciones", verificar la tabla
2. Abrir consola del navegador
3. Verificar logs similares pero con filtrado por user_id

**Resultado esperado**: 
- Ver solo 13 publicaciones (user_id=2)
- NO ver las 5 publicaciones del admin (user_id=1)

### Prueba 6: Descargar Orden de Servicio

1. En cualquier publicación, hacer clic en "Descargar"
2. Verificar que se descarga un archivo PDF
3. Abrir el PDF y verificar:
   - Encabezado "ORDEN DE SERVICIO"
   - Color vinotinto (#8B1538)
   - Datos de la publicación
   - Tabla con información

**Resultado esperado**: PDF generado correctamente con diseño profesional

### Prueba 7: Crear Nueva Publicación

1. Como solicitante, hacer clic en "Nueva Publicación"
2. Seleccionar "Documento"
3. Completar el formulario multi-paso
4. Verificar que al finalizar:
   - Se crea la publicación
   - Aparece en "Mis publicaciones"
   - Estado inicial es "Por verificar"

**Resultado esperado**: Flujo completo funcional

---

## 🔧 Comandos de Diagnóstico

### Ver logs del backend en tiempo real
```bash
docker logs dashboard-backend --follow
```

### Verificar base de datos
```bash
# Contar publicaciones
docker exec dashboard-backend php /var/www/html/scripts/test_admin_list.php

# Contar usuarios
docker exec dashboard-backend sqlite3 /var/www/html/storage/database.sqlite "SELECT COUNT(*) FROM users"
```

### Reiniciar servicios
```bash
# Solo backend
docker-compose restart backend

# Todo el stack
docker-compose restart
```

### Ver estado de salud
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 🐛 Troubleshooting

### Problema: "No se encontraron publicaciones"

**Síntomas**: La tabla de publicaciones está vacía

**Soluciones**:
1. Verificar token en consola del navegador:
   ```javascript
   localStorage.getItem('token')
   // o
   sessionStorage.getItem('token')
   ```

2. Verificar logs del backend:
   ```bash
   docker logs dashboard-backend --tail 50
   ```

3. Reiniciar sesión (logout + login)

### Problema: "Error 401 Unauthorized"

**Síntomas**: Peticiones API fallan con 401

**Soluciones**:
1. Limpiar storage del navegador:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
2. Hacer login nuevamente

### Problema: Backend no responde

**Síntomas**: Peticiones timeout o fallan

**Soluciones**:
```bash
# Verificar que el contenedor está corriendo
docker ps

# Ver logs de error
docker logs dashboard-backend --tail 100

# Reiniciar backend
docker-compose restart backend
```

### Problema: "undefined" en filtros

**Síntomas**: URL muestra `/api/legal?req_from=undefined`

**Solución**: Ya está corregido en `api.ts`. Si persiste:
1. Limpiar cache del navegador (Ctrl + Shift + R)
2. Verificar que el frontend se recargó con los cambios

---

## ✅ Checklist de Producción

Antes de desplegar a producción:

- [ ] Cambiar contraseña del admin
- [ ] Configurar variables de entorno en `.env`
- [ ] Configurar backup de `storage/database.sqlite`
- [ ] Configurar SSL/HTTPS en Nginx
- [ ] Testear con datos reales
- [ ] Configurar logs persistentes
- [ ] Monitoreo de recursos (CPU, RAM, disco)
- [ ] Plan de respaldo y recuperación

---

**Documento creado el 17 de noviembre de 2025**
**Sistema consolidado y listo para pruebas**
