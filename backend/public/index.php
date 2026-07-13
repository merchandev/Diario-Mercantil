<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Http/RequestContext.php';
require_once __DIR__ . '/../src/Exceptions/HttpException.php';
require_once __DIR__ . '/../src/Http/ErrorHandler.php';

$context = new RequestContext();
set_exception_handler(fn(Throwable $e) => ErrorHandler::handle($e, $context));

$allowedOrigins = getenv('ALLOWED_ORIGINS') ? explode(',', getenv('ALLOWED_ORIGINS')) : ['http://localhost:5173', 'http://localhost:8000', 'https://diariomercantil.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins) || getenv('APP_ENV') === 'development') {
    header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
} else {
    header("Access-Control-Allow-Origin: null"); 
}
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Credentials: true");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit(0);
}

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

require_once __DIR__."/../src/AuthController.php";
require_once __DIR__."/../src/UserController.php";
require_once __DIR__."/../src/LegalController.php";
require_once __DIR__."/../src/SystemController.php";
require_once __DIR__."/../src/Response.php";
require_once __DIR__."/../src/RateController.php";
require_once __DIR__."/../src/PagesController.php";
require_once __DIR__."/../src/FileController.php";
require_once __DIR__."/../src/EditionController.php";
require_once __DIR__."/../src/HealthController.php";
require_once __DIR__."/../src/MetricsController.php";
require_once __DIR__."/../src/UploadController.php";
require_once __DIR__."/../src/Http/Router.php";
require_once __DIR__."/../src/Http/Middleware.php";

$router = new Router();
$auth = [Middleware::requireSession()];
$csrf = [Middleware::requireSession(), Middleware::requireCsrf()];
$admin = [Middleware::requireSession(), Middleware::requireRole('admin', 'superadmin', 'manager', 'staff')];
$adminCsrf = array_merge($admin, [Middleware::requireCsrf()]);

// AUTH
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/api/auth/reset-password', [AuthController::class, 'resetPassword']);
$router->get('/api/auth/me', [AuthController::class, 'me'], $auth);
$router->post('/api/auth/logout', [AuthController::class, 'logout'], $auth); // Let's keep logout without CSRF for now or just auth

// USERS (Admin)
$router->get('/api/users', [UserController::class, 'list'], $admin);
$router->post('/api/users', [UserController::class, 'create'], $adminCsrf);
$router->put('/api/users/{id}', [UserController::class, 'update'], $csrf);
$router->delete('/api/users/{id}', [UserController::class, 'delete'], $adminCsrf);
$router->post('/api/admin/users/{id}/suspend', [UserController::class, 'suspend'], $adminCsrf);
$router->post('/api/admin/users/{id}/restore', [UserController::class, 'restore'], $adminCsrf);
$router->post('/api/admin/users/{id}/role', [UserController::class, 'changeRole'], $adminCsrf);
$router->post('/api/admin/users/{id}/reset-password', [UserController::class, 'resetPassword'], $adminCsrf);

// PROFILE
class ProfileProxy { 
    public function update() { $u = AuthController::requireAuth(); (new UserController())->update($u['id']); }
}
$router->put('/api/user/profile', [ProfileProxy::class, 'update'], $csrf);
$router->post('/api/user/avatar', [UserController::class, 'uploadAvatar'], $csrf);

// LEGAL
$router->post('/api/legal/upload-pdf', [LegalController::class, 'uploadPdf'], $csrf);
$router->get('/api/legal/trash', [LegalController::class, 'listTrashed'], $auth);
$router->delete('/api/legal/trash', [LegalController::class, 'emptyTrash'], $csrf);
$router->delete('/api/legal/trash/{id}', [LegalController::class, 'permanentDelete'], $csrf);
$router->get('/api/legal', [LegalController::class, 'list'], $auth);
$router->post('/api/legal', [LegalController::class, 'create'], $csrf);
$router->get('/api/legal/{id}', [LegalController::class, 'get'], $auth);
$router->put('/api/legal/{id}', [LegalController::class, 'update'], $csrf);
$router->delete('/api/legal/{id}', [LegalController::class, 'softDelete'], $csrf);
$router->post('/api/legal/{id}/restore', [LegalController::class, 'restore'], $csrf);
$router->post('/api/legal/{id}/reject', [LegalController::class, 'reject'], $adminCsrf);
$router->post('/api/legal/{id}/submit', [LegalController::class, 'submit'], $csrf);
$router->post('/api/legal/{id}/verify', [LegalController::class, 'verify'], $adminCsrf);
$router->post('/api/legal/{id}/return-to-draft', [LegalController::class, 'returnToDraft'], $adminCsrf);
$router->get('/api/legal/{id}/download', [LegalController::class, 'download'], $auth);
$router->get('/api/legal/{id}/files', [LegalController::class, 'listFiles'], $auth);
$router->post('/api/legal/{id}/payments', [LegalController::class, 'addPayment'], $csrf);
$router->delete('/api/legal/{id}/payments/{pid}', [LegalController::class, 'deletePayment'], $csrf);
$router->get('/api/legal/public/check', [LegalController::class, 'getPublic']);
$router->get('/api/legal/public/{id}', [LegalController::class, 'getPublic']);

