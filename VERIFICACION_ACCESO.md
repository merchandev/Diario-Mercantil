# 🔧 Verificación de Accesibilidad Externa

## ✅ Estado Actual de Configuración

### 1. Puertos Expuestos (docker-compose.yml)
```yaml
frontend:
  ports:
    - "80:80"  ✅ Correcto - Puerto HTTP estándar
```

### 2. Nginx Escuchando (nginx.conf)
```nginx
server {
    listen 80;  # Escucha en todas las interfaces (0.0.0.0:80)
    server_name merchan.cloud www.merchan.cloud localhost;
}
```
✅ **Correcto** - Por defecto nginx escucha en `0.0.0.0:80`

### 3. Red Docker
```yaml
networks:
  app-network:
    driver: bridge
```
✅ **Correcto** - Permite comunicación entre contenedores

## 🔍 Comandos de Verificación en Hostinger

### Verificar que contenedores están corriendo
```bash
docker ps
# Debe mostrar dashboard-backend y dashboard-frontend "Up"
```

### Verificar puertos expuestos
```bash
docker port dashboard-frontend
# Debe mostrar: 80/tcp -> 0.0.0.0:80
```

### Probar acceso local desde el VPS
```bash
# Desde dentro del VPS
curl -I http://localhost
# Debe devolver: HTTP/1.1 200 OK

# Probar conexión backend
docker exec dashboard-frontend curl -I http://backend:9000
```

### Verificar nginx está escuchando
```bash
docker exec dashboard-frontend netstat -tuln | grep :80
# Debe mostrar: tcp 0 0 0.0.0.0:80 0.0.0.0:* LISTEN
```

## 🛡️ Firewall en Hostinger VPS

Hostinger maneja el firewall automáticamente, pero para verificar:

### Opción 1: Panel de Hostinger
1. Ve a **VPS** → **Firewall**
2. Asegúrate que el puerto **80** esté permitido
3. Si no está, agrégalo:
   - Puerto: `80`
   - Protocolo: `TCP`
   - Fuente: `0.0.0.0/0` (todos)

### Opción 2: SSH al VPS
```bash
# Ver reglas del firewall
sudo ufw status

# Si está activo, permitir puerto 80
sudo ufw allow 80/tcp

# O con iptables
sudo iptables -L -n | grep 80
```

## 🌐 DNS y Acceso

### Verificar DNS (desde tu PC local)
```bash
nslookup merchan.cloud
# Debe resolver a: 72.61.77.167
```

### Verificar conectividad (desde tu PC local)
```bash
# Ping al servidor
ping 72.61.77.167

# Telnet al puerto 80
telnet 72.61.77.167 80

# Curl directo
curl -I http://72.61.77.167
```

## 🔧 Soluciones por Problema

### Si curl local funciona pero externo no:
**Causa:** Firewall bloqueando
**Solución:** Configurar firewall en Hostinger para permitir puerto 80

### Si curl local falla:
**Causa:** Nginx no está corriendo correctamente
**Solución:** Verificar logs
```bash
docker logs dashboard-frontend --tail 100
```

### Si puertos no están mapeados:
**Causa:** Docker no expuso el puerto
**Solución:** Ya está configurado correctamente en docker-compose.yml

### Si servicio escucha solo en localhost:
**Causa:** Configuración incorrecta de bind
**Solución:** Nginx ya está configurado para escuchar en `0.0.0.0:80`

## 📋 Checklist de Verificación

- [x] Puerto 80 mapeado en docker-compose.yml
- [x] Nginx escucha en 0.0.0.0 (por defecto)
- [x] server_name incluye merchan.cloud
- [ ] Firewall permite puerto 80 (verificar en Hostinger)
- [ ] DNS apunta a 72.61.77.167 (configurar si aún no)
- [ ] Acceso funciona desde navegador

## 🚀 Comando de Verificación Rápida

Ejecuta esto en el terminal de Hostinger:

```bash
#!/bin/bash
echo "=== Verificación de Configuración ==="
echo ""
echo "1. Contenedores corriendo:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "2. Puerto 80 expuesto:"
docker port dashboard-frontend
echo ""
echo "3. Nginx escuchando:"
docker exec dashboard-frontend netstat -tuln | grep :80 || echo "netstat no disponible, probando curl..."
docker exec dashboard-frontend curl -I -s http://localhost | head -n1
echo ""
echo "4. Conexión al backend:"
docker exec dashboard-frontend curl -I -s http://backend:9000 | head -n1
echo ""
echo "=== Fin de verificación ==="
```

---

**Tu configuración Docker es correcta. Si aún no puedes acceder, el problema está en:**
1. **Firewall** del VPS (verificar en panel de Hostinger)
2. **DNS** no configurado o no propagado
3. **Acceso** a través de la URL incorrecta (debe ser por dominio o IP directa, no IP:puerto)
