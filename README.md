# Sistema de Gestion Digital - Diario Mercantil de Venezuela

Plataforma integral para la gestion, publicacion y verificacion de documentos legales y avisos mercantiles. El sistema automatiza el flujo editorial, desde la solicitud del cliente hasta la publicacion digital y la generacion de ediciones compaginadas.

## Caracteristicas principales

### Gestion de usuarios
- Roles y permisos: sistema jerarquico (SuperAdmin, Administrador, Solicitante).
- Autenticacion segura: sesiones persistentes y cierre automatico por inactividad.

### Publicaciones legales
- Procesamiento de documentos PDF.
- Calculo automatico basado en folios y tasas indexadas (BCV).
- Generacion de ordenes de servicio y recibos en PDF.

### Verificacion y acceso publico
- Validacion QR para verificar autenticidad de publicaciones.
- Ruta publica directa mediante `/ver/{orden}`.

### Ediciones digitales
- Compaginacion y publicacion de la edicion diaria.
- Visor interactivo para las ediciones digitales.

## Stack tecnologico

- Frontend:
  - React 18
  - TypeScript
  - TailwindCSS
  - Vite
- Backend:
  - PHP 8.2
  - PDO
  - FPDF
- Infraestructura:
  - Docker y Docker Compose
  - Nginx
  - MySQL / MariaDB

## Instalacion y despliegue

### Requisitos previos
- Docker y Docker Compose instalados.
- Git.

### Configuracion local

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd diario-mercantil
   ```

2. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```

3. Iniciar los servicios:
   ```bash
   docker compose up -d --build
   ```

4. Acceso:
   - Sitio: `http://localhost` o el dominio configurado en `VIRTUAL_HOST`.
   - API: `http://localhost/api/...`
   - phpMyAdmin: `http://localhost:8080`

## Migracion desde despliegues viejos

Antes del commit `d227c56`, el servicio `frontend` publicaba `80:80` directamente. Desde ese cambio el trafico publico pasa por `nginx-proxy`, y `frontend` queda solo dentro de la red Docker.

Si el VPS todavia intenta levantar `frontend` con `0.0.0.0:80->80/tcp`, estas ejecutando una compose vieja o quedaron contenedores huerfanos del esquema anterior. La secuencia correcta es:

```bash
docker compose down --remove-orphans
docker compose up -d --build --remove-orphans
```

Si despues de eso el sitio sigue caido por nombre de dominio, revisa DNS antes de seguir depurando Docker:

- `diariomercantil.com` y `www.diariomercantil.com` deben resolver a la IP del VPS.
- Los puertos `80` y `443` deben quedar libres para `nginx-proxy`.
- Si los resolvers publicos responden `SERVFAIL`, el problema esta en la zona DNS o en DNSSEC, no en el contenedor.

## Seguridad

- Las credenciales y configuraciones sensibles deben manejarse mediante variables de entorno.
- No se deben versionar secretos reales.
- El sistema incluye logs de auditoria para acciones criticas.

---
© Diario Mercantil de Venezuela - Todos los derechos reservados.
