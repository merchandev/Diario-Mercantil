<?php
use PHPUnit\Framework\TestCase;

class AuthorizationIntegrationTest extends TestCase {
    
    private static $process;
    private static $port = 8080;
    
    public static function setUpBeforeClass(): void {
        $cmd = 'php -S 127.0.0.1:' . self::$port . ' -t ' . __DIR__ . '/../public';
        self::$process = proc_open($cmd, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ], $pipes);
        
        sleep(2); 
        
        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        
        try { $pdo->exec("PRAGMA foreign_keys = OFF"); } catch (Exception $e) {}
        try { $pdo->exec("SET FOREIGN_KEY_CHECKS = 0"); } catch (Exception $e) {}
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, payload TEXT, last_activity INTEGER, token_hash VARCHAR(255), revoked_at DATETIME, expires_at DATETIME)");
        
        $pdo->prepare("DELETE FROM sessions")->execute();
        $pdo->prepare("DELETE FROM users")->execute();
        
        $now = time();
        
        // Admin
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password_hash, status, created_at) VALUES(1, 'admin', 'Admin', 'V123', 'admin@test.com', 'pwd', 'active', '2026-01-01 00:00:00')")->execute();
        $tokenHashAdmin = hash('sha256', 'admin_session_test');
        $pdo->prepare("INSERT INTO sessions(id, user_id, last_activity, token_hash, expires_at) VALUES('admin_session_test', 1, $now, '$tokenHashAdmin', datetime('now', '+1 day'))")->execute();
        
        // User
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password_hash, status, created_at) VALUES(2, 'solicitante', 'User', 'V456', 'user@test.com', 'pwd', 'active', '2026-01-01 00:00:00')")->execute();
        $tokenHashUser = hash('sha256', 'user_session_test');
        $pdo->prepare("INSERT INTO sessions(id, user_id, last_activity, token_hash, expires_at) VALUES('user_session_test', 2, $now, '$tokenHashUser', datetime('now', '+1 day'))")->execute();
    }
    
    public static function tearDownAfterClass(): void {
        if (self::$process) proc_terminate(self::$process);
    }
    
    private function request($method, $uri, $sessionId = null, $body = []) {
        $context = [
            'http' => [
                'method' => $method,
                'ignore_errors' => true,
                'header' => "Content-Type: application/json\r\n"
            ]
        ];
        
        if ($sessionId) {
            $context['http']['header'] .= "Cookie: dm_session=$sessionId; dm_csrf=test_csrf\r\n";
            $context['http']['header'] .= "X-CSRF-Token: test_csrf\r\n";
        }
        
        if (!empty($body)) {
            $context['http']['content'] = json_encode($body);
        }
        
        $url = 'http://127.0.0.1:' . self::$port . $uri;
        $response = @file_get_contents($url, false, stream_context_create($context));
        
        $code = 0;
        if (isset($http_response_header) && is_array($http_response_header) && count($http_response_header) > 0) {
            preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $matches);
            $code = (int)$matches[1];
        }
        
        return ['code' => $code, 'body' => json_decode((string)$response, true)];
    }
    
    public function testListUsersWithoutTokenIs401() {
        $res = $this->request('GET', '/api/users');
        $this->assertEquals(401, $res['code']);
    }

    public function testListUsersAsSolicitanteIs403() {
        $res = $this->request('GET', '/api/users', 'user_session_test');
        $this->assertEquals(403, $res['code']);
    }

    public function testListUsersAsAdminIs200() {
        $res = $this->request('GET', '/api/users', 'admin_session_test');
        $this->assertEquals(200, $res['code']);
    }

    public function testUpdateRoleAsSolicitanteIsBlocked() {
        $res = $this->request('POST', '/api/admin/users/2/role', 'user_session_test', ['role' => 'admin']);
        $this->assertEquals(403, $res['code']); // Solicitantes can't update users
        
        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        $role = $pdo->query("SELECT role FROM users WHERE id=2")->fetchColumn();
        $this->assertEquals('solicitante', $role);
    }
    
    public function testCreateEditionAsSolicitanteIs403() {
        $res = $this->request('POST', '/api/editions', 'user_session_test', ['status' => 'Borrador']);
        $this->assertEquals(403, $res['code']);
    }
    
    public function testUploadWithoutTokenIs401() {
        $res = $this->request('POST', '/api/files');
        $this->assertEquals(401, $res['code']);
    }
    
    public function testStatsAsSolicitanteIs403() {
        $res = $this->request('GET', '/api/stats', 'user_session_test');
        $this->assertEquals(403, $res['code']);
    }
}
