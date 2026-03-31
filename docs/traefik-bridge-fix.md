# Fix: Routing & SSL — diariomercantil.com

> **Fecha:** 2026-03-31  
> **Entorno:** Hostinger VPS · Docker Compose · Traefik v3 · PHP-FPM · MySQL 8 · Nginx

---

## Resultado Final

| Componente | Estado |
|---|---|
| `https://diariomercantil.com` | ✅ HTTP/2 200 |
| SSL / Let's Encrypt | ✅ Certificado P256 válido |
| Backend API `/api/*` | ✅ Todas las rutas OK |
| Base de datos MySQL | ✅ Conectado y saludable |
| `www.diariomercantil.com` | ⏳ Pendiente — falta CNAME DNS |

---

## 1. Diagnóstico: el Problema Raíz

### Síntomas
- `404 Not Found` en **todas** las rutas de `diariomercantil.com`
- Logs de Traefik inundados con `Failed to inspect container <id>`
- Let's Encrypt no generaba el certificado SSL

### Causa Raíz

**Incompatibilidad de red entre Traefik y los contenedores.**

El Traefik gestionado por Hostinger corre en `network_mode: host`. Esto significa que **no comparte ninguna Docker bridge network** con el resto de los servicios. En Traefik v3, el proveedor Docker necesita poder inspeccionar los contenedores y resolver su IP dentro de una red compartida para registrar las rutas. Al no haber red en común, Traefik fallaba silenciosamente.

```
# Situación ROTA
Internet → Traefik (host network)
                     ↓
             ❌ NO PUEDE VER ❌
                     ↓
         frontend (bridge: app-network)
```

> **Nota:** Los errores `Failed to inspect container` eran de contenedores de deploys **anteriores** ya eliminados — residuo en la cola de eventos Docker. No eran el problema real.

---

## 2. Solución: Patrón traefik-bridge

Se implementó un contenedor **nginx mínimo** (`traefik-bridge`) que actúa como intermediario:

- Corre en `network_mode: host` → mismo espacio de red que Traefik
- Escucha en el **puerto `8091`** del host
- Hace `proxy_pass` al `frontend` usando su **IP fija** (`172.30.0.10`)
- Lleva los **labels de Traefik** (Traefik lo detecta porque comparte su red)

```
# Situación RESUELTA
Internet:443
    ↓
Traefik (host net)          ← descubre traefik-bridge via labels ✅
    ↓ proxy a 127.0.0.1:8091
traefik-bridge (host net)   ← nginx escucha en puerto 8091
    ↓ proxy_pass a 172.30.0.10
frontend (172.30.0.10)      ← IP fija en app-network bridge
    ↓ FastCGI
dm-backend (bridge)
    ↓ TCP 3306
db MySQL (bridge)
```

---

## 3. Archivos Modificados

### `docker-compose.yml`

Cambios clave respecto a la versión anterior:

```yaml
# 1. Subred fija para poder asignar IPs estáticas
networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24

# 2. Frontend: IP fija, sin labels de Traefik, sin port binding
frontend:
  expose:
    - "80"
  networks:
    app-network:
      ipv4_address: 172.30.0.10  # IP fija
  # Sin labels Traefik — ya no los necesita

# 3. NUEVO servicio: traefik-bridge
traefik-bridge:
  image: nginx:alpine
  network_mode: host            # Comparte red con Traefik
  restart: unless-stopped
  depends_on:
    - frontend
  volumes:
    - ./deploy/nginx-host-proxy.conf:/etc/nginx/conf.d/default.conf:ro
  labels:
    - "traefik.enable=true"
    # Router HTTPS
    - "traefik.http.routers.dm.rule=Host(`diariomercantil.com`)"
    - "traefik.http.routers.dm.entrypoints=websecure"
    - "traefik.http.routers.dm.tls=true"
    - "traefik.http.routers.dm.tls.certresolver=letsencrypt"
    - "traefik.http.routers.dm.tls.domains[0].main=diariomercantil.com"
    # Puerto donde escucha este contenedor en el host
    - "traefik.http.services.dm.loadbalancer.server.port=8091"
```

### `deploy/nginx-host-proxy.conf` _(archivo nuevo)_

```nginx
# nginx: puente entre Traefik (host network) y frontend (bridge network)
# Escucha en puerto 8091 del HOST → reenvía al frontend en su IP fija

server {
    listen 8091;
    server_name _;

    location / {
        proxy_pass         http://172.30.0.10;   # IP fija del frontend
        proxy_http_version 1.1;

        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;

        proxy_connect_timeout 10s;
        proxy_read_timeout    30s;
    }
}
```

