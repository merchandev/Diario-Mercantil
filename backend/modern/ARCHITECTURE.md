# Nueva Arquitectura Backend

## Objetivos
- Seguridad (JWT con expiración, validación sistemática).
- Mantenibilidad (capas claras: Controller -> Service -> Repository).
- Observabilidad (logging estructurado, health endpoint, futura métrica).
- Extensibilidad (DI para agregar servicios como cache, mail, etc.).

## Stack Elegido
- **Routing**: nikic/fast-route.
- **DI**: php-di.
- **Config/Env**: vlucas/phpdotenv.
- **Auth**: firebase/php-jwt (HS256, TTL configurable).
- **Validación**: respect/validation.
- **Logging**: monolog.
- **UUID**: ramsey/uuid para identificadores en nuevas tablas.

## Capas
- `src/Core`: utilidades framework (Env, Router, Response, futuros Middlewares).
- `src/Controllers`: lógica HTTP fina (parseo input mínimo, delega a services).
- `src/Services`: lógica de negocio (reglas, transformaciones, autorizaciones). 
- `src/Repositories`: acceso a datos (queries PDO, luego migrable a otro motor).

## Flujo Request
1. index.php carga rutas y bootstrap.
2. Router resuelve handler (Controller@method).
3. Controller valida input superficial y llama Service.
4. Service usa Repository, aplica reglas, retorna DTO/array.
5. Controller envía respuesta JSON uniforme.

## Autenticación
- Login recibe documento + password.
- Se emite JWT (`sub`, `role`, `iat`, `exp`).
- Endpoints protegidos validan Bearer y pasan payload al Service.
- Refresh futuro: endpoint dedicado (no implementado aún).

## Próximos Pasos
1. Integrar DI en Router para instanciar controllers vía container.
2. Añadir middleware de auth genérico y manejo global de errores.
3. Migrar LegalController a nuevo esquema (Service + Repository + DTOs).
4. Implementar validadores centralizados.
5. Tests PHPUnit para AuthService y flujo de login.

## Compatibilidad
- Se mantiene acceso a la misma base SQLite (`DB_PATH`).
- Frontend podrá cambiar a nuevo endpoint de login sin romper (misma ruta pero diferente token formateado). Token actual del frontend deberá adaptarse a nuevo `me` que ya responde igual estructura `user`.

## Consideraciones
- Gestión de tokens antigua (tabla `auth_tokens`) podrá deprecándose gradualmente.
- Para entornos con múltiples pods se deberá rotar secreto JWT y agregar lista de revocación si hace falta.

