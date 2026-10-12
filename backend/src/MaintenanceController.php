<?php
declare(strict_types=1);
require_once __DIR__.'/Database.php';
require_once __DIR__.'/AuthController.php';
require_once __DIR__.'/Response.php';
require_once __DIR__.'/Services/MaintenanceService.php';

final class MaintenanceController {
    private static function cookie(string $token, int $expires): void {
        setcookie(MaintenanceService::COOKIE,$token,[
            'expires'=>$expires,'path'=>'/','secure'=>getenv('APP_ENV') !== 'development',
            'httponly'=>true,'samesite'=>'Strict'
        ]);
    }

    public static function enforce(string $path, string $method): void {
        // Only the gate and infrastructure probes remain public during maintenance.
        if (($method === 'GET' && in_array($path,['/api/maintenance/status','/api/health/live','/api/health/ready'],true))
            || ($method === 'POST' && $path === '/api/maintenance/unlock')) return;
        $service = new MaintenanceService(Database::pdo());
        if ($service->configuration()['enabled'] && !$service->access($_COOKIE[MaintenanceService::COOKIE] ?? null)) {
            header('Cache-Control: no-store');
            header('Retry-After: 300');
            Response::json(['error'=>'maintenance_required','message'=>'El sitio está en mantenimiento programado.'],503);
        }
    }

    public function status(): void {
        header('Cache-Control: no-store');
        $service = new MaintenanceService(Database::pdo());
        $config = $service->configuration();
        $access = $config['enabled'] ? $service->access($_COOKIE[MaintenanceService::COOKIE] ?? null) : null;
        Response::json(['enabled'=>$config['enabled'],'unlocked'=>!$config['enabled'] || (bool)$access,
            'expires_at'=>$access ? (int)$access['expires_at'] : null,'duration_seconds'=>MaintenanceService::DURATION,'remaining_seconds'=>$access ? max(0,(int)$access['expires_at']-time()) : null]);
    }

    public function unlock(): void {
        header('Cache-Control: no-store');
        // Reject cross-origin submissions independently of the ordinary login/CSRF cookies.
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '') {
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $allowed = explode(',',getenv('ALLOWED_ORIGINS') ?: '');
            if (!in_array($origin,$allowed,true) && !in_array($origin,['https://'.$host,'http://'.$host],true)) {
                throw new HttpException(403,'forbidden','Origen no autorizado.');
            }
        }
        $input = json_decode(file_get_contents('php://input'),true) ?: [];
        $service = new MaintenanceService(Database::pdo());
        if (!$service->configuration()['enabled']) Response::json(['unlocked'=>true,'expires_at'=>null]);
        $grant = $service->unlock((string)($input['password'] ?? ''),$_SERVER['REMOTE_ADDR'] ?? 'unknown');
        self::cookie($grant['token'],$grant['expires_at']);
        Response::json(['unlocked'=>true,'expires_at'=>$grant['expires_at'],'duration_seconds'=>MaintenanceService::DURATION]);
    }

    public function configure(): void {
        header('Cache-Control: no-store');
        $admin = AuthController::requireAuth();
        if (!in_array($admin['role'],['admin','superadmin'],true)) throw new HttpException(403,'forbidden','No autorizado.');
        $input = json_decode(file_get_contents('php://input'),true) ?: [];
        if (!is_bool($input['enabled'] ?? null)) throw new HttpException(422,'invalid_payload','Indique el estado del mantenimiento.');
        $grant = (new MaintenanceService(Database::pdo()))->toggle($input['enabled'],$admin);
        self::cookie($grant['token'] ?? '',$grant['expires_at'] ?? 1);
        Response::json(['enabled'=>$input['enabled'],'unlocked'=>true,'expires_at'=>$grant['expires_at'] ?? null]);
    }
}
