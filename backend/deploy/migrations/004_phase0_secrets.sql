-- 004_phase0_secrets.sql
-- Fase 0: Revocación de todos los tokens activos por seguridad
TRUNCATE TABLE auth_tokens;
TRUNCATE TABLE superadmin_tokens;
