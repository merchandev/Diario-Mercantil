# 🔄 Consolidación del Backend

## Fecha: 17 de noviembre de 2025

## Cambios Realizados

### ✅ Eliminación de Backend Duplicado

Se ha consolidado la arquitectura moviendo la refactorización (`backend_new`) al interior de `backend/modern`, de modo que sigue habiendo un solo backend pero conservamos la nueva estructura modular dentro del mismo repositorio.

**Antes:**
- `backend` (puerto 8000) - Backend principal funcional
- `backend_new` (puerto 8080) - Backup/refactor histórico ahora movido dentro de `backend/modern`

**Después:**
- `backend` (puerto 8000) - Backend único consolidado con la refactorización disponible en `backend/modern`

### 📋 Archivos Modificados

1. **docker-compose.yml**
   - Eliminado servicio `backend_new`
   - Mantenido solo `backend` y `frontend`

2. **Contenedores**
   - Eliminado `dashboard-backend-new`
   - Conservado `dashboard-backend`

### 🎯 Beneficios

1. **Simplicidad**: Un solo backend para mantener
2. **Claridad**: Sin confusión sobre qué backend está en uso
3. **Recursos**: Menor consumo de memoria y CPU
4. **Migración**: Más fácil migrar a producción con una arquitectura clara

### 🏗️ Arquitectura Actual

```
Dashboard/
├── backend/              # Backend PHP único
│   ├── src/             # Controladores y lógica
│   ├── public/          # index.php (entry point)
│   ├── storage/         # Base de datos SQLite y uploads
│   └── migrations/      # SQL schema
├── frontend/            # React + Vite + TypeScript
└── docker-compose.yml   # 2 servicios (backend, frontend)
```

### 🔌 Endpoints API

Todos los endpoints siguen funcionando en **http://localhost:8000**:

- `/api/auth/login` - Login
- `/api/auth/me` - Usuario actual
- `/api/legal` - Publicaciones legales (CRUD)
- `/api/legal/{id}/download` - Descargar orden PDF
- `/api/users` - Gestión de usuarios
- `/api/settings` - Configuración
- `/api/rate/bcv` - Tasa BCV
- `/api/editions` - Ediciones
- `/api/payments` - Medios de pago

### 📦 Servicios Docker

```bash
# Ver servicios activos
docker ps

# Logs del backend
docker logs dashboard-backend

# Reiniciar backend
docker-compose restart backend

# Reconstruir desde cero
docker-compose down
docker-compose up -d --build
```

### 🔐 Credenciales por Defecto

**Administrador:**
- Documento: V12345678
- Contraseña: Admin#2025!

**Solicitante de prueba:**
- Documento: J000111222
- Contraseña: Test#2025!

### 📊 Base de Datos

- **Tipo**: SQLite
- **Ubicación**: `backend/storage/database.sqlite`
- **Tablas principales**:
  - `users` - Usuarios del sistema
  - `auth_tokens` - Tokens de sesión
  - `legal_requests` - Solicitudes de publicación
  - `legal_payments` - Pagos reportados
  - `editions` - Ediciones del diario
  - `settings` - Configuración del sistema

### 🚀 Despliegue a Producción

Para desplegar a producción, usar:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Este archivo usa:
- `backend/Dockerfile.prod` - PHP-FPM optimizado
- `frontend/Dockerfile.prod` - Build estático + Nginx

### 📝 Notas

- El directorio `backend/modern/` permanece en el repositorio dentro de `backend/`; alberga la refactorización modular y puede aprovecharse para pruebas o migraciones futuras
- Puede eliminarse en el futuro si no se necesita la arquitectura refactorizada
- Toda la funcionalidad está consolidada en `backend/`

### ✨ Próximos Pasos

1. ✅ Backend consolidado y funcionando
2. ✅ Publicaciones visibles para admin y solicitante
3. ✅ PDF de órdenes de servicio funcionando
4. 🔄 Testear flujo completo de publicación
5. 📋 Documentar casos de uso completos
