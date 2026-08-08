# Walkthrough: Estabilización y Auditoría del Diario Mercantil

Se ha ejecutado exitosamente el plan de estabilización abordando la arquitectura, base de datos, seguridad, validaciones, concurrencia y despliegue del proyecto.

## Resumen de Tareas Completadas

### 1. Bloqueo de Arranque y Seguridad Inmediata
- **Migración 003 de Auth (`20260808_003_auth_schema_reconciliation.php`)**: Se crearon de manera idempotente las tablas faltantes (`sessions`, `password_resets`, `audit_logs`).
- **Suspensión Automática**: En la migración se incorporó el bloqueo inmediato de la cuenta superadmin por defecto (V-00000000) si sigue existiendo y no ha cambiado su contraseña.
- **Readiness Probe (`bin/readiness.php`)**: Actualizado para verificar la existencia de las tablas de autenticación y abortar el despliegue de manera limpia si las migraciones no han completado.
- **Utilidad CLI (`bin/create-superadmin.php`)**: Script por línea de comandos para la creación segura de superadmins, requiriendo contraseña y role correcto.

### 2. Endurecimiento de Autenticación
- **Políticas de Contraseña**: Se integró `PasswordPolicy.php` para exigir y validar contraseñas robustas (mínimo 12 caracteres, mayúscula, número, especial) en el registro y en el reseteo de contraseñas.
- **Frontend Validaciones**: Añadida la regla constante en `utils/passwordPolicy.ts` y aplicada en el formulario de Registro (`Register.tsx`) y Gestión de Usuarios (`Usuarios.tsx`).

### 3. Concurrencia y Transacciones
- **Seguridad en Transacciones**: Modificados `AuthController::register` y `AuthController::resetPassword` con bloques atómicos (`BEGIN`, `COMMIT`, `ROLLBACK`) y bloqueos `SELECT ... FOR UPDATE` para evitar condiciones de carrera (Race conditions).
- **Revocación de Sesiones**: Añadida lógica al cambiar contraseña para vaciar los tokens de autenticación existentes y prevenir el secuestro prolongado de la cuenta.

### 4. Corrección de Endpoints y Contratos (Errores 404)
Se expusieron y aliasaron los siguientes endpoints solicitados por el frontend que estaban marcando 404:
- `POST /api/superadmin/logout` 
- `PUT /api/admin/users/{id}` (adminUpdate)
- `POST /api/editions/{id}/auto-select` (Selección de solicitudes "En trámite")
- `POST /api/settings` (alias a `SystemController::saveSettings`)
- `POST /api/stats/clear` (Método vacío resolviendo contrato frontend)
- `POST /api/files/{id}/retry` (Reintento de indexación de archivos)
- `GET /api/p/{slug}` (Alias de vista pública de páginas)

### 5. Proceso Legal y Validación de Estados
- **`LegalSubmissionValidator`**: Reglas estrictas antes de pasar solicitudes de "Borrador" a "Por verificar" (Documento RIF, PDFs obligatorios, Folios > 0, Total Bs existiendo).
- **Verificación Atómica de Pagos**: El estado "Por verificar" a "En trámite" bloquea tanto la solicitud como los pagos (`FOR UPDATE`) asegurando que el estado del pago cambie atómicamente a "Aprobado".

### 6. Consistencia en Dashboard y Finanzas
- **Estadísticas (`SystemController::getStats`)**: Modificado para extraer correctamente los cálculos base (`subtotal_usd` y `iva_usd`) desde `legal_requests`, dado que `legal_payments` sólo guarda `amount_bs`. 
- **PaymentStatus**: Estandarizados los estados ('Por verificar', 'En trámite', 'Publicada', 'Rechazada', 'Cancelada').

### 7. Simplificación de Arquitectura (Docker)
- **Eliminación del Bridge (`traefik-bridge`)**: Removido del `docker-compose.yml`. Las etiquetas se movieron a `frontend` para enrutar el tráfico externo (puerto 80) directamente al contenedor React/Nginx.

## Próximos Pasos (Validación Manual)
Te recomiendo desplegar los cambios o subirlos a producción y ejecutar las siguientes pruebas:
1. `docker compose up -d --build` para asegurar que todo el pipeline inicia sin errores.
2. Registra un usuario de prueba en el frontend para confirmar que se exigen 12 caracteres.
3. Envía una solicitud legal ("Borrador" → "Por verificar") para observar que requiere un PDF adjunto.
4. Aprueba un pago desde la tabla de pagos del administrador y comprueba en base de datos si ambos (`legal_requests` y `legal_payments`) actualizaron su status atómicamente.
