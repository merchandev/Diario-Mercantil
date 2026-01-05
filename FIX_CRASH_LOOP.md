# 🔧 Solución: Backend en Crash Loop

## 🎯 Problema Identificado

Los logs muestran que el backend:
1. ✅ Inicia correctamente
2. ✅ Crea la base de datos
3. ✅ Inicia PHP-FPM
4. ❌ **Luego crashea y reinicia**

**Causa:** El entrypoint script ejecutaba `exec "$@"` esperando argumentos CMD, pero PHP-FPM no se mantenía en foreground correctamente.

## ✅ Solución Aplicada

### backend/entrypoint.prod.sh
```bash
# Antes (incorrecto):
exec "$@"

# Ahora (correcto):
exec php-fpm -F -R
```

**Flags importantes:**
- `-F`: Foreground mode (NO demonio)
- `-R`: Allow run as root (necesario en contenedores)

### backend/Dockerfile.prod
```dockerfile
# Antes:
ENTRYPOINT ["/var/www/html/entrypoint.prod.sh"]
CMD ["php-fpm", "-F"]

# Ahora:
CMD ["/var/www/html/entrypoint.prod.sh"]
```

## 🚀 Para Desplegar

```powershell
git add .
git commit -m "fix: prevenir crash loop en backend - php-fpm en foreground"
git push origin main
```

## 📊 Resultado Esperado

**ANTES (crasheando):**
```
Starting backend initialization...
Initialization complete. Starting PHP-FPM...
[CRASH - reinicio]
Starting backend initialization...
```

**DESPUÉS (estable):**
```
Starting backend initialization...
Creating database file...
Initialization complete. Starting PHP-FPM...
NOTICE: fpm is running, pid 1
NOTICE: ready to handle connections
[MANTIENE CORRIENDO SIN REINICIAR]
```

## 🔍 Verificar Después del Despliegue

```bash
# Ver logs - NO deberían repetirse "Starting backend initialization"
docker logs dashboard-backend --tail 20 -f

# Verificar que NO se reinicia constantemente
docker ps
# Debe mostrar "Up X minutes" (sin reinicios)

# Probar acceso
curl http://localhost:3000
curl http://localhost
```

---

**Esta corrección evitará que el contenedor se reinicie constantemente.** 🎯
