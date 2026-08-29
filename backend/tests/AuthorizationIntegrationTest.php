<?php
use PHPUnit\Framework\TestCase;

class AuthorizationIntegrationTest extends TestCase {
    
    private static $process;
    private static $pipes = [];
    private static $port = 0;
    private static string $dbPath;
    
    public static function setUpBeforeClass(): void {
        self::$port = random_int(18080, 18980);
        self::$dbPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm_authorization_' . getmypid() . '.sqlite';
        if (is_file(self::$dbPath)) unlink(self::$dbPath);
        putenv('DB_CONNECTION=sqlite');
        putenv('DB_PATH=' . self::$dbPath);

        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, role TEXT NOT NULL, name TEXT NOT NULL, document TEXT NOT NULL, email TEXT, phone TEXT, password_hash TEXT, status TEXT, person_type TEXT DEFAULT 'natural', state TEXT, municipality TEXT, address TEXT, created_at DATETIME, updated_at DATETIME)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, payload TEXT, last_activity INTEGER, token_hash VARCHAR(255), revoked_at DATETIME, expires_at DATETIME)");
        $pdo->exec("CREATE TABLE editions (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, status TEXT NOT NULL, date TEXT, edition_no INTEGER NOT NULL, orders_count INTEGER DEFAULT 0, created_at TEXT, publication_year INTEGER NOT NULL, file_id INTEGER, deleted_at TEXT, UNIQUE(publication_year, edition_no))");
        $pdo->exec("CREATE TABLE legal_requests (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, status TEXT NOT NULL, total_bs NUMERIC, deleted_at TEXT, name TEXT, order_no TEXT, document TEXT, date TEXT, meta TEXT, edition_code TEXT)");
        $pdo->exec("CREATE TABLE legal_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, ref TEXT, date TEXT, bank TEXT, type TEXT, amount_bs NUMERIC, status TEXT, mobile_phone TEXT, comment TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE edition_orders (edition_id INTEGER NOT NULL, legal_request_id INTEGER NOT NULL, PRIMARY KEY(edition_id, legal_request_id))");
        $pdo->exec("CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER, action TEXT, resource_type TEXT, resource_id INTEGER)");
        $pdo->prepare("DELETE FROM sessions")->execute();
        $pdo->prepare("DELETE FROM users")->execute();
        
        $now = time();
        $createdAt = date('Y-m-d H:i:s', $now);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 day', $now));
        
        // Admin
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password_hash, status, created_at, updated_at) VALUES(1, 'admin', 'Admin', 'V123', 'admin@test.com', 'pwd', 'active', '$createdAt', '$createdAt')")->execute();
        $tokenHashAdmin = hash('sha256', 'admin_session_test');
        $pdo->prepare("INSERT INTO sessions(id, user_id, last_activity, token_hash, expires_at) VALUES('admin_session_test', 1, $now, '$tokenHashAdmin', '$expiresAt')")->execute();
        
        // User
        $pdo->prepare("INSERT INTO users(id, role, name, document, email, password_hash, status, created_at, updated_at) VALUES(2, 'solicitante', 'User', 'V456', 'user@test.com', 'pwd', 'active', '$createdAt', '$createdAt')")->execute();
        $tokenHashUser = hash('sha256', 'user_session_test');
        $pdo->prepare("INSERT INTO sessions(id, user_id, last_activity, token_hash, expires_at) VALUES('user_session_test', 2, $now, '$tokenHashUser', '$expiresAt')")->execute();

        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date) VALUES(100,2,'En trámite',100,'Solicitud admin','2026-08-29')");
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date) VALUES(101,2,'Borrador',100,'Solicitud usuario','2026-08-29')");
        $pdo->exec("INSERT INTO legal_payments(legal_request_id,ref,date,bank,type,amount_bs,status,mobile_phone,created_at) VALUES(100,'1111','2026-08-29','Banco de Venezuela','pago_movil',80,'Aprobado','04121234567','$createdAt')");

        $cmd = [PHP_BINARY, '-S', '127.0.0.1:' . self::$port, '-t', realpath(__DIR__ . '/../public')];
        self::$process = proc_open($cmd, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ], self::$pipes);
        sleep(2);
    }
    
    public static function tearDownAfterClass(): void {
        if (self::$process) {
            proc_terminate(self::$process);
            foreach (self::$pipes as $pipe) {
                if (is_resource($pipe)) fclose($pipe);
            }
            proc_close(self::$process);
        }
        $property = new ReflectionProperty(Database::class, 'pdo');
        $property->setValue(null, null);
        if (isset(self::$dbPath) && is_file(self::$dbPath)) unlink(self::$dbPath);
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

    public function testSQLiteEditionCounterCreatesConsecutiveRomanCodes() {
        $first = $this->request('POST', '/api/editions', 'admin_session_test', [
            'date' => '2026-08-29',
            'orders' => [],
        ]);
        $second = $this->request('POST', '/api/editions', 'admin_session_test', [
            'date' => '2026-08-30',
            'orders' => [],
        ]);

        $this->assertSame(200, $first['code'], json_encode($first['body']));
        $this->assertSame('MMXXVI-0001', $first['body']['code'] ?? null);
        $this->assertSame(200, $second['code'], json_encode($second['body']));
        $this->assertSame('MMXXVI-0002', $second['body']['code'] ?? null);
    }

    public function testAdminCannotReportMoreThanRemainingAndCanVerifyOnePayment() {
        $overpayment = $this->request('POST', '/api/legal/100/payments', 'admin_session_test', [
            'ref' => '2222',
            'date' => '2026-08-29',
            'bank' => 'Banco de Venezuela',
            'type' => 'pago_movil',
            'mobile_phone' => '04121234567',
            'amount_bs' => 30,
        ]);
        $this->assertSame(422, $overpayment['code'], json_encode($overpayment['body']));
        $this->assertSame('payment_exceeds_remaining', $overpayment['body']['error'] ?? null);
        $this->assertEquals(20, $overpayment['body']['remaining_bs'] ?? null);

        $accepted = $this->request('POST', '/api/legal/100/payments', 'admin_session_test', [
            'ref' => '2222',
            'date' => '2026-08-29',
            'bank' => 'Banco de Venezuela',
            'type' => 'pago_movil',
            'mobile_phone' => '04121234567',
            'amount_bs' => 20,
        ]);
        $this->assertSame(200, $accepted['code'], json_encode($accepted['body']));
        $paymentId = (int)($accepted['body']['payment_id'] ?? 0);
        $this->assertGreaterThan(0, $paymentId);

        $verified = $this->request('POST', '/api/legal/100/payments/' . $paymentId . '/verify', 'admin_session_test');
        $this->assertSame(200, $verified['code'], json_encode($verified['body']));

        $pdo = Database::pdo();
        $this->assertSame('Aprobado', $pdo->query("SELECT status FROM legal_payments WHERE id=$paymentId")->fetchColumn());
        $this->assertSame('En trámite', $pdo->query("SELECT status FROM legal_requests WHERE id=100")->fetchColumn());
    }

    public function testApplicantPaymentAmountIsAlwaysTheCalculatedRemaining() {
        $accepted = $this->request('POST', '/api/legal/101/payments', 'user_session_test', [
            'ref' => '3333',
            'date' => '2026-08-29',
            'bank' => 'Banco de Venezuela',
            'type' => 'pago_movil',
            'mobile_phone' => '04141234567',
            'amount_bs' => 1,
        ]);
        $this->assertSame(200, $accepted['code'], json_encode($accepted['body']));

        $paymentId = (int)($accepted['body']['payment_id'] ?? 0);
        $amount = Database::pdo()->query("SELECT amount_bs FROM legal_payments WHERE id=$paymentId")->fetchColumn();
        $this->assertEquals(100, $amount);
    }
}
