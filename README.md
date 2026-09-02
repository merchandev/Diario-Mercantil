# Diario Mercantil de Venezuela — Sistema de Gestión Digital

Plataforma integral para la gestión, publicación y verificación de documentos legales y avisos mercantiles. El sistema automatiza el flujo editorial completo: desde la solicitud del cliente hasta la publicación digital, la generación de ediciones compaginadas y la consulta pública con código QR.

---

## ✨ Características principales

### 🔐 Autenticación y usuarios
- Sistema de roles jerárquico: **SuperAdmin > Administrador > Solicitante**.
- Registro instantáneo con auto-login (sin esperas por correo).
- Sesiones seguras con tokens, cierre automático por inactividad.
- Recuperación de contraseña por correo.
- Login por cédula/RIF **o** correo electrónico.
- Suspensión y restauración de cuentas.
- **Eliminación de usuarios**: soft-delete (marcado como inactivo) para Administradores; hard-delete permanente para SuperAdmins.
- Subida y gestión de avatar de usuario.

### 📄 Solicitudes legales
- Flujo completo: Borrador → Enviada → Verificada → En Edición → Publicada.
- Cálculo automático de montos basado en folios, tasa BCV y porcentaje de IVA.
- Scraper automático de la tasa BCV vía DolarAPI como fuente alternativa.
- Carga de documentos en PDF (voucher de pago + documento legal).
- Generación de órdenes de servicio y recibos en PDF (FPDF).
- Historial de pagos por solicitud.

### 📰 Ediciones digitales
- Compaginación y publicación de la edición diaria.
- Visor de PDF interactivo integrado (modo página).
- Visor de tipo Flipbook/revista digital.
- Ediciones accesibles al público sin necesidad de iniciar sesión.

### ✅ Verificación pública
- Validación de autenticidad mediante código QR.
- Ruta pública directa `/ver/{orden}` para consultar cualquier publicación.
- Visor público de ediciones accesible desde `/edicion/{code}`.

### 🖼️ Galería de medios
- Gestión centralizada de archivos del sistema.
- Subida, previsualización y eliminación de archivos.

### 🏛️ Directorio legal
- Perfiles de abogados/profesionales con foto e información de contacto.
- Gestión de áreas de práctica y colegios de abogados.
- Flujo de aprobación por parte del administrador.

### 📰 CMS de publicaciones
- Creación y edición de publicaciones tipo blog/noticias.
- Páginas estáticas editables (CMS).

### ⚙️ Panel de administración
- Dashboard con métricas y actividad reciente.
- Gestión completa de solicitudes, ediciones, usuarios, publicaciones y medios.
- Configuración de tasa BCV, precio por folio e IVA.
- Log de auditoría completo con IP de cada acción crítica.
- Actividad del sistema en tiempo real.

---

## 🛠️ Stack tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite |
| **Backend** | PHP 8.2, PDO (MySQL), FPDF, Slim-like router propio |
| **Base de datos** | MySQL 8.0 con migraciones versionadas |
| **Infraestructura** | Docker, Docker Compose, Nginx, Traefik / Caddy |
| **Servidor** | VPS Hostinger con 2GB Swap configurado |

---

## 🚀 Instalación y despliegue

### Requisitos previos
- Docker y Docker Compose instalados.
- Git.
- `.env` configurado (ver `.env.example`).

### Desarrollo local

```bash
git clone https://github.com/merchandev/Diario-Mercantil.git
cd Diario-Mercantil
cp .env.example .env
# Editar .env con las credenciales locales
docker compose -f docker-compose.dev.yml up -d --build
```

Acceso local: `http://localhost:5173`

---

### Producción en VPS (con Traefik de Hostinger)

La `docker-compose.yml` raíz está orientada a Hostinger Docker Manager con Traefik compartido.

1. Despliega el template de Traefik de Hostinger.
2. Verifica que exista la red externa `traefik-proxy`.
3. Configura tu `.env`:

```bash
APP_HOST=diariomercantil.com
TRAEFIK_NETWORK=traefik-proxy
DB_DATABASE=diario_db
DB_USERNAME=diario_user
DB_PASSWORD=tu_password_seguro
```

4. Despliega:

```bash
docker compose up -d --build
```

