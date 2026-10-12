<?php
declare(strict_types=1);
require_once __DIR__.'/../Repositories/SettingRepository.php';
require_once __DIR__.'/../Exceptions/HttpException.php';

final class MaintenanceService {
    public const DURATION = 4 * 60 * 60;
    public const COOKIE = 'dm_maintenance';

    public function __construct(private PDO $pdo) {}

    public function configuration(): array {
        $settings = (new SettingRepository($this->pdo))->getMany(['maintenance_enabled','maintenance_generation']);
        return ['enabled'=>($settings['maintenance_enabled'] ?? '0') === '1', 'generation'=>$settings['maintenance_generation'] ?? ''];
    }

    private function credential(string $type, int $id): ?array {
        $sql = $type === 'superadmin'
            ? 'SELECT id,password_hash FROM superadmins WHERE id=?'
            : "SELECT id,password_hash FROM users WHERE id=? AND status='active' AND role IN ('admin','superadmin')";
        $query = $this->pdo->prepare($sql);
        $query->execute([$id]);
        return $query->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function access(?string $token, ?int $now = null): ?array {
        if (!$token || !preg_match('/^[a-f0-9]{64}$/D', $token)) return null;
        $now ??= time();
        $config = $this->configuration();
        $query = $this->pdo->prepare('SELECT * FROM maintenance_sessions WHERE token_hash=? AND generation=? AND expires_at>?');
        $query->execute([hash('sha256',$token),$config['generation'],$now]);
        $session = $query->fetch(PDO::FETCH_ASSOC);
        if (!$session) return null;
        $credential = $this->credential($session['credential_type'], (int)$session['credential_id']);
        if (!$credential || !hash_equals($session['credential_hash'],hash('sha256',(string)$credential['password_hash']))) return null;
        return $session;
    }

    public function grant(string $type, array $credential, ?int $now = null): array {
        $now ??= time();
        $token = bin2hex(random_bytes(32));
        $expires = $now + self::DURATION;
        $this->pdo->prepare('DELETE FROM maintenance_sessions WHERE expires_at<=?')->execute([$now]);
        $this->pdo->prepare('INSERT INTO maintenance_sessions(token_hash,credential_type,credential_id,credential_hash,generation,expires_at) VALUES(?,?,?,?,?,?)')
            ->execute([hash('sha256',$token),$type,$credential['id'],hash('sha256',(string)$credential['password_hash']),$this->configuration()['generation'],$expires]);
        return ['token'=>$token,'expires_at'=>$expires];
    }

    public function unlock(string $password, string $ip, ?int $now = null): array {
        $now ??= time();
        if ($password === '' || strlen($password)>1024) throw new HttpException(401,'invalid_credentials','Contraseña incorrecta.');
        $hash = hash('sha256',$ip);
        $this->pdo->prepare('DELETE FROM maintenance_attempts WHERE attempted_at<=?')->execute([$now-900]);
        // Record before verifying so concurrent requests cannot skip the limit.
        $this->pdo->prepare('INSERT INTO maintenance_attempts(ip_hash,attempted_at) VALUES(?,?)')->execute([$hash,$now]);
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM maintenance_attempts WHERE ip_hash=? AND attempted_at>?');
        $count->execute([$hash,$now-900]);
        if ((int)$count->fetchColumn()>5) throw new HttpException(429,'too_many_attempts','Demasiados intentos. Intente de nuevo en 15 minutos.');
        foreach ($this->pdo->query("SELECT id,password_hash FROM users WHERE status='active' AND role IN ('admin','superadmin')") as $credential) {
            if (password_verify($password,(string)$credential['password_hash'])) {
                $this->pdo->prepare('DELETE FROM maintenance_attempts WHERE ip_hash=?')->execute([$hash]);
                return $this->grant('user',$credential,$now);
            }
        }
        foreach ($this->pdo->query('SELECT id,password_hash FROM superadmins') as $credential) {
            if (password_verify($password,(string)$credential['password_hash'])) {
                $this->pdo->prepare('DELETE FROM maintenance_attempts WHERE ip_hash=?')->execute([$hash]);
                return $this->grant('superadmin',$credential,$now);
            }
        }
        throw new HttpException(401,'invalid_credentials','Contraseña incorrecta.');
    }

    public function toggle(bool $enabled, array $admin, ?int $now = null): ?array {
        $now ??= time();
        $type = ($admin['document'] ?? '') === 'SUPERADMIN' ? 'superadmin' : 'user';
        $credential = $this->credential($type,(int)$admin['id']);
        if (!$credential) throw new HttpException(403,'forbidden','Solo un administrador puede gestionar el mantenimiento.');
        $owns = !$this->pdo->inTransaction();
        if ($owns) $this->pdo->beginTransaction();
        try {
            $repository = new SettingRepository($this->pdo);
            // Rotate on every explicit change, invalidating all previous bypass sessions.
            $repository->set('maintenance_generation',bin2hex(random_bytes(16)));
            $repository->set('maintenance_enabled',$enabled ? '1' : '0');
            $this->pdo->exec('DELETE FROM maintenance_sessions');
            $this->pdo->prepare('INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?)')
                ->execute([(int)$admin['id'],$enabled ? 'enable_maintenance' : 'disable_maintenance','settings',null]);
            $grant = $enabled ? $this->grant($type,$credential,$now) : null;
            if ($owns) $this->pdo->commit();
            return $grant;
        } catch (Throwable $e) {
            if ($owns && $this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }
}
