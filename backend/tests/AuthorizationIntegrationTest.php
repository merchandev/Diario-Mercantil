<?php
use PHPUnit\Framework\TestCase;

class AuthorizationIntegrationTest extends TestCase {
    
    private static $process;
    private static $port = 8080;
    
    public static function setUpBeforeClass(): void {
        // Start built-in PHP server
        $cmd = 'php -S 127.0.0.1:' . self::$port . ' -t ' . __DIR__ . '/../public';
        self::$process = proc_open($cmd, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ], $pipes);
        
        sleep(2); // Wait for server to start
        
        // Ensure Database
        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        
        // Disable FK checks
        try { $pdo->exec("PRAGMA foreign_keys = OFF"); } catch (Exception $e) {}
        try { $pdo->exec("SET FOREIGN_KEY_CHECKS = 0"); } catch (Exception $e) {}
        
        // Seed users
        $pdo->prepare("DELETE FROM personal_access_tokens")->execute();
        $pdo->prepare("DELETE FROM users")->execute();
        
        // Admin user
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password, status) VALUES(1, 'admin', 'Admin', 'V123', 'admin@test.com', 'pwd', 'active')")->execute();
        $pdo->prepare("INSERT INTO personal_access_tokens(tokenable_id, name, token, expires_at) VALUES(1, 'auth', 'admin_token', '2099-01-01')")->execute();
        
        // Regular user (solicitante)
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password, status) VALUES(2, 'solicitante', 'User', 'V456', 'user@test.com', 'pwd', 'active')")->execute();
        $pdo->prepare("INSERT INTO personal_access_tokens(tokenable_id, name, token, expires_at) VALUES(2, 'auth', 'user_token', '2099-01-01')")->execute();
    }
    
    public static function tearDownAfterClass(): void {
        if (self::$process) {
            proc_terminate(self::$process);
        }
    }
    
    private function request($method, $uri, $token = null, $body = []) {
        $context = [
            'http' => [
                'method' => $method,
                'ignore_errors' => true,
                'header' => "Content-Type: application/json\r\n"
            ]
        ];
        
        if ($token) {
            $context['http']['header'] .= "Authorization: Bearer $token\r\n";
        }
        
        if (!empty($body)) {
            $context['http']['content'] = json_encode($body);
        }
        
        $url = 'http://127.0.0.1:' . self::$port . $uri;
        $response = file_get_contents($url, false, stream_context_create($context));
        
        // Parse HTTP code
        preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $matches);
        $code = (int)$matches[1];
        
        return ['code' => $code, 'body' => json_decode($response, true)];
    }
    
    public function testListUsersWithoutTokenIs401() {
        $res = $this->request('GET', '/api/users');
        $this->assertEquals(401, $res['code']);
    }

    public function testListUsersAsSolicitanteIs403() {
        $res = $this->request('GET', '/api/users', 'user_token');
        $this->assertEquals(403, $res['code']);
    }

    public function testListUsersAsAdminIs200() {
        $res = $this->request('GET', '/api/users', 'admin_token');
        $this->assertEquals(200, $res['code']);
    }

    public function testUpdateRoleAsSolicitanteIsBlocked() {
        $res = $this->request('PUT', '/api/user/profile', 'user_token', ['role' => 'admin']);
        
        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        $role = $pdo->query("SELECT role FROM users WHERE id=2")->fetchColumn();
        $this->assertEquals('solicitante', $role);
    }
    
    public function testCreateEditionAsSolicitanteIs403() {
        $res = $this->request('POST', '/api/editions', 'user_token', []);
        $this->assertEquals(403, $res['code']);
    }
    
    public function testUploadWithoutTokenIs401() {
        $res = $this->request('POST', '/api/files');
        $this->assertEquals(401, $res['code']);
    }
    
    public function testStatsAsSolicitanteIs403() {
        $res = $this->request('GET', '/api/system/stats', 'user_token');
        $this->assertEquals(403, $res['code']);
    }
    
}