// FILES
$router->get('/api/uploads/avatars/{id}', [FileController::class, 'serveAvatar']);
$router->get('/api/uploads/{id}', [FileController::class, 'serve']);
$router->get('/api/files/trash', [FileController::class, 'listTrashed'], $admin);
$router->delete('/api/files/trash', [FileController::class, 'emptyTrash'], $adminCsrf);
$router->delete('/api/files/trash/{id}', [FileController::class, 'permanentDelete'], $adminCsrf);
$router->post('/api/files/{id}/restore', [FileController::class, 'restore'], $adminCsrf);
$router->get('/api/files/{id}', [FileController::class, 'get'], $auth);
$router->delete('/api/files/{id}', [FileController::class, 'softDelete'], $adminCsrf);
$router->get('/api/files', [FileController::class, 'list'], $admin);
$router->post('/api/files', [UploadController::class, 'upload'], $csrf);

// EDITIONS
$router->get('/api/editions', [EditionController::class, 'list'], $admin);
$router->post('/api/editions', [EditionController::class, 'create'], $adminCsrf);
$router->get('/api/editions/{id}', [EditionController::class, 'get'], $admin);
$router->put('/api/editions/{id}', [EditionController::class, 'update'], $adminCsrf);
$router->delete('/api/editions/{id}', [EditionController::class, 'delete'], $adminCsrf);
$router->post('/api/editions/{id}/orders', [EditionController::class, 'setOrders'], $adminCsrf);
$router->post('/api/editions/{id}/publish', [EditionController::class, 'publish'], $adminCsrf);
$router->post('/api/editions/{id}/pdf', [EditionController::class, 'uploadPdf'], $adminCsrf);
$router->get('/api/e/{id}/download', [EditionController::class, 'downloadById'], $auth);
$router->get('/api/e/{code}/download', [EditionController::class, 'downloadByCode'], $auth);
$router->get('/api/dm/e-{code}', [EditionController::class, 'publicByCode']);

// SYSTEM & PAGES
$router->get('/api/stats', [SystemController::class, 'getStats'], $admin);
$router->get('/api/rate/bcv', [RateController::class, 'bcv']);
$router->get('/api/settings', [SystemController::class, 'getSettings'], $admin);
$router->post('/api/settings', [SystemController::class, 'saveSettings'], $adminCsrf);
$router->get('/api/payments', [SystemController::class, 'listPayments'], $admin);
$router->get('/api/public/pages', [SystemController::class, 'listPagesPublic']);
$router->get('/api/page/{slug}', [PagesController::class, 'publicGet']);
$router->get('/api/publications', [SystemController::class, 'listPages'], $admin);
$router->post('/api/publications', [SystemController::class, 'createPage'], $adminCsrf);
$router->put('/api/publications/{id}', [SystemController::class, 'updatePage'], $adminCsrf);
$router->delete('/api/publications/{id}', [SystemController::class, 'deletePage'], $adminCsrf);
$router->get('/api/directory/profile', [SystemController::class, 'getDirectoryProfile']);

// STUBS
class StubController {
    public function emptyList() { Response::json(['items'=>[]]); }
}
$router->get('/api/directory/areas', [StubController::class, 'emptyList']);
$router->get('/api/directory/colleges', [StubController::class, 'emptyList']);

// HEALTH
$router->get('/api/health/live', [HealthController::class, 'live']);
$router->get('/api/health/ready', [HealthController::class, 'ready']);
// METRICS (Note: We'll protect this with Nginx in phase 9)
$router->get('/metrics', [MetricsController::class, 'prometheus']);

// OPENAPI
class OpenApiController {
    public function yaml() {
        require __DIR__ . '/../vendor/autoload.php';
        $openapi = \OpenApi\Generator::scan([__DIR__ . '/../src']);
        header('Content-Type: application/x-yaml');
        echo $openapi->toYaml();
        exit;
    }
}
$router->get('/api/docs/openapi.yaml', [OpenApiController::class, 'yaml']);

$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];
require_once __DIR__."/../src/Exceptions/HttpException.php";

try {
    $router->dispatch($method, $uri);
} catch (HttpException $e) {
    Response::json(['error' => $e->getCodeStr(), 'message' => $e->getMessage()], $e->getHttpCode());
} catch (Throwable $e) {
    error_log((string)$e);
    Response::json(['error' => 'server_error', 'message' => 'Error interno del servidor'], 500);
}
