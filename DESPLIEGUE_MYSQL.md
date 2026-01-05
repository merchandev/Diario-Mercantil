# 🐬 Despliegue con MySQL y phpMyAdmin

Esta actualización migra el backend de SQLite a MySQL 8.0 e integra phpMyAdmin para la gestión visual.

## 🚀 Instrucciones de Despliegue

### 1. Actualizar Código
```powershell
git add .
git commit -m "feat: migrar a mysql y organizar archivos"
git push origin main
```

### 2. Desplegar en Hostinger
Al hacer push, Hostinger debería reconstruir los contenedores.

### 3. Inicializar Base de Datos (OBLIGATORIO)

#### Opción A: Vía phpMyAdmin (Recomendado)
1. Accede a: `http://72.61.77.167:8081`
   - **User:** `mercantil_user`
   - **Pass:** `secure_password_2025`
2. Pestaña **SQL** -> Pega contenido de `init.sql`.

#### Opción B: Usuarios Adicionales
Para crear el usuario `espressivove`:
1. En phpMyAdmin, pestaña SQL.
2. Ejecuta:
   ```sql
   CREATE USER IF NOT EXISTS 'espressivove'@'%' IDENTIFIED BY 'G0ku*1896';
   GRANT ALL PRIVILEGES ON diario_mercantil.* TO 'espressivove'@'%';
   FLUSH PRIVILEGES;
   ```

---

## 🛠 Credenciales

### Principal
- **User:** `mercantil_user`
- **Pass:** `secure_password_2025`

### Secundario (Nuevo)
- **User:** `espressivove`
- **Pass:** `G0ku*1896`
