# Historial de Commits - Diario Mercantil

* **2026-09-01 15:38:29** - feat: completa administracion de banners por pagina (33d8895) - *merchandev*
* **2026-09-01 10:08:04** - fix: fuerza borrado de publicaciones y ediciones (b300dc6) - *merchandev*
* **2026-09-01 09:28:20** - chore: conserva directorio seguro de uploads (2937c7f) - *merchandev*
* **2026-09-01 09:26:34** - fix: valida ├¡ndices de migraci├│n en MySQL (c547893) - *merchandev*
* **2026-09-01 09:23:56** - fix: permite republicar solicitudes y administra QR bancario (c029688) - *merchandev*
* **2026-08-31 20:07:04** - ci: instala herramientas de inspecci├│n PDF (3b55872) - *merchandev*
* **2026-08-31 19:56:33** - Corrige descargas, filtros y actualizaci├│n BCV (e8311c3) - *merchandev*
* **2026-08-31 18:30:26** - Corrige configuraci├│n de datos bancarios (5a37854) - *merchandev*
* **2026-08-31 15:40:33** - fix: recuperar ediciones retiradas y habilitar banners (30f0818) - *merchandev*
* **2026-08-31 08:14:02** - fix: normalizar fechas heredadas de configuraci├│n (999f3d5) - *merchandev*
* **2026-08-31 07:55:38** - fix: separar PDFs por solicitud y restaurar configuraci├│n (0946f8d) - *merchandev*
* **2026-08-29 18:53:40** - fix(migrations): preserve edition audit migration checksum (1a98997) - *merchandev*
* **2026-08-29 18:51:10** - fix(migrations): restore applied migration checksum (01721ed) - *merchandev*
* **2026-08-29 18:34:27** - Merge PR #1: correcciones finales Diario Mercantil (21206da) - *Merchan.dev*
* **2026-08-29 18:31:52** - ci: seed required settings with timestamps (b212a7d) - *merchandev*
* **2026-08-29 18:29:18** - merge: reconcile final corrections with origin main (690a631) - *merchandev*
* **2026-08-29 18:10:38** - test: complete final audit regression suite (80c5780) - *merchandev*
* **2026-08-29 18:10:32** - chore: replace native dialogs and remove temporary artifacts (dabef08) - *merchandev*
* **2026-08-29 18:10:20** - fix: harden sessions events timezone and media (559a3c7) - *merchandev*
* **2026-08-29 18:10:11** - fix: connect legal directory and pages APIs (8aec3f2) - *merchandev*
* **2026-08-29 18:10:05** - fix: consolidate edition public URL and legacy redirects (6135162) - *merchandev*
* **2026-08-29 18:09:59** - fix: finalize legal payment and order report flow (b4847e5) - *merchandev*
* **2026-08-29 16:57:28** - fix: restore shared Venezuela banks constant (4fcabb3) - *merchandev*
* **2026-08-29 15:22:33** - chore: sincronizar mejoras finales desde DM CORRECCIONES (04298b0) - *merchandev*
* **2026-08-29 11:37:56** - feat: complete user profile UX, localize timestamps, and fix remaining P3 items (0457c07) - *merchandev*
* **2026-08-29 11:31:10** - chore: fix issues raised in review round 2 (2698bb2) - *merchandev*
* **2026-08-14 13:40:07** - feat(ui): add Gestor Paginas link to Sidebar (e621511) - *AI Bot*
* **2026-08-14 13:00:19** - ci(backend): use actual PHP migration script for schema setup in tests (b1363c8) - *AI Bot*
* **2026-08-14 10:35:18** - ci: fix pipeline failures (npm ci lockfile sync and missing bcmath extension) (d6d57d8) - *AI Bot*
* **2026-08-14 09:59:20** - Fix OOM by compiling sequentially (-j1) (ca16b45) - *AI Bot*
* **2026-08-14 09:39:07** - Fix PDF generation and missing upload/avatar directories (8328292) - *AI Bot*
* **2026-08-14 09:36:32** - fix(cms): correct public pages endpoint mapping (f75885f) - *AI Bot*
* **2026-08-13 10:29:02** - fix(cms): add missing admin routes for PagesController (af83567) - *merchandev*
* **2026-08-13 10:18:19** - style(seo): remove 'Yoast' from title (f3ace8f) - *merchandev*
* **2026-08-13 09:47:30** - feat(seo): show predefined routes in SeoManager to guide the user (170402b) - *merchandev*
* **2026-08-13 08:42:05** - fix(docker): change npm ci to npm install in prod build to avoid lockfile issues (755db08) - *merchandev*
* **2026-08-13 08:34:04** - feat(superadmin): add Paginas and Seo to dashboard (f45af76) - *merchandev*
* **2026-08-13 08:28:57** - fix(superadmin): add SEO manager to lotus dashboard (5970a88) - *merchandev*
* **2026-08-13 08:20:20** - feat(seo): implement Yoast-style SEO manager and dynamic metadata (4bfc0f8) - *merchandev*
* **2026-08-12 23:09:46** - docs: update README with full feature list, stack, deployment and changelog (8b33ad8) - *merchandev*
* **2026-08-12 22:49:59** - fix(backend): hard delete for superadmins, soft delete for admins (c0d3772) - *merchandev*
* **2026-08-12 22:43:16** - fix(backend): exclude deleted users from user list (403f497) - *merchandev*
* **2026-08-12 22:33:52** - fix(all): resolve registration hang, remove grid button, update padding UI, fix API auth (98af6df) - *merchandev*
* **2026-08-12 21:25:21** - fix(frontend): Update hardcoded PDF URLs to include /code/ path (15a4993) - *merchandev*
* **2026-08-12 21:20:28** - fix(backend): Fix PDF URL in Editions API and add error logging to publish (f6e2f3a) - *merchandev*
* **2026-08-12 21:08:24** - fix(backend): Add missing audit columns to editions for publish feature and fix TypeError (f9ea188) - *merchandev*
* **2026-08-12 21:01:08** - fix(backend): Rename order_id to legal_request_id in edition_orders table (5e279cc) - *merchandev*
* **2026-08-12 20:50:39** - fix(backend): Convert idempotency migration to callable (2523322) - *merchandev*
* **2026-08-12 20:44:20** - fix(backend): Add idempotency_keys migration, fix LegalController 500 errors, and fix FileController CORS for PDF Viewer and Medios (833f3d0) - *merchandev*
* **2026-08-12 20:17:30** - fix: add www.diariomercantil.com to traefik router rules (9b21afd) - *merchandev*
* **2026-08-12 19:47:32** - fix: resolve blank page caching issues in SPA and PHP deprecation notices (11f1bc9) - *merchandev*
* **2026-08-12 19:35:03** - ci: fix duplicate key error in settings setup (5f13fcc) - *merchandev*
* **2026-08-12 19:26:59** - test: fix calc values after price change (34f4fbf) - *merchandev*
* **2026-08-12 19:23:25** - fix: actualizar precio por folio predeterminado a 3.0 (7b4b7ec) - *merchandev*
* **2026-08-12 19:16:02** - fix: scraper de BCV actualizado para usar DolarAPI debido a errores en web de bcv (fed1093) - *merchandev*
* **2026-08-12 19:07:20** - feat: login con email, edicion de perfil de admin y log real de actividad con IP (d6c99f6) - *merchandev*
* **2026-08-12 18:50:55** - chore: test automated push capabilities (33bae59) - *merchandev*
* **2026-08-12 18:34:49** - Fix permisos de admin, corregir error en borrado de roles y script de reinicio de usuarios (35286a7) - *merchandev*
* **2026-08-08 23:08:31** - fix: resolve CI failures by adding total_bs to frontend type and fixing backend test assertion (ffe340e) - *merchandev*
* **2026-08-08 19:31:52** - fix: implement final stabilization plan for payments and PDF persistence (8c36041) - *merchandev*
* **2026-08-08 16:26:28** - fix: reducir el timeout de smtp a 5 segundos para que no se quede colgado enviando (e7a9b7f) - *merchandev*
* **2026-08-08 16:12:24** - fix(backend): add missing submitted_at and verification_date to legal_requests table (4e873a6) - *merchandev*
* **2026-08-08 15:33:52** - fix(backend): select all fields in LegalRequestStateMachine so validator receives name (ac269ad) - *merchandev*
* **2026-08-08 14:04:41** - fix(migrations): insert default settings for price_per_folio_usd and iva_percent if missing (8bead37) - *merchandev*
* **2026-08-08 13:15:22** - fix: implement stabilization plan (phases 7 to 10) - legal submission validation, atomic payments, traefik removal, and missing API endpoints (3bcabd2) - *merchandev*
* **2026-08-08 13:09:24** - fix: implement stabilization plan (phases 1 to 6) - auth schema, password policies, transactions, and unified endpoints (b684a94) - *merchandev*
* **2026-08-08 11:45:16** - fix(backend): convert entrypoint.sh CRLF to LF in Dockerfile (ba2b301) - *merchandev*
* **2026-08-08 11:41:12** - fix(backend): include composer autoloader in index.php to load PHPMailer (a398a29) - *merchandev*
* **2026-08-08 11:30:48** - fix(backend): defer composer classmap generation to after copying source code (fa60ddc) - *merchandev*
* **2026-08-08 11:22:44** - fix(backend): update composer.lock with phpmailer to fix docker build error (78732f5) - *merchandev*
* **2026-08-08 11:16:12** - fix(frontend): handle password change errors in UI and update validation to 12 chars (4932fb2) - *merchandev*
* **2026-08-08 10:32:24** - fix(tests): resolve MySQL incompatibilities in integration tests (3ec56c0) - *merchandev*
* **2026-08-08 09:59:57** - fix(db): add automated initialization and superadmin seed (d3fe2ee) - *merchandev*
* **2026-08-07 17:37:38** - feat(documents): implement full document processing pipeline repair as per audit (ab36ee3) - *merchandev*
* **2026-08-07 17:28:42** - fix: auth tests fallando y compilacion frontend fallando. Corregidos endpoints y sqlite compatibility. (b259d44) - *merchandev*
* **2026-08-07 17:14:59** - fix: schema missing tables, superadmin auth, publications endpoint (81e2e49) - *merchandev*
* **2026-07-29 21:36:05** - Actualizaciones generales y mejoras de seguridad (978fd8f) - *merchandev*
* **2026-07-29 20:22:15** - fix(frontend): remove legacy getToken logic (3a0c4a8) - *merchandev*
* **2026-07-29 20:09:46** - feat: add migration orchestrator (313d94f) - *merchandev*
* **2026-07-29 20:06:26** - fix(security): resolve blockers from static audit (38d219b) - *merchandev*
* **2026-07-29 19:33:02** - fix(solicitante): reemplazar listPayments por listPaymentMethods en paginas de solicitante - 403 causaba crash en Documento, Convocatoria y MediosPagoInfo (56e23bc) - *merchandev*
* **2026-07-29 19:15:53** - fix(prod): corregir 9 fallos identificados en logs de produccion (42cf1c8) - *merchandev*
* **2026-07-21 12:33:16** - Fix MySQL syntax in fix_users_pages.sql (1b5a2a9) - *merchandev*
* **2026-07-21 12:24:48** - Make GET /api/settings public to fix frontend redirect loop (35a78e3) - *merchandev*
* **2026-07-21 12:17:31** - Fix frontend healthcheck, restore legal_payments table, guard missing user fields, and harden nginx configuration (d02f9d0) - *merchandev*
* **2026-07-21 12:09:16** - Sync repository and ensure all schema patches are pushed (9c50583) - *merchandev*
* **2026-07-21 12:08:48** - Fix users and pages table schemas (1889d10) - *merchandev*
* **2026-07-13 11:25:17** - Forced commit from user request (0c98472) - *merchandev*
* **2026-07-13 10:58:36** - Fix verify route and add missing tables (2a52adf) - *merchandev*
* **2026-07-13 10:50:13** - Add fix_hashes script (0bc7d52) - *merchandev*
* **2026-07-13 10:49:39** - Fix superadmin route and login method (12b3bb3) - *merchandev*
* **2026-07-13 10:45:17** - chore: actualizaci├│n general del proyecto y correcciones (0d33480) - *merchandev*
* **2026-07-13 09:45:30** - Change composer install to composer update in Dockerfile.prod (9a7ef07) - *merchandev*
* **2026-07-13 09:15:29** - Fix HttpException properties access in index.php (605e7fc) - *merchandev*
* **2026-07-13 08:48:28** - fix(backend): add global exception handler to index.php to catch HttpException and return JSON (2b60a96) - *merchandev*
* **2026-07-13 07:43:25** - fix(backend): fix FileController bearerToken and EditionController pdf download (6016569) - *merchandev*
* **2026-07-13 07:37:57** - fix(backend): remove deleted_at references from UserController for users table (1f0d562) - *merchandev*
* **2026-07-13 07:31:56** - fix(backend): remove deleted_at from login and requireAuth (1de210e) - *merchandev*
* **2026-07-13 07:30:46** - fix(backend): return exact email error message for debugging (866d6ef) - *merchandev*
* **2026-07-13 07:23:47** - feat(frontend): allow password recovery by cedula or name (061d83d) - *merchandev*
* **2026-07-13 07:22:25** - fix(backend): install composer dependencies in prod build (47fdea4) - *merchandev*
* **2026-07-13 07:14:50** - fix(backend): remove deleted_at check from users table since the column does not exist (b58ed17) - *merchandev*
* **2026-07-13 07:03:51** - fix(frontend): replace apiRequest with fetchAuth in password recovery pages (0afcdc0) - *merchandev*
* **2026-07-13 07:02:14** - fix(frontend): remove card dependency from forgot/reset password pages (c2b11d3) - *merchandev*
* **2026-07-13 06:50:55** - chore: add migration script (e653350) - *merchandev*
* **2026-07-13 06:43:18** - fix(csp/auth): allow google fonts in CSP and fix 500 error on expired auth sessions (b825092) - *merchandev*
* **2026-07-13 06:29:24** - feat(email): complete email notification system using PHPMailer for 6 events and password recovery (11c9bf9) - *merchandev*
* **2026-07-13 06:01:12** - fix(frontend): robust HttpOnly auth context resolution after registration (30a4291) - *merchandev*
* **2026-07-13 05:51:52** - fix(db): correct user_id foreign key type mismatch in phase6 and phase8 migrations (3c62293) - *merchandev*
* **2026-07-12 20:54:36** - fix(tests): replace db-specific unix_timestamp with php time() for cross-db compatibility in tests (57eb390) - *merchandev*
* **2026-07-12 20:38:05** - feat: Implement 10/10 Audit hardenings and architecture refactors (Sessions, CSRF, Declarative Router, bcmath) (6a14881) - *merchandev*
* **2026-07-12 17:30:32** - fix: Phase 5 security fixes and CI pipeline correction (58784ab) - *merchandev*
* **2026-07-12 17:02:19** - feat: Fase 4 - Implementaci├│n completa de validaciones estrictas y pruebas automatizadas (4b51077) - *merchandev*
* **2026-07-12 16:38:14** - fix: Syntax error in PublicacionDetalle.tsx causing CI failure (5ef1bdd) - *merchandev*
* **2026-07-12 16:35:00** - Correcci├│n P1: Esquema de DB, CMS Pages, snapshot financiero en legal_requests y limpieza (380b655) - *merchandev*
* **2026-07-12 16:33:20** - Correcci├│n P0: Cierre de Auth, FileController, EditionController, LegalController y PublicationService (d0a584b) - *merchandev*
* **2026-07-12 16:22:48** - Confirmaci├│n de estabilizaci├│n de Plan Maestro (76df64c) - *merchandev*
* **2026-07-12 16:22:07** - Fase 6: Monitorizacion, Backups y Rate Limiting (8219dde) - *merchandev*
* **2026-07-12 16:21:23** - Fase 5: Servicio de colas y worker asincrono (1e69f3f) - *merchandev*
* **2026-07-12 16:21:01** - Fase 4: Unificaci├│n a PHP 8.4 (30b7a6d) - *merchandev*
* **2026-07-12 16:20:41** - Fase 3: Documentaci├│n interactiva de API con Swagger UI (335ff33) - *merchandev*
* **2026-07-12 16:19:14** - Fase 2: Health checks profundos (liveness y readiness) (d6c054f) - *merchandev*
* **2026-07-12 16:18:44** - Fase 1: Implementar headers de seguridad CSP y HSTS (4097a81) - *merchandev*
* **2026-07-12 16:18:00** - Fase 0: Eliminar secretos de archivos rastreados y revocar tokens (9ccbe8f) - *merchandev*
* **2026-07-12 16:15:18** - Endurecimiento P0-P5: Fix vulnerabilities, RBAC y maquina de estados (966cfcc) - *merchandev*
* **2026-07-12 16:07:28** - chore: agregar security headers y actualizar a PHP 8.4 (bd93697) - *merchandev*
* **2026-07-12 15:59:06** - feat: completar plan maestro de endurecimiento y seguridad (P0-P5) (0e1282f) - *merchandev*
* **2026-07-12 15:34:21** - security: stop tracking environment file (91dd5e8) - *merchandev*
* **2026-07-12 15:23:13** - fix: autorizaci├│n e IDOR en UserController, y saneamiento en AuthController (1386778) - *merchandev*
* **2026-07-12 15:12:08** - fix: contenci├│n P0 de seguridad (remoci├│n de credenciales, endpoints de emergencia y artefactos) (fb52520) - *merchandev*
* **2026-07-12 14:58:39** - feat: refactorizaci├│n a servicios, pruebas automatizadas y CI/CD (c7dc00c) - *merchandev*
* **2026-03-31 23:25:12** - chore: update from local files, refactor workflow and views (1dc3f80) - *merchandev*
* **2026-03-31 18:52:22** - fix: replace sliced page flip with solid 3D card rotation to prevent Chromium tearing bugs (8ebec71) - *merchandev*
* **2026-03-31 18:45:30** - hotfix: simplify CSS box-shadow to prevent Chromium 3D clipping bugs (222fbb4) - *merchandev*
* **2026-03-31 18:32:32** - fix: encoding en PublicacionDetalle, dise├▒o del visor PDF y ruta DELETE en la papelera (13c7eb3) - *merchandev*
* **2026-03-31 18:17:20** - docs: agrega documentacion completa del fix traefik-bridge y SSL ACME (223c807) - *merchandev*
* **2026-03-31 16:44:27** - fix: quitar www del cert (sin DNS A record) - solo diariomercantil.com hasta agregar CNAME en DNS (bf67911) - *merchandev*
* **2026-03-31 16:40:46** - fix: traefik-bridge pattern - nginx en host network como intermediario entre Traefik y frontend (87d9905) - *merchandev*
* **2026-03-31 16:24:27** - fix: agregar traefik.docker.network - Traefik corre en host network y necesita IP expl├¡cita del contenedor (8a38ab5) - *merchandev*
* **2026-03-31 16:16:47** - fix: eliminar router dm_http que conflictuaba con redirect global de Traefik (06eac2b) - *merchandev*
* **2026-03-31 15:59:44** - fix: vincular routers dm_main/dm_www al servicio dm_service, separar HTTP/HTTPS (bb8aaa0) - *merchandev*
* **2026-03-31 14:51:58** - fix(deploy): isolate frontend to single network for Traefik discovery and split routers (73ab34c) - *merchandev*
* **2026-03-31 14:50:09** - fix(deploy): restore network constraint and service mapping for Traefik discovery (6a89131) - *merchandev*
* **2026-03-31 14:49:05** - fix(deploy): extreme simplification of traefik labels for discovery (f3a0e41) - *merchandev*
* **2026-03-31 14:47:41** - fix(deploy): use ultra-compatible traefik labels with explicit service mapping (ddbedec) - *merchandev*
* **2026-03-31 14:42:59** - fix(deploy): final routing strategy with priority 100000 and escaped backticks (18f854d) - *merchandev*
* **2026-03-31 14:39:50** - fix(deploy): set container names and simplify network for Traefik forced discovery (48ed06e) - *merchandev*
* **2026-03-31 14:35:07** - fix(deploy): finalize traefik-proxy network for both backend and frontend for maximum visibility (a533aa9) - *merchandev*
* **2026-03-31 14:32:30** - fix(deploy): use single quotes in Traefik labels and add explicit TLS domains (359d934) - *merchandev*
* **2026-03-31 14:30:26** - fix(deploy): use short router name and explicit entrypoints for traefik final cleaned configuration (5784c25) - *merchandev*
* **2026-03-31 14:28:45** - fix(deploy): reconnect to traefik-proxy network for final routing fix (8571178) - *merchandev*
* **2026-03-31 14:26:43** - fix(deploy): use correct project-prefixed network name for traefik routing final fix (63caaa8) - *merchandev*
* **2026-03-31 14:23:52** - fix(deploy): use explicit docker network label for traefik routing final fix (a136342) - *merchandev*
* **2026-03-31 14:21:28** - fix(deploy): use new router name and websecure entrypoint for traefik final fix (5b8bb3c) - *merchandev*
* **2026-03-31 14:17:14** - fix(deploy): use single quotes and explicit entrypoints for traefik routing (72860a6) - *merchandev*
* **2026-03-31 14:08:27** - fix(deploy): use host mode compatible traefik labels and remove external networks (04bf9d7) - *merchandev*
* **2026-03-31 14:05:48** - fix(deploy): inject priority and explicit service link for traefik (53c3521) - *merchandev*
* **2026-03-31 13:59:57** - fix(deploy): simplify traefik labels and use hardcoded domain names (dd84c84) - *merchandev*
* **2026-03-31 13:57:49** - fix(deploy): correct traefik network name to 'traefik-proxy' (c4b57f5) - *merchandev*
* **2026-03-31 13:55:51** - fix(deploy): use correct traefik network 'traefik-ivzc_default' and enable SSL labels (f05d5ee) - *merchandev*
* **2026-03-31 13:37:59** - feat(deploy): bind frontend port 8081 and add HTTP web Traefik router (7de4a33) - *merchandev*
* **2026-03-31 13:30:44** - fix(deploy): improve Traefik routing rules and MySQL healthcheck (a3a6340) - *merchandev*
* **2026-03-31 11:47:41** - feat(deploy): add self-managed caddy fallback (2495278) - *merchandev*
* **2026-03-31 11:02:53** - fix(traefik): normalize router and service labels (e2ef221) - *merchandev*
* **2026-03-31 10:55:22** - fix(traefik): simplify hostinger router labels (7862121) - *merchandev*
* **2026-03-31 09:38:53** - fix(hostinger): route frontend through shared traefik (9f5c5af) - *merchandev*
* **2026-03-31 07:38:09** - fix(deploy): align production scripts with nginx-proxy (cb5e97b) - *merchandev*
* **2026-03-30 22:03:01** - feat: ajustes finales de auditor├¡a pascos 1 y 3 (c75b21b) - *merchandev*
* **2026-03-30 20:24:49** - Update from local files (d227c56) - *merchandev*
* **2026-03-04 17:49:44** - fix(flipbook): ensure embedded optical engine downscales proportionally when given a strict vertical height constraint to prevent overflow in admin dashboards (27112e6) - *merchandev*
* **2026-03-04 17:40:54** - fix(flipbook): decouple mobile and desktop spread max bounds to prevent mobile from freezing midway through the book (1ccf725) - *merchandev*
* **2026-03-04 17:33:57** - fix(backend): patch emergencyFix sql migration to include missing content column on pages table (12c906a) - *merchandev*
* **2026-03-04 17:26:57** - fix(flipbook): remove slice background and enforce strict absolute image dimensions (3387205) - *merchandev*
* **2026-03-04 17:19:23** - style(flipbook): make pagination controls responsive and fix mobile top margin clearance (139be1c) - *merchandev*
* **2026-03-04 17:16:04** - style(flipbook): remove top right DIARIO MERCANTIL PDF badge (3fbe01e) - *merchandev*
* **2026-03-04 17:14:31** - feat(flipbook): enable 3D folding animation and pointer drag interactions on mobile devices (1c9035c) - *merchandev*
* **2026-03-04 17:09:21** - style(flipbook): increase top margin for clearance and remove center 3px page gap separator (87b49fe) - *merchandev*
* **2026-03-04 17:03:49** - style(flipbook): add top margin to book container to clear top-left UI buttons (e846e62) - *merchandev*
* **2026-03-04 17:00:01** - feat(flipbook): redesign corner curl indicator and implement seamless optical gradient shading (bad5e9f) - *merchandev*
* **2026-03-04 16:51:49** - fix(flipbook): resolve backface texture mapping tearing and Z-fighting in 8-segment fold (9f57087) - *merchandev*
* **2026-03-04 16:46:05** - fix(flipbook): resolve subpixel slice gaps and geometry inversions during page flip (d962abd) - *merchandev*
* **2026-03-04 16:40:04** - fix(flipbook): anchored spine cylinder fold with exaggerated page curvature (e921b4a) - *merchandev*
* **2026-03-04 16:32:25** - fix(flipbook): replace geometry physics with flawless optical shading technique to guarantee smooth 60fps single-plane page flips without rendering seams or distortion (525b554) - *merchandev*
* **2026-03-04 16:23:49** - fix(flipbook): replace flat rotated plane with 5-segment curving cylinder fold (c963788) - *merchandev*
* **2026-03-04 15:46:01** - fix(flipbook): stable 3D rotation geometry to prevent page distortion during corner peel (ae9b008) - *merchandev*
* **2026-03-04 15:30:33** - fix: remove skewY distortion - corner peel via transformOrigin only (2462f0d) - *merchandev*
* **2026-03-04 15:22:25** - feat: corner-peel drag fold - esquinas interactivas tipo revista (1e4c886) - *merchandev*
* **2026-03-04 15:01:53** - fix: revert to single-segment with perspective(700px) + skewY for book curl effect (8ca4ff6) - *merchandev*
* **2026-03-04 14:56:46** - feat: doblez de pagina real - 3 segmentos en cascada tipo revista (1ed6d1e) - *merchandev*
* **2026-03-04 14:48:37** - fix: folios nunca transparentes - fondo blanco explicito en ambas caras + sombra sin() (5f0c065) - *merchandev*
* **2026-03-04 14:42:24** - fix: grid navega al spread correcto + jumpTo prop en FlipEngine (c31d50f) - *merchandev*
* **2026-03-04 14:36:08** - feat: doblez de pagina realista tipo libro con 2 segmentos CSS 3D (299cbb9) - *merchandev*
* **2026-03-04 14:28:10** - feat: rediseno grid overlay 4 columnas (457a598) - *merchandev*
* **2026-03-04 14:25:33** - feat: paginas solas centradas + animacion doblez mejorada (12303a9) - *merchandev*
* **2026-03-04 14:20:29** - fix: animacion 3D correcta + drag para pasar paginas (f69c892) - *merchandev*
* **2026-03-04 14:04:34** - fix: botones navegacion flipbook + redise├▒o visor (aa506c3) - *merchandev*
* **2026-03-04 13:47:23** - fix: stable FoldingPage module-level component + cover page on first spread (61175d8) - *merchandev*
* **2026-03-04 13:36:37** - feat: custom CSS 3D flip engine - realistic page turns with backface, perspective, shadow, corner peel, mouse tilt (2debef5) - *merchandev*
* **2026-03-03 22:47:40** - fix: remove ::after overlay and perspective that broke page rendering (6b63876) - *merchandev*
* **2026-03-03 22:42:50** - feat: brand badge corner animation (6s fadeout) + organic magazine page-flip (1050ms, perspective, curvature gradient) (cdce67b) - *merchandev*
* **2026-03-03 22:34:46** - feat: unified premium FlipBook viewer - animations, responsive, fullscreen, grid, fix public PDF loading (65e392a) - *merchandev*
* **2026-03-03 09:35:02** - Add fading credit badge (80e45b7) - *merchandev*
* **2026-03-03 09:28:29** - Polish flipbook and magazine layouts (ac24bc6) - *merchandev*
* **2026-03-03 09:14:36** - Improve flipbook and magazine viewers (054337b) - *merchandev*
* **2026-03-02 21:41:44** - fix: maximize magazine viewer size and prevent page cropping (534c233) - *merchandev*
* **2026-03-02 20:29:20** - style: set background to #8F1920 and maximize flipbook dimensions (d943824) - *merchandev*
* **2026-03-02 20:20:00** - feat: improve magazine and flipbook viewer design and animations (1c55873) - *merchandev*
* **2026-03-02 20:06:13** - fix: bump pdfjs-dist and react-pdf to required versions (00d0a1a) - *merchandev*
* **2026-03-02 20:03:19** - fix: add created_at and updated_at to settings insert in emergencyFix (2b888be) - *merchandev*
* **2026-03-02 19:58:26** - fix: upgrade frontend docker image to node 20 to support pdfjs-dist v5 (03fb318) - *merchandev*
* **2026-03-02 19:54:10** - fix: automatic migration for pages table and mjs mime type for nginx (2b59fcd) - *merchandev*
* **2026-03-02 18:24:38** - fix: upgrade pdfjs-dist to 5.4.296 to match react-pdf and fix 500 error in public pages (8677e1c) - *merchandev*
* **2026-03-02 18:11:56** - fix(viewer): load latest pdfjs worker locally via vite import.meta to bypass all cors entirely (clean ts) (f48ba57) - *merchandev*
* **2026-03-02 18:07:28** - fix(viewer): load latest pdfjs worker locally via vite import.meta to bypass all cors entirely (214deae) - *merchandev*
* **2026-03-02 18:02:45** - fix(viewer): load pdf.worker.min.js from cdnjs to avoid unpkg CORS policy issues (3381b40) - *merchandev*
* **2026-03-02 17:57:37** - fix(router): resolve 404 on edition public page by fixing v6 path parameter syntax (79c728b) - *merchandev*
* **2026-03-02 17:52:40** - style(nav): align header menu to center horizontally and vertically (e8a462e) - *merchandev*
* **2026-03-02 17:47:35** - feat(lotus): add clear browser cache button to SuperAdmin dashboard (5327cf6) - *merchandev*
* **2026-03-02 17:35:08** - feat(admin): add clear browser cache button to PanelHome (00b9e4d) - *merchandev*
* **2026-03-02 17:30:11** - fix(types): remove unsupported mobileScrollSupport prop from HTMLFlipBook (62919c0) - *merchandev*
* **2026-03-02 17:19:07** - fix(responsive): horizontal overflow on mobile layout (89b0153) - *merchandev*
* **2026-03-02 16:44:45** - feat: redesign Edition public viewer with filters and widgets (ad22fe6) - *merchandev*
* **2026-02-28 17:22:33** - Fix react-pdf CSS imports (b90bea0) - *merchandev*
* **2026-02-28 17:17:09** - Add react-pdf to dependencies (783956b) - *merchandev*
* **2026-02-28 16:54:06** - Implement Magazine Viewer (8482325) - *merchandev*
* **2026-02-28 16:41:30** - Fix phpMyAdmin port in PanelHome (58103fb) - *merchandev*
* **2026-02-28 16:36:20** - Fix public edition fetching route and database lookup (75f6624) - *merchandev*
* **2026-02-28 16:30:53** - Fix URL generation truncation for 4 digit years (2d228ba) - *merchandev*
* **2026-02-28 16:27:14** - Change form to div to prevent HTML5 validation blocking submission (c9afed7) - *merchandev*
* **2026-02-28 16:15:24** - Require at least one publication and change button to Crear edici├│n (2c99201) - *merchandev*
* **2026-02-28 16:13:55** - Align 'Nueva Edici├│n' button with form inputs (c4b3973) - *merchandev*
* **2026-02-28 16:06:24** - Fix generated QR code URL and add PDF download button (89b8d6e) - *merchandev*
* **2026-02-28 16:00:35** - Change 'Generar QR' to 'Nueva Edici├│n' and add download option (051fbc6) - *merchandev*
* **2026-02-28 15:56:01** - Update QR creation flow and URL format (d498e4d) - *merchandev*
* **2026-02-28 11:23:50** - Allow admins to bypass the 3-month avatar change cooldown (e3eaa1f) - *merchandev*
* **2026-02-28 11:15:15** - Fix avatar 404 routing and 500 date parsing errors (8c25e8a) - *merchandev*
* **2026-02-28 10:52:15** - Fix status field default value error in emergencyFix (550acb1) - *merchandev*
* **2026-02-28 10:47:18** - Add try/catch to uploadAvatar to surface 500 errors (cd5237a) - *merchandev*
* **2026-02-28 10:05:35** - Allow 10MB avatars, link SVG everywhere, and enforce 3-month cooldown (c52c98d) - *merchandev*
* **2026-02-28 09:51:48** - Make FileController list query robust against missing deleted_at column (bd8b78d) - *merchandev*
* **2026-02-28 09:41:45** - Add deleted_at column creation to emergencyFix endpoint (7cd66af) - *merchandev*
* **2026-02-28 09:37:26** - Fix file list filtering when deleted_at is null or missing (0a09678) - *merchandev*
* **2026-02-28 09:30:37** - Fix file upload paths, add Papelera to MediaGallery, use icons for user actions (3dc0292) - *merchandev*
* **2026-02-28 09:17:51** - Fix layout de botones en Usuarios, abrir archivos directo en Medio, arreglar overlap texto, arreglar lint de phone (fc49478) - *merchandev*
* **2026-02-28 09:08:32** - Show filenames instead of just type for non-image media files in MediaGallery to allow easy identification (a50be11) - *merchandev*
* **2026-02-28 08:37:31** - Mejora general de responsive design y tablas con overflow horizontal (89ebfdd) - *merchandev*
* **2026-02-27 19:27:08** - UI: Add mobile dashboard hamburger menu & drawer logic to Sidebar (4d63af9) - *merchandev*
* **2026-02-27 19:23:19** - UI: Fix price per folio NaN issue in Topbar (6763e22) - *merchandev*
* **2026-02-27 19:21:13** - UI: Add responsive hamburger menu to PublicHeader and fluid breakpoints to Home (2ad9d90) - *merchandev*
* **2026-02-27 19:16:11** - UI: Add authenticated user header state for public layout and increase session timeout to 1h (aad58ec) - *merchandev*
* **2026-02-27 19:08:59** - UI: Refactor EditionPublic page layout (046de53) - *merchandev*
* **2026-02-27 19:06:30** - UI: Refactor Ediciones to restore original FlipbookViewer inner rendering instead of full-page iframe (42c91f2) - *merchandev*
* **2026-02-27 19:01:52** - UI: Refactor Ediciones admin panel to stack creation form and show inline details (0001855) - *merchandev*
* **2026-02-27 18:46:19** - Corrige valor del input de edicion automatica y agrega boton para minmizar los detalles de edicion interactuando con historial (b925d6f) - *merchandev*
* **2026-02-27 18:36:28** - Corrige error de 404 en vista publica, hace automatico el numero de edicion y repara bug al asociar PDFs donde no se cargaba el archivo correcto (48d2268) - *merchandev*
* **2026-02-27 18:26:18** - Mejora interfaz Ediciones. A├▒ade boton eliminar a publicaciones en edicion, vista colapsable y link QR expl├¡cito (d4399cf) - *merchandev*
* **2026-02-27 18:15:35** - Agrega opcion de editar y reasignar publicaciones en ediciones ya creadas (737cf47) - *merchandev*
* **2026-02-27 18:10:12** - Usa version local minify de pdf worker.js para evadir CDN y MIME issues (4749ae2) - *merchandev*
* **2026-02-27 18:03:01** - Muestra publicaciones Por verificar en la creacion de edicion (7ce0f25) - *merchandev*
* **2026-02-27 18:00:21** - Arregla url de worker del visor pdf y lista de ordenes en UI (83c48ee) - *merchandev*
* **2026-02-27 17:30:13** - Mejora el dise├▒o y listado de ediciones apilado (624c561) - *merchandev*
* **2026-02-27 17:23:41** - Fix API route for Ediciones Controller (3ab174a) - *merchandev*
* **2026-02-27 17:13:37** - Mejora en la logica de creacion de Ediciones (b60d09c) - *merchandev*
* **2026-02-13 13:50:32** - fix: enforce single document per kind in uploads and show existing files (2ecc950) - *merchandev*
* **2026-02-13 13:37:00** - fix: update payment button text to Reportar Pago and enforce validation (f12ea32) - *merchandev*
* **2026-02-13 13:17:58** - fix: improve payment button ux and show address always (eaf1258) - *merchandev*
* **2026-02-13 13:08:50** - feat: add applicant address to order summary (6ec6575) - *merchandev*
* **2026-02-13 13:07:43** - fix: relax payment button validation in Documento.tsx (0c6cdb5) - *merchandev*
* **2026-02-13 12:29:54** - fix: YearPicker event handling and z-index (8aeb571) - *merchandev*
* **2026-02-13 11:59:31** - feat: enhance year selection and update payment step layout (b3a698b) - *merchandev*
* **2026-02-12 18:22:04** - feat: add media management and promo banner features (57929e9) - *merchandev*
* **2026-02-11 23:28:11** - feat: change verify button text (707bb67) - *merchandev*
* **2026-02-11 23:16:33** - feat: update registration form with address and phone fields (0d4347c) - *merchandev*
* **2026-02-11 07:38:57** - fix: debug info (092df9e) - *merchandev*
* **2026-02-11 07:38:38** - chore: add dir listing to file debug (dbb20ce) - *merchandev*
* **2026-02-10 22:23:06** - chore: force full project sync (67e5564) - *merchandev*
* **2026-02-10 22:21:43** - fix: sync (08393f4) - *merchandev*
* **2026-02-10 22:10:48** - fix: show verification date in table and detail pdf error (d9064a1) - *merchandev*
* **2026-02-10 16:38:42** - fix: production fixes for pdf and storage (46a8ccf) - *merchandev*
* **2026-02-10 16:36:52** - fix: allow OPTIONS requests on uploads route to fix CORS/404 (d8689c8) - *merchandev*
* **2026-02-10 16:28:17** - fix: persist backend storage volume to prevent data loss on rebuild (1dac0b5) - *merchandev*
* **2026-02-10 16:24:41** - fix: use canonical file id in listFiles to prevent 404 in pdf viewer (bcaef28) - *merchandev*
* **2026-02-10 16:21:27** - feat: complete verification workflow with date and status updates (eba01d0) - *merchandev*
* **2026-02-10 16:19:52** - feat(db): add verification_date column migration script (e484d46) - *merchandev*
* **2026-02-10 16:11:27** - refactor: complete publication workflow, edition QR, and numbering (2faa085) - *merchandev*
* **2026-02-10 16:06:57** - feat: set order numbering to start at 1001 (c9a0fd6) - *merchandev*
* **2026-02-10 15:58:54** - feat(backend): refactor publication workflow and implement edition QR in PDF (7d38588) - *merchandev*
* **2026-02-10 15:49:22** - feat(backend): modernize PDF design, remove header date (1495a7e) - *merchandev*
* **2026-02-10 15:45:19** - fix(backend): define bcv variable in PDF download and ensure logo size (9463319) - *merchandev*
* **2026-02-10 15:19:35** - fix(backend): remove deprecated method calls causing 500 error in PDF (4757a1d) - *merchandev*
* **2026-02-10 15:05:33** - feat(backend): implement modern 2-column layout for order PDF (f33c0f4) - *merchandev*
* **2026-02-10 15:01:19** - feat(backend): pdf design adjustments (smaller title, date at end) (579142a) - *merchandev*
* **2026-02-10 14:55:16** - feat(backend): larger logo and modern minimalist table design for PDF (7698583) - *merchandev*
* **2026-02-10 14:52:43** - fix(backend): add missing logo file for PDF generation (61ee368) - *merchandev*
* **2026-02-10 14:49:39** - fix(backend): disable ob_clean to debug PDF viewer (9a9e1d1) - *merchandev*
* **2026-02-10 14:48:41** - fix(backend): enable GD, fix order number and logo path in PDF (38537df) - *merchandev*
* **2026-02-10 14:37:33** - feat(backend): implement modern order PDF design using FPDF (2259219) - *merchandev*
* **2026-02-09 18:19:21** - Fix: Reparar sistema de autenticaci├│n - validar status activo y b├║squeda flexible de documentos (5f5f835) - *merchandev*
* **2026-02-07 17:25:24** - fix: Agregar require_once faltante para FileController (ERROR CR├ìTICO) (3b0bd03) - *merchandev*
* **2026-02-07 17:18:09** - fix: Agregar headers CORS y mejor logging en servicio de archivos PDF (99739ea) - *merchandev*
* **2026-02-07 17:02:34** - feat: Mejorar UX de campos Tomo/Letra y A├▒o con selectores (66104e6) - *merchandev*
* **2026-02-07 16:58:07** - fix: Scroll correcto entre pasos del formulario de documentos (167235c) - *merchandev*
* **2026-02-07 16:50:32** - fix: Agregar autenticaci├│n y mejor manejo de errores en descarga de PDF (1677689) - *merchandev*
* **2026-02-07 16:41:14** - fix: Convertir amount_bs a n├║mero antes de toFixed (36671c9) - *merchandev*
* **2026-02-07 16:36:55** - fix: Cambiar estado de pago a 'Por verificar' en todos los formularios de publicaci├│n (0a14629) - *merchandev*
* **2026-02-07 16:12:39** - fix: Respetar estado de pago desde frontend en addPayment (3030cb1) - *merchandev*
* **2026-02-04 11:52:39** - Config: Enable console log stripping (b5e5436) - *merchandev*
* **2026-02-04 11:40:44** - Fix: Add missing public page routing (5213ab0) - *merchandev*
* **2026-02-04 11:34:52** - Fix: Add migration script for missing columns (5a0156a) - *merchandev*
* **2026-02-04 11:30:33** - Fix: Correct column name to body_json in seeder (7dbc57a) - *merchandev*
* **2026-02-04 11:27:23** - Fix: Update database method to Database::pdo() (7bbe234) - *merchandev*
* **2026-02-04 11:18:54** - Feat: Add seed_pages_v2.php to create default content (ce3c4bd) - *merchandev*
* **2026-02-04 10:53:31** - Fix: Make logo clickable with z-index (d822d54) - *merchandev*
* **2026-02-04 10:34:57** - Config: Enable console logs in production build (1b1a74d) - *merchandev*
* **2026-02-04 10:30:42** - Debug: Add logs to trace menu logic (36e1904) - *merchandev*
* **2026-02-04 10:17:26** - Fix: Prevent menu disappearance on API load fail; ensure INICIO/EDICIONES exist (60e9f81) - *merchandev*
* **2026-02-03 21:42:02** - Fix: LinkItem TypeScript error (1f28d21) - *merchandev*
* **2026-02-03 21:41:31** - UI: Improve sidebar hover states and fix duplicate active links (c124c6a) - *merchandev*
* **2026-02-03 20:35:36** - Fix: Clear output buffer before serving PDF (b5b9b89) - *merchandev*
* **2026-02-03 20:31:45** - Fix: Re-implement SimplePdf to generate valid PDF structure (0c37faa) - *merchandev*
* **2026-02-03 20:00:06** - Security: Rate limiting, logs cleanup, and env vars (d8e24ee) - *merchandev*
* **2026-02-03 18:19:13** - Security: Sanitize README.md and remove sensitive/local info (f28b910) - *merchandev*
* **2026-02-03 18:16:51** - Cleanup: Consolidate all documentation into README.md (992b206) - *merchandev*
* **2026-02-03 15:03:35** - Fix blank PDF issue by implementing correct SimplePdf drawing commands (7cfba78) - *merchandev*
* **2026-02-03 14:59:14** - Fix FileController sse duplicate and enable PDF receipt (6e410b2) - *merchandev*
* **2026-02-03 14:58:39** - Fix file serving and add receipt download (fec50f5) - *merchandev*
* **2026-02-03 14:57:51** - Fix file serving: add path column, route, and serve method (8d30b99) - *merchandev*
* **2026-02-03 14:54:12** - Fix App.tsx imports and routes (01af60a) - *merchandev*
* **2026-02-03 14:53:49** - Fix session persistence, auto-logout, and add public verification page (6197962) - *merchandev*
* **2026-02-03 14:37:57** - Fix remaining encoding issues (Direcci├│n) (acdffd2) - *merchandev*
* **2026-02-03 14:31:51** - Fix encoding and improve bank dropdown UI (e8d7678) - *merchandev*
* **2026-02-03 14:22:55** - Implement bank autocomplete dropdown (8aeaa5f) - *merchandev*
* **2026-02-03 14:20:43** - Cleanup debug logging (4eadcd7) - *merchandev*
* **2026-02-03 14:05:37** - Switch to error_log for debugging upload (8841ba3) - *merchandev*
* **2026-02-03 13:54:43** - Add debug logging and reorder FormData for duplicate fix (cf23d2b) - *merchandev*
* **2026-02-03 13:05:31** - Fix duplicate legal request on PDF upload (886c4f2) - *merchandev*
* **2026-02-03 07:52:22** - Fix infinite redirect loop by clearing stale superadmin token (faf5fa6) - *merchandev*
* **2026-02-01 09:20:15** - feat: SuperAdmin publication management with approve/reject/payments (5daa608) - *merchandev*
* **2026-02-01 09:04:53** - Emergency fix: Force update auth context changes (506cfcb) - *merchandev*
* **2026-02-01 08:11:42** - Fix: User name display and price loading issues (9b3e8ec) - *merchandev*
* **2026-02-01 07:22:36** - Refactor: Implement global AuthContext to fix infinite login loop - Eliminates race conditions from multiple me() calls (2703144) - *merchandev*
* **2026-02-01 07:08:49** - Fix: Corregir sistema de autenticaci├│n por roles - Ahora acepta admin/superadmin/Administrador (a371b61) - *merchandev*
* **2026-01-31 13:58:10** - Add script to fix missing price_per_folio_usd setting (ad9967d) - *merchandev*
* **2026-01-31 08:37:36** - Add debug script to check users and tokens (abf8ffb) - *merchandev*
* **2026-01-31 08:13:37** - Add comprehensive debug logging to trace token flow in login process (308a89d) - *merchandev*
* **2026-01-30 22:32:17** - Add debug logging to trace token reception (c54e9de) - *merchandev*
* **2026-01-30 22:26:44** - DISABLE rate limiting to fix login loop - URGENT FIX (d1dcc77) - *merchandev*
* **2026-01-30 22:19:54** - Add create_admin.php script to create admin users (94f008f) - *merchandev*
* **2026-01-30 21:42:57** - add user login diagnostic script (1889c79) - *merchandev*
* **2026-01-30 21:36:54** - add missing superadmin_tokens table migration (62e6a5b) - *merchandev*
* **2026-01-30 21:28:08** - fix: correct UTF-8 encoding for Spanish accented characters (bf577eb) - *merchandev*
* **2026-01-30 21:18:57** - fix: update Dockerfile.prod permissions to 777 for storage (e0bcb80) - *merchandev*
* **2026-01-30 21:02:54** - fix: use live BCV rate for PDF pricing calculation (316be5d) - *merchandev*
* **2026-01-30 20:55:48** - fix: remove storage volume mount to allow Dockerfile permissions (041f4be) - *merchandev*
* **2026-01-30 20:54:13** - add diagnostic script for storage permissions (891b5f9) - *merchandev*
* **2026-01-30 20:46:11** - fix: update storage permissions in Dockerfile to 777 (aa1f814) - *merchandev*
* **2026-01-30 17:15:46** - fix(frontend): use safe getToken() in manual fetch calls to avoid Bearer null error (adc2c8a) - *merchandev*
* **2026-01-30 16:47:24** - fix(db): drop and recreate legal_payments table to match controller schema (4642431) - *merchandev*
* **2026-01-30 16:23:28** - fix(db): add migration to rename payments table and create missing legal_files table (f91b181) - *merchandev*
* **2026-01-30 16:15:46** - chore: force update and sync task status (d735385) - *merchandev*
* **2026-01-30 16:13:56** - chore: add version log to frontend and detailed header value debug to backend (e0aac13) - *merchandev*
* **2026-01-30 15:30:36** - fix(server): add QSA flag to htaccess to preserve query params for auth fallback (794b4ce) - *merchandev*
* **2026-01-30 15:05:53** - fix(auth): correct syntax error and enable debug logging for 401 errors (b1aee91) - *merchandev*
* **2026-01-30 14:28:31** - fix(auth): implement resilient X-Auth-Token header and robust parsing to bypass header stripping issues (ccf24ba) - *merchandev*
* **2026-01-30 13:18:52** - fix(auth): ignore 'null' token strings in frontend and backend to prevent 401 errors (a770357) - *merchandev*
* **2026-01-30 12:26:30** - feat(publications): add backend routes, controller methods and migration for publications (3b0612e) - *merchandev*
* **2026-01-30 12:18:04** - feat(db): add migration script for users table columns (bebc3df) - *merchandev*
* **2026-01-30 12:12:55** - fix(users): add error handling and missing fields to user creation (c50db54) - *merchandev*
* **2026-01-30 12:08:01** - feat(debug): add reset_superadmin script for fixing access (7b03858) - *merchandev*
* **2026-01-30 11:48:54** - fix(stats): fix backend stats calculation and hide stats card in dashboard (2fb843a) - *merchandev*
* **2026-01-28 15:52:31** - feat(stats): implement comprehensive statistics dashboard with user, publication, and financial metrics (1d97e08) - *merchandev*
* **2026-01-28 13:48:24** - feat(users): add full user management (edit email/status/password) (ca45141) - *merchandev*
* **2026-01-28 13:35:05** - feat(frontend): update footer copyright text (ec54448) - *merchandev*
* **2026-01-28 13:25:06** - chore: save all recent changes and fixes (b6a7a68) - *merchandev*
* **2026-01-28 12:36:24** - fix(db): add created_at to settings insert to prevent strict sql errors (bd9e830) - *merchandev*
* **2026-01-28 11:55:46** - fix(prod): install missing extensions and catch rate errors (d4b5006) - *merchandev*
* **2026-01-28 11:50:55** - fix(auth): unified superadmin/user tokens and suppressed html errors (dd66801) - *merchandev*
* **2026-01-28 11:33:44** - fix(backend): disable display_errors to prevent json corruption (8fbee07) - *merchandev*
* **2026-01-28 11:27:31** - feat(frontend): add manual bcv rate refresh button (ba2257d) - *merchandev*
* **2026-01-28 11:20:05** - chore: add scraper diagnostic script (71864e1) - *merchandev*
* **2026-01-28 11:10:31** - fix(docker): install php curl extension for scraper (fba1678) - *merchandev*
* **2026-01-28 10:44:42** - fix(backend): improve bcv scraper with robust api fallback (257d383) - *merchandev*
* **2026-01-28 10:33:17** - feat: complete superadmin panel modules (pubs, settings, stats, activity) (a66d609) - *merchandev*
* **2026-01-28 10:24:48** - feat: add superadmin user management and fix routing (5e814d7) - *merchandev*
* **2026-01-28 10:16:15** - fix: update superadmin password hash with verified value (0f15ee6) - *merchandev*
* **2026-01-28 10:06:55** - debug: log superadmin input (a3fe884) - *merchandev*
* **2026-01-28 07:54:39** - Force update to trigger deployment (8572981) - *merchandev*
* **2026-01-26 17:49:17** - Refactor: Complete project optimization (2cc0f7e) - *merchandev*
* **2026-01-26 16:43:44** - Add script to fix superadmin password hash (74b7036) - *merchandev*
* **2026-01-26 14:46:03** - Add: Complete database reset script with all tables and initial data (ec10de3) - *merchandev*
* **2026-01-26 14:38:57** - Fix: Complete seed_users.php with all required fields for both users (be1f23a) - *merchandev*
* **2026-01-26 14:38:24** - Fix: Add updated_at field to seed_users.php INSERT statement (693a044) - *merchandev*
* **2026-01-26 14:32:14** - Security: Remove exposed password from hash generator (da20d6b) - *merchandev*
* **2026-01-26 14:27:31** - Security fix: Remove hardcoded password hash and improve error handling (bc275ee) - *merchandev*
* **2026-01-26 14:04:53** - Feature: Add secret superadmin system with /lotus/ route (92dcab1) - *merchandev*
* **2026-01-26 13:25:57** - Simplify docker-compose - remove all healthchecks and resource limits (8ebfe0e) - *merchandev*
* **2026-01-26 13:25:06** - MAJOR REFACTOR: Simplified deployment architecture (1762651) - *merchandev*
* **2026-01-26 13:22:45** - Fix: Use PHP Database class in init script instead of mysql CLI (e7dc74b) - *merchandev*
* **2026-01-26 13:17:32** - Critical fix: Start PHP-FPM immediately, run DB init in background (4c337be) - *merchandev*
* **2026-01-26 13:09:27** - Fix: Use res.clone() to prevent 'body stream already read' error in login (957c606) - *merchandev*
* **2026-01-26 12:00:18** - Fix: Remove backend healthcheck completely - let services start independently (75a4e58) - *merchandev*
* **2026-01-26 11:30:49** - Fix: Change backend healthcheck to check PHP-FPM process (680b6dc) - *merchandev*
* **2026-01-26 11:30:20** - Fix: Simplify healthcheck and init script for faster startup (07f8974) - *merchandev*
* **2026-01-26 11:27:37** - Fix: Use apt-get instead of apk for mysql-client (Debian base image) (e9f3ec2) - *merchandev*
* **2026-01-26 11:18:13** - Complete project audit and production fixes (8fc0505) - *merchandev*
* **2026-01-26 11:03:05** - Fix UI swallowing error messages in Login.tsx (fbdd8fe) - *merchandev*
* **2026-01-26 10:58:08** - Fix login error handling and add DB test script (1a05195) - *merchandev*
* **2026-01-26 10:51:14** - Fix: Add Web-based Emergency Fix system (f6f5893) - *merchandev*
* **2026-01-26 10:42:07** - Fix: Add universal fix_system.php script (7bccc6e) - *merchandev*
* **2026-01-26 10:35:22** - Fix: Register try-catch and Add debug_register.php (29db6a3) - *merchandev*
* **2026-01-26 10:27:25** - Fix: Wrap register logic in try-catch to prevent HTML errors (6d3c669) - *merchandev*
* **2026-01-26 10:02:24** - Fix: Wrap login in try-catch to prevent HTML error leak (b8e9e27) - *merchandev*
* **2026-01-26 10:01:02** - Fix: Restore BCV RateController route to enable scraping logic (b1ec1c2) - *merchandev*
* **2026-01-26 09:45:55** - Fix: Force 'merchandev' login to ignore all prefixes (b97d065) - *merchandev*
* **2026-01-26 09:37:14** - Fix: Auth now strips prefix for alphanumeric users (admin fix) (e8c1ab2) - *merchandev*
* **2026-01-26 09:03:12** - Force: Trigger Manual Redeploy (62bf75a) - *merchandev*
* **2026-01-24 19:38:04** - Fix: Change phpMyAdmin port to 8088 to avoid conflict (a2481a7) - *merchandev*
* **2026-01-24 19:35:03** - Fix: Auth date format and exposes 401 error details (257d870) - *merchandev*
* **2026-01-24 19:23:57** - Feat: Add delete button to Historial and fix JSX error (a49b0e8) - *merchandev*
* **2026-01-24 19:10:16** - Fix: Complete backend repair - Added SystemController, updated Router, restored LegalController logic (c6260d5) - *merchandev*
* **2026-01-24 18:26:07** - Fix login, users, and uploads: sync valid server code to local (0f03daf) - *merchandev*
* **2026-01-24 17:53:57** - Sync commit (269f203) - *merchandev*
* **2026-01-24 17:33:34** - Enable error display in admin script (bcdaf3b) - *merchandev*
* **2026-01-24 17:24:31** - Forced update (394b173) - *merchandev*
* **2026-01-22 06:30:35** - Update frontend solicitante pages and other changes (e8ec80d) - *merchandev*
* **2026-01-21 23:37:31** - Fix: Add fallback auth token via query param (retry) (449a8a8) - *merchandev*
* **2026-01-21 23:22:33** - Fix: Nginx 401 Unauthorized (pass HTTP_AUTHORIZATION) (18a16fa) - *merchandev*
* **2026-01-21 23:02:06** - Fix: 401 Unauthorized on PDF upload (add .htaccess and robust auth) (7ad06fa) - *merchandev*
* **2026-01-21 22:55:03** - Fix: Prevent duplicate publications and add bank list (923fee9) - *merchandev*
* **2026-01-21 22:13:27** - Fix login 401 via fuzzy doc search (cd70e00) - *merchandev*
* **2026-01-21 22:07:32** - Forced update (90efefb) - *merchandev*
* **2026-01-21 22:06:40** - Add debug auth script (04a4b4f) - *merchandev*
* **2026-01-21 22:00:03** - Update add_merchandev_user script to upsert user (c78a002) - *merchandev*
* **2026-01-21 21:55:37** - Remove hardcoded container names to fix deployment conflict (a722d1d) - *merchandev*
* **2026-01-21 21:51:12** - Fix Convocatorias JSX and Cascading Logic (29ddd50) - *merchandev*
* **2026-01-21 21:50:04** - Refactor Convocatorias to use shared Constants (0d633af) - *merchandev*
* **2026-01-21 21:49:38** - Implement Convocatorias Workflow, Update Global Lists, Fix Duplication Bug (42ee09e) - *merchandev*
* **2026-01-05 16:00:38** - first commit (f43c528) - *merchandev*
