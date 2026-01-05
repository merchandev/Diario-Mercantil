# 🔑 Credenciales de Administrador

Según el código fuente (`backend/scripts/seed_users.php` y `add_merchandev_user.php`), estas son las credenciales configuradas:

## 1. Admin Estándar
- **Usuario/Documento:** `V12345678`
- **Contraseña:** `Admin#2025!`

## 2. Admin Desarrollador (Recomendado)
- **Usuario/Documento:** `merchandev`
- **Contraseña:** `G0ku*1896`

---

## ⚠️ ¿No funcionan?

Si ninguna credencial funciona, es probable que la base de datos esté vacía. Necesitas ejecutar el script de creación de usuarios dentro del contenedor.

### Pasos para crear el usuario:

1. **Accede al terminal SSH** de Hostinger.
2. **Ejecuta este comando:**

```bash
docker exec dashboard-backend php scripts/add_merchandev_user.php
```

3. **Intenta loguearte** nuevamente con:
   - Usuario: `merchandev`
   - Clave: `G0ku*1896`

### Alternativa: Reset Completo (Cuidado: Borra datos)
Si prefieres restaurar todo de fábrica (usuarios por defecto + datos de prueba):

```bash
docker exec dashboard-backend php scripts/reset_db.php
```