---

## 4. Resolución del SSL (Let's Encrypt / ACME)

### Problema A — `www` sin registro DNS

```
ERR: DNS problem: NXDOMAIN looking up A for www.diariomercantil.com
```

Let's Encrypt rechaza el certificado **completo** si cualquiera de los dominios solicitados falla. `www.diariomercantil.com` no tiene registro DNS A, por lo que bloqueaba la emisión del cert para el dominio raíz también.

**Fix:** Eliminar `www.diariomercantil.com` de la regla del router hasta que exista el registro DNS.

---

### Problema B — `acme.json` con orden ACME cacheada

Incluso después de corregir el `www`, el certificado no se emitía. Traefik continuaba intentando resumir la **orden ACME fallida anterior** almacenada en `/letsencrypt/acme.json`.

**Diagnóstico:**
```bash
# Encontrar acme.json dentro del contenedor de Traefik
ACE=$(docker exec traefik-ivzc-traefik-1 find / -name "acme.json" 2>/dev/null | head -1)
# → /letsencrypt/acme.json

# Ver contenido (confirma entrada con www incluído)
docker exec traefik-ivzc-traefik-1 cat "$ACE"
```

**Fix:**
```bash
# Limpiar acme.json → forzar orden ACME completamente nueva
docker exec traefik-ivzc-traefik-1 sh -c "echo '{}' > /letsencrypt/acme.json"
docker restart traefik-ivzc-traefik-1

# Verificar éxito ~30 segundos después
docker logs traefik-ivzc-traefik-1 --tail=10 | grep -E "(Register|Obtained|Unable)"
```

**Resultado:**
```
INF Register... providerName=letsencrypt.acme
INF Obtained ACME certificate domains=["diariomercantil.com"]
```

---

## 5. Comandos de Deploy

Desde `/docker/diario-mercantil` en el VPS:

```bash
# Despliegue estándar
git pull && docker compose down && docker compose up -d

# Verificar estado de contenedores
docker compose ps

# Verificar SSL y conectividad
curl -Ik https://diariomercantil.com

# Ver logs de Traefik (cert y enrutamiento)
docker logs traefik-ivzc-traefik-1 --since 5m | grep -E "(Register|Obtained|Unable|Error)"
```

---

## 6. Pendientes

### Activar `www.diariomercantil.com`

**Paso 1 — DNS** (panel Hostinger → Dominios → DNS):
| Campo | Valor |
|---|---|
| Tipo | `CNAME` |
| Nombre | `www` |
| Destino | `diariomercantil.com` |

Esperar propagación (~5-15 min).

**Paso 2 — `docker-compose.yml`**, editar las labels del `traefik-bridge`:
```yaml
# Cambiar:
- "traefik.http.routers.dm.rule=Host(`diariomercantil.com`)"

# Por:
- "traefik.http.routers.dm.rule=Host(`diariomercantil.com`) || Host(`www.diariomercantil.com`)"
- "traefik.http.routers.dm.tls.domains[0].sans=www.diariomercantil.com"
```

**Paso 3 — Desplegar:**
```bash
git add docker-compose.yml && git commit -m "feat: activar www con CNAME DNS configurado"
git push
# En el VPS:
git pull && docker compose up -d
```

### Favicon 404 (cosmético)
Los logs muestran `open() "/usr/share/nginx/html/favicon.ico" failed`. Agregar un favicon al build del frontend o suprimir el error en nginx:
```nginx
location = /favicon.ico { return 204; access_log off; }
```

---

## 7. Arquitectura Final

```
┌──────────────────────────────────────────────────────────────┐
│                       VPS Hostinger                          │
│                                                              │
│  Internet ──► :443 ──► Traefik (host net)                   │
│                              │                              │
│                              ▼ proxy → 127.0.0.1:8091       │
│                    traefik-bridge (host net)                 │
│                    nginx: listen 8091                        │
│                              │                              │
│                              ▼ proxy_pass → 172.30.0.10     │
│               ┌──── app-network (172.30.0.0/24) ────┐       │
│               │                                      │       │
│               │   frontend  172.30.0.10:80           │       │
│               │       │                              │       │
│               │   dm-backend :9000 (PHP-FPM)         │       │
│               │       │                              │       │
│               │   db  :3306 (MySQL 8)                │       │
│               │                                      │       │
│               │   phpmyadmin :8080                   │       │
│               └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```
