# Despliegue de DIARIO MERCANTIL en VPS (Hostinger)

Este documento detalla cómo desplegar la aplicación completa (Frontend + Backend) en un VPS Ubuntu utilizando Docker y un Nginx externo (Host Nginx) como proxy reverso.

## 📋 Requisitos Previos

- VPS Ubuntu con Docker y Docker Compose instalados.
- Un servidor Nginx corriendo en el VPS (host) que recibirá el tráfico público (puertos 80/443).
- Acceso SSH al VPS.

## 🚀 Pasos de Despliegue

### 1. Preparar Archivos
Sube los siguientes archivos y carpetas a tu VPS (por ejemplo, a `/var/www/diario-mercantil` o `~/diario-mercantil`):

- `backend/` (código fuente del backend)
- `frontend/` (código fuente del frontend)
- `docker-compose.prod.yml`

*Nota: No subas las carpetas `node_modules` ni `vendor`, se instalarán dentro del contenedor.*

### 2. Configuración de Entorno

1.  Cura el archivo `.env` en `backend/.env`. Puedes usar `backend/.env.example` como base.
2.  Asegúrate de configurar las variables críticas:
    ```ini
    APP_ENV=production
    ADMIN_PASSWORD=TuPasswordSeguro
    # ... otras variables
    ```

### 3. Iniciar Contenedores

Ejecuta el siguiente comando para construir e iniciar los servicios en modo producción:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esto:
1.  Construirá el Backend (PHP-FPM).
2.  Construirá el Frontend (Node build -> Nginx Alpine).
3.  Expondrá el servicio unificado en el puerto **8080** de tu VPS (localhost).

Verifica que estén corriendo:
```bash
docker ps
```
Deberías ver `dashboard-frontend` (puerto 8080) y `dashboard-backend`.

### 4. Configurar Nginx del Host (Proxy Reverso)

Configura tu Nginx principal (el que está instalado directamente en Ubuntu, no el de Docker) para redirigir el tráfico al contenedor.

Edita tu archivo de sitio (ej. `/etc/nginx/sites-available/midominio.com`) y agrega/modifica:

```nginx
server {
    listen 80;
    server_name midominio.com www.midominio.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reinicia Nginx en el host:
```bash
sudo systemctl restart nginx
```

## 🔄 Actualizaciones Futuras

Para desplegar cambios:

1.  Sube los archivos modificados.
2.  Reconstruye los contenedores:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

## 🛠 Troubleshooting

-   **Error 502 Bad Gateway**: Verifica que los contenedores estén corriendo (`docker ps`).
-   **Permisos de Storage**: Si hay errores de escritura, asegúrate de que la carpeta `backend/storage` tenga permisos de escritura (el contenedor `www-data` suele necesitar `chown -R 33:33 backend/storage` o `chmod -R 777 backend/storage` si tienes problemas persistentes).

---
**Arquitectura**:
[Usuario] -> [Host Nginx :80/443] -> [Docker Frontend (Nginx) :8080] -> [Static Files]
                                                                     -> [Proxy /api] -> [Docker Backend (PHP-FPM) :9000]
