# 🚀 Configuración Final - Puertos Expuestos Explícitamente

![Configuración Sugerida](file:///C:/Users/merch/.gemini/antigravity/brain/f7fef519-e133-4800-88d5-0ae0ba503460/uploaded_image_1766013914055.png)

## ✅ Implementado Según la Guía

### docker-compose.yml
```yaml
backend:
  ports:
    - "9000:9000"  # Puerto PHP-FPM

frontend:
  ports:
    - "8080:80"    # Puerto HTTP (usando 8080 para evitar conflictos)
```

### nginx.conf
```nginx
fastcgi_pass backend:9000;  # Vuelto a nombre de contenedor (bridge network)
```

## 🌐 Acceso

### Por IP del VPS
```
http://72.61.77.167:8080
```

### Por Dominio (después de DNS)
```
http://merchan.cloud:8080
```

## 🔥 Configurar Firewall en Hostinger

**IMPORTANTE:** Debes permitir el puerto 8080 en el firewall:

### Opción 1: Panel de Hostinger

1. Ve a **VPS** → **Firewall** o **Security**
2. Agrega regla:
   - **Puerto:** `8080`
   - **Protocolo:** `TCP`
   - **Fuente:** `0.0.0.0/0` (todos)
   - **Acción:** `Permitir`

### Opción 2: SSH al VPS

```bash
# Con UFW
sudo ufw allow 8080/tcp
sudo ufw allow 9000/tcp  # Por si acaso
sudo ufw reload

# Con iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
sudo iptables-save
```

## 🚀 Pasos de Despliegue

1. **Commit y push:**
```powershell
git add .
git commit -m "feat: exponer puertos 8080 y 9000 explícitamente"
git push origin main
```

2. **Configurar firewall** en Hostinger (ver arriba)

3. **Redesplegar** en Hostinger Docker Manager

4. **Acceder:**
```
http://72.61.77.167:8080
```

## 📊 Puertos Usados

| Servicio | Puerto Interno | Puerto Externo | URL |
|----------|---------------|----------------|-----|
| Frontend (Nginx) | 80 | 8080 | http://72.61.77.167:8080 |
| Backend (PHP-FPM) | 9000 | 9000 | Interno solamente |

## 🔍 Verificar Después del Despliegue

```bash
# Verificar puertos expuestos
docker port dashboard-frontend
docker port dashboard-backend

# Probar localmente desde el VPS
curl http://localhost:8080

# Verificar firewall
sudo ufw status | grep 8080
```

---

## ⚠️ Si Aún No Funciona

1. **Verifica firewall:** `sudo ufw status`
2. **Verifica puertos:** `docker ps`
3. **Prueba otro puerto:** Cambiar 8080 por 3000 o 5000
4. **Contacta soporte** de Hostinger para verificar restricciones de puertos

---

**Con esta configuración estándar y el firewall configurado, debería funcionar.** 🎯
