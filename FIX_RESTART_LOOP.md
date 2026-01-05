# 🔧 SOLUCIÓN: Loop Infinito de Inicialización

## 🎯 Problema Identificado

Según los logs, el backend está en un ciclo:
```
Starting backend initialization...
Initialization complete. Starting PHP-FPM...
[CRASH y reinicio]
```

**Causa raíz:** CMD mal configurado en Dockerfile - PHP-FPM nunca se ejecuta correctamente.

## ✅ Corrección Aplicada

### backend/Dockerfile.prod
```dockerfile
# ANTES (incorrecto):
ENTRYPOINT ["/bin/sh", "-c", "if [ -f ..."]
CMD ["php-fpm", "-F"]

# DESPUÉS (correcto):
ENTRYPOINT ["/var/www/html/entrypoint.prod.sh"]
CMD ["php-fpm", "-F"]
```

**Por qué funciona:**
- ENTRYPOINT ejecuta el script de inicialización
- El script hace `exec "$@"` que ejecuta el CMD (php-fpm)
- PHP-FPM se inicia correctamente y mantiene el contenedor corriendo

## 🚀 Desplegar

```powershell
git add backend/Dockerfile.prod
git commit -m "fix: corregir CMD para que PHP-FPM inicie correctamente"
git push origin main
```

## 📊 Resultado Esperado

```
Starting backend initialization...
Creating database file...
Initialization complete. Starting PHP-FPM...
[17-Dec-2025 18:40:00] NOTICE: fpm is running, pid 1
[17-Dec-2025 18:40:00] NOTICE: ready to handle connections
```

**El contenedor se mantendrá en estado "Running" sin reinicios.** ✅
