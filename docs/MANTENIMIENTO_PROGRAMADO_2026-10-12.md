# Mantenimiento programado

Implementación solicitada el 12 de octubre de 2026. Incluye los ajustes de la versión 2 documentados en IMPLEMENTACION_V1026_2026-10-12.md.

## Uso

1. Abrir la web e introducir la contraseña vigente de una cuenta administrativa activa o de Lotus.
2. El navegador queda autorizado durante cuatro horas exactas desde la validación. No se renueva silenciosamente por consultas ni por navegación.
3. Iniciar sesión normalmente con una cuenta de administrador o cliente. La autorización de mantenimiento no sustituye la autenticación ni cambia permisos.
4. Cerrar sesión y entrar con otra cuenta conserva el acceso de mantenimiento dentro de esas cuatro horas.
5. Administrar el interruptor **Mantenimiento programado** en Dashboard → Configuración o Lotus → Configuración. El cambio se guarda inmediatamente.
6. Al activar desde Configuración, el navegador del administrador recibe acceso de cuatro horas para poder seguir trabajando.
7. Desactivar restablece el acceso público. Reactivar invalida todos los permisos de mantenimiento anteriores.
8. Cambiar la contraseña, suspender, eliminar o retirar el rol administrativo de la cuenta que autorizó el navegador revoca su acceso.
9. Al caducar el permiso se vuelve a pedir la contraseña administrativa, incluso si permanece una sesión ordinaria de usuario.

## Alcance y protección

- La pantalla cubre todas las rutas de la aplicación, incluidos login, Lotus, documentación Swagger y vistas de cliente.
- El backend bloquea las API de contenido, autenticación, operaciones administrativas y documentos/enlaces directos mediante HTTP 503.
- Permanecen disponibles la consulta del estado, la validación de contraseña y las sondas de salud de infraestructura.
- El estado y las respuestas de bloqueo usan Cache-Control: no-store.
- El permiso utiliza cookie Secure, HttpOnly, SameSite=Strict y token aleatorio de 256 bits. Solo se conserva su hash en la base de datos.
- Cinco intentos fallidos por IP en quince minutos; el sexto recibe HTTP 429. Nginx resuelve la IP del visitante únicamente desde el gateway de Traefik (172.30.0.1); no agrupa todos los visitantes bajo la IP del proxy.
- La contraseña es la vigente del administrador, sin nuevas contraseñas compartidas ni cambios en credenciales existentes.
- La interfaz consulta el estado cada treinta segundos al estar visible y al volver a la pestaña. Una API bloqueada oculta el contenido inmediatamente; las consultas públicas comparten el transporte que detecta maintenance_required.
- El cierre ordinario de cuenta por inactividad en la interfaz pasa de una a cuatro horas, para no interrumpir prematuramente el intervalo autorizado.

## Cambios y validación

Migración nueva: 20261012_010_scheduled_maintenance. Crea tablas maintenance_sessions y maintenance_attempts. Los valores maintenance_enabled y maintenance_generation se gestionan exclusivamente mediante el controlador administrativo; los formularios generales no pueden sobrescribirlos accidentalmente.

Validación local:
- PHP: 112 pruebas y 630 aserciones.
- Frontend: 49 pruebas en 16 archivos.
- TypeScript y compilación de producción correctos.
- Navegador: contraseña rechazada/aceptada, todos los contenidos ocultos antes del acceso, interruptor activado/desactivado, pantalla móvil de 390 px sin desbordamiento, sin errores JavaScript.

Respaldo previo en el servidor:
- /docker/backups/diario-mercantil/v1026-20261012/database.sql.gz
- /docker/backups/diario-mercantil/v1026-20261012/storage.tar.gz
- Revisión anterior y copia protegida de la configuración de entorno en esa misma carpeta.

El despliegue actualiza backend y frontend, ejecuta las nuevas migraciones y conserva el servicio de correo y los volúmenes.

El contraste y la resolución de todos los hallazgos están en [CIERRE_V1026_2026-10-12.md](CIERRE_V1026_2026-10-12.md). Los datos institucionales y el QR oficial del banco se completan manualmente en sus campos administrativos.
