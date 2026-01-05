# Configurar merchan.cloud para Docker en Hostinger

## Pasos Rápidos

1. **Configura DNS** (en tu proveedor de dominios):
   - Tipo A: `@` → `72.61.77.167`
   - Tipo A: `www` → `72.61.77.167`

2. **Despliega** los cambios:
   ```powershell
   git add .
   git commit -m "feat: configurar dominio merchan.cloud"
   git push origin main
   ```

3. **Espera** propagación DNS (5 min - 48 horas)

4. **Accede** a: `http://merchan.cloud`

Ya está configurado en nginx y docker-compose para usar puerto 80 estándar.