---

### Producción sin Traefik (variante Caddy)

Si el Traefik compartido de Hostinger no enruta correctamente:

1. Detén el proyecto Traefik de Hostinger para liberar los puertos `80/443`.
2. Configura `.env`:

```bash
APP_HOST=diariomercantil.com
ACME_EMAIL=admin@diariomercantil.com
```

3. Despliega con Caddy (gestiona TLS automáticamente):

```bash
docker compose -f docker-compose.caddy.yml up -d --build
```

---

### Actualización limpia en el servidor

```bash
cd /docker/diario-mercantil/

# 1. Descartar cambios locales y bajar última versión
git reset --hard
git pull origin main

# 2. Reconstruir sin caché
docker compose build --no-cache

# 3. Recrear contenedores
docker compose up -d --force-recreate

# 4. Limpiar caché e imágenes sin uso (no afecta volúmenes/datos)
docker system prune -f
```

---

## 📁 Estructura del proyecto

```
Diario-Mercantil/
├── backend/                  # API PHP 8.2
│   ├── src/                  # Controladores, modelos, servicios
│   ├── database/
│   │   └── migrations/       # Migraciones versionadas de BD
│   └── Dockerfile.prod
├── frontend/                 # App React + TypeScript
│   ├── src/
│   │   ├── pages/            # Vistas del sistema
│   │   ├── components/       # Componentes reutilizables
│   │   └── lib/              # API client, hooks, utilidades
│   └── Dockerfile.prod
├── docker-compose.yml        # Producción (Traefik Hostinger)
├── docker-compose.dev.yml    # Desarrollo local
├── docker-compose.caddy.yml  # Producción (Caddy/autocontenido)
└── .env.example
```

---

## 🌐 URLs de acceso

| Entorno | URL |
|---|---|
| Sitio público | `https://diariomercantil.com` |
| API backend | `https://diariomercantil.com/api/...` |
| Verificación pública | `https://diariomercantil.com/ver/{orden}` |
| Edición digital pública | `https://diariomercantil.com/edicion/{code}` |
| phpMyAdmin (dev) | `http://<VPS_IP>:8080` |

---

## 🔒 Seguridad

- Credenciales y configuraciones sensibles manejadas exclusivamente mediante variables de entorno (`.env`).
- No se versionan secretos reales en el repositorio.
- Tokens de sesión con expiración automática.
- Log de auditoría completo (actor, acción, recurso, IP, before/after) en tabla `audit_logs`.
- Protección CSRF en todas las rutas de escritura del admin.
- Política de contraseñas con hash bcrypt.

---

## 📋 Migraciones de base de datos

Las migraciones se ejecutan automáticamente al iniciar el backend. Se encuentran en `backend/database/migrations/` ordenadas por timestamp. Para ejecutarlas manualmente:

```bash
docker compose exec backend php migrate.php
```

---

## 📝 Changelog reciente

- **v2026.08.13** — Hard delete para SuperAdmin, soft delete para Admin. Usuarios eliminados ocultos de la lista.
- **v2026.08.12** — Registro instantáneo con auto-login. Corrección de cálculo en ediciones. Visor de PDF y Flipbook funcionales. Botón de cuadrícula eliminado de visores.
- **v2026.08.11** — Login por email, edición de perfil admin, log de actividad con IP real. Corrección scraper BCV.
- **v2026.08.10** — Estabilización de pagos y persistencia de PDFs. Precio por folio actualizado.

Puedes consultar el registro completo de cambios técnicos en el **[Historial de Commits](historial.md)**.

---

© Diario Mercantil de Venezuela — Todos los derechos reservados.

**Desarrollo e ingeniería de software propiedad de Merchan.Dev y Epressivo Venezuela, C.A.**  
Todos los derechos de propiedad intelectual e industrial sobre el código fuente, bases de datos, flujos de trabajo y arquitectura están reservados. Queda estrictamente prohibida la reproducción, modificación, copia, distribución, comercialización, ingeniería inversa, plagio o cualquier uso no autorizado, total o parcial, de los elementos desarrollados en este proyecto sin consentimiento previo, expreso y por escrito de los autores. Toda infracción será sujeta a las acciones civiles y penales correspondientes.
