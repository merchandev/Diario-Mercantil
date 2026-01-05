# 🚫 Solución: ERR_CONNECTION_RESET

El error `ERR_CONNECTION_RESET` a pesar de que los contenedores están funcionando significa casi siempre una cosa: **Bloqueo por Firewall Externo**.

## 1. El Firewall de Hostinger (Panel de Control)

No basta con configurar `ufw` dentro del VPS. Hostinger tiene un firewall externo que bloquea todo por defecto.

1. Entra a **hpanel.hostinger.com**
2. Ve a la sección **VPS**
3. Selecciona tu servidor
4. Busca la pestaña **"Security"** o **"Firewall"** (en el menú lateral izquierdo)
5. **Crear Nueva Regla de Firewall**:

| Campo | Valor |
|-------|-------|
| **Name** | HTTP Access |
| **Protocol** | TCP |
| **Port** | 80 |
| **Source IP** | 0.0.0.0/0 |

*Repite para el puerto 3000 si quieres acceso a la API desde fuera.*

## 2. Verificación de Nginx

He actualizado la configuración de Nginx para ser más permisiva y aceptar cualquier conexión (IP o dominio):

```nginx
listen 80 default_server;
server_name _;
```

## 3. Comandos para Aplicar

```powershell
git add .
git commit -m "fix: asegurar que nginx acepte trafico por IP"
git push origin main
```

Después del despliegue:
1. Verifica el Firewall de Hostinger (Paso 1)
2. Prueba acceder: http://72.61.77.167
