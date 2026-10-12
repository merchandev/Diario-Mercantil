<?php
use PHPUnit\Framework\TestCase;
require_once __DIR__.'/../src/Services/MaintenanceService.php';

final class MaintenanceServiceTest extends TestCase {
    private PDO $pdo;
    private MaintenanceService $service;
    protected function setUp(): void {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec("CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT,updated_at TEXT)");
        $this->pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY,role TEXT,status TEXT,password_hash TEXT)");
        $this->pdo->exec("CREATE TABLE superadmins (id INTEGER PRIMARY KEY,password_hash TEXT)");
        $this->pdo->exec("CREATE TABLE audit_logs (actor_user_id INTEGER,action TEXT,resource_type TEXT,resource_id TEXT)");
        (require __DIR__.'/../database/migrations/20261012_010_scheduled_maintenance.php')($this->pdo);
        $this->pdo->prepare('INSERT INTO users VALUES(?,?,?,?)')->execute([1,'admin','active',password_hash('AdminSecret123',PASSWORD_DEFAULT)]);
        $this->pdo->prepare('INSERT INTO users VALUES(?,?,?,?)')->execute([2,'solicitante','active',password_hash('ClientSecret123',PASSWORD_DEFAULT)]);
        $this->pdo->prepare('INSERT INTO superadmins VALUES(?,?)')->execute([7,password_hash('SuperSecret123',PASSWORD_DEFAULT)]);
        $this->service = new MaintenanceService($this->pdo);
    }
    private function enable(int $now = 1000): array {
        return $this->service->toggle(true,['id'=>1,'document'=>'V1'],$now);
    }
    public function testGrantExpiresAtFourHoursAndIsIndependentOfAccount(): void {
        $grant = $this->enable();
        $this->assertSame(15400,$grant['expires_at']);
        $this->assertNotNull($this->service->access($grant['token'],15399));
        $this->assertNull($this->service->access($grant['token'],15400));
        $this->assertNull($this->service->access('forged',1001));
        $stored = $this->pdo->query('SELECT token_hash FROM maintenance_sessions')->fetchColumn();
        $this->assertNotSame($grant['token'],$stored);
        $this->assertSame(hash('sha256',$grant['token']),$stored);
    }
    public function testDisableAndReenableRevokePreviousGrants(): void {
        $old = $this->enable();
        $this->service->toggle(false,['id'=>1,'document'=>'V1'],1001);
        $this->assertFalse($this->service->configuration()['enabled']);
        $new = $this->enable(1002);
        $this->assertNull($this->service->access($old['token'],1003));
        $this->assertNotNull($this->service->access($new['token'],1003));
        $this->assertSame(3,(int)$this->pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn());
    }
    public function testSuspensionDemotionAndPasswordChangeRevokeAccess(): void {
        $grant = $this->enable();
        $this->pdo->exec("UPDATE users SET status='suspended' WHERE id=1");
        $this->assertNull($this->service->access($grant['token'],1001));
        $this->pdo->exec("UPDATE users SET status='active',role='solicitante' WHERE id=1");
        $this->assertNull($this->service->access($grant['token'],1001));
        $this->pdo->exec("UPDATE users SET role='admin',password_hash='changed' WHERE id=1");
        $this->assertNull($this->service->access($grant['token'],1001));
    }
    public function testAdminAndSuperadminPasswordsOpenGate(): void {
        $this->enable();
        $admin = $this->service->unlock('AdminSecret123','127.0.0.1',1001);
        $super = $this->service->unlock('SuperSecret123','127.0.0.1',1002);
        $this->assertSame('user',$this->service->access($admin['token'],1003)['credential_type']);
        $this->assertSame('superadmin',$this->service->access($super['token'],1003)['credential_type']);
        $this->assertSame(0,(int)$this->pdo->query('SELECT COUNT(*) FROM maintenance_attempts')->fetchColumn());
    }
    public function testClientCannotUnlockAndSixthAttemptIsLimitedUntilWindowExpires(): void {
        $this->enable();
        for ($i=0;$i<6;$i++) {
            try { $this->service->unlock('ClientSecret123','127.0.0.1',1001); $this->fail('Client password accepted'); }
            catch (HttpException $e) { $this->assertSame($i<5 ? 401 : 429,$e->status); }
        }
        $grant = $this->service->unlock('AdminSecret123','127.0.0.1',1902);
        $this->assertNotNull($this->service->access($grant['token'],1903));
    }
    public function testClientCannotConfigureMaintenance(): void {
        $this->expectException(HttpException::class);
        $this->service->toggle(true,['id'=>2,'document'=>'V2']);
    }
}
