# 🌐 Configuración de Dominio merchan.cloud

## ✅ Cambios Realizados

### 1. nginx.conf
```nginx
server {
    listen 80;
    server_name merchan.cloud www.merchan.cloud localhost;
    # Acepta tráfico de merchan.cloud y www.merchan.cloud
}
```

### 2. docker-compose.yml
```yaml
frontend:
  ports:
    - "80:80"  # Puerto HTTP estándar (antes era 8080:80)
```

## 🔧 Configuración DNS Requerida

En tu proveedor de DNS (donde compraste merchan.cloud), configura:

### Registros A
```
Tipo: A
Nombre: @
Valor: 72.61.77.167
TTL: 3600

Tipo: A  
Nombre: www
Valor: 72.61.77.167
TTL: 3600
```

Esto apuntará:
- `merchan.cloud` → `72.61.77.167`
- `www.merchan.cloud` → `72.61.77.167`

## 🚀 Desplegar

```powershell
git add .
git commit -m "feat: configurar dominio merchan.cloud"
git push origin main
```

Luego redesplegar en Hostinger.

## 🌐 Acceso

Después de configurar el DNS (toma entre 5 minutos y 48 horas):
- `http://merchan.cloud`
- `http://www.merchan.cloud`

## 🔒 HTTPS (Opcional pero Recomendado)

Para habilitar HTTPS con certificado SSL gratuito:

### Opción 1: Usar Hostinger SSL
En el panel de Hostinger, habilita SSL automático para tu dominio.

### Opción 2: Configurar Let's Encrypt Manual

Requiere modificar docker-compose.yml para agregar Certbot. Te puedo ayudar con esto si lo necesitas.

## ✅ Verificación

Una vez propagado el DNS:

```bash
# Verificar DNS
nslookup merchan.cloud

# Probar acceso
curl -I http://merchan.cloud

# Verificar en navegador
http://merchan.cloud
```

---

**Tu aplicación estará accesible en merchan.cloud una vez que configures los registros DNS.** 🎉
