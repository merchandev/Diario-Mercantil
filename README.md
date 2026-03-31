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
  - Traefik compartido en Hostinger Docker Manager

## Instalacion y despliegue

### Requisitos previos
- Docker y Docker Compose instalados.
- Git.

### Desarrollo local

Para desarrollo local usa la compose de desarrollo:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### Produccion en Hostinger Docker Manager

La `docker-compose.yml` raiz esta orientada a Hostinger Docker Manager. En ese entorno no debes publicar `80/443` desde este proyecto, porque Hostinger ya ejecuta un Traefik compartido para todos los proyectos.

Antes de desplegar:

1. Despliega el template de Traefik de Hostinger.
2. Verifica que exista la red externa `traefik-proxy`.
3. Configura tu `.env`:

```bash
cp .env.example .env
```

4. Ajusta al menos estas variables:

```bash
APP_HOST=diariomercantil.com
TRAEFIK_NETWORK=traefik-proxy
```

5. Despliega:

```bash
docker compose up -d --build
```

### Acceso

- Sitio: `https://diariomercantil.com`
- API: `https://diariomercantil.com/api/...`
- phpMyAdmin: `http://<VPS_IP>:8080`

## Nota importante para Hostinger

Si el proyecto queda en `Partially running` con `nginx-proxy` en estado `Created`, la compose anterior era incorrecta para Hostinger: intentaba bindear `80/443` aunque esos puertos ya pertenecen al Traefik compartido del VPS.

El modelo correcto es:

- Hostinger Traefik escucha en `80/443`.
- Este proyecto solo publica labels Traefik en el `frontend`.
- El `frontend` se conecta a la red externa `traefik-proxy`.
- El `backend` no debe exponerse con un puerto publico; solo atiende a `frontend` por la red Docker.
- Las labels Traefik del `frontend` deben mantenerse simples y usar nombres de router/service alfanumericos.

## DNS

Aunque el proyecto arranque correctamente en Docker, el dominio no funcionara si:

- `diariomercantil.com` no resuelve hacia la IP del VPS.
- Si luego quieres publicar `www`, crea primero el registro DNS y solo despues agregalo a las labels Traefik.
- Los resolvers publicos devuelven `SERVFAIL`, lo que suele indicar zona DNS rota o problema de DNSSEC.

## Seguridad

- Las credenciales y configuraciones sensibles deben manejarse mediante variables de entorno.
- No se deben versionar secretos reales.
- El sistema incluye logs de auditoria para acciones criticas.

---
© Diario Mercantil de Venezuela - Todos los derechos reservados.
