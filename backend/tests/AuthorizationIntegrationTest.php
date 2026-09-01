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
        $pdo->exec("CREATE TABLE legal_requests (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, status TEXT NOT NULL, total_bs NUMERIC, deleted_at TEXT, name TEXT, order_no TEXT, document TEXT, date TEXT, meta TEXT, edition_code TEXT, publish_date TEXT, pub_type TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE legal_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, ref TEXT, date TEXT, bank TEXT, type TEXT, amount_bs NUMERIC, status TEXT, mobile_phone TEXT, comment TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE legal_files (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, file_id INTEGER NOT NULL, kind TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE edition_orders (edition_id INTEGER NOT NULL, legal_request_id INTEGER NOT NULL, publication_file_id INTEGER, publication_file_name TEXT, publication_checksum TEXT, publication_source TEXT, publication_prepared_at TEXT, publication_updated_at TEXT, PRIMARY KEY(edition_id, legal_request_id))");
        $pdo->exec("CREATE TABLE files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, size INTEGER, type TEXT, checksum TEXT, version INTEGER, status TEXT, owner TEXT, is_public INTEGER DEFAULT 0, deleted_at TEXT, created_at TEXT, updated_at TEXT)");
        $pdo->exec("CREATE TABLE file_events (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER NOT NULL, ts TEXT NOT NULL, type TEXT NOT NULL, message TEXT)");
        $pdo->exec("CREATE TABLE settings (`key` TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
        $pdo->exec("CREATE TABLE payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, bank TEXT, account TEXT, holder TEXT, rif TEXT, phone TEXT, qr_file_id INTEGER, qr_updated_at TEXT, created_at TEXT NOT NULL)");
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
        $pdo->exec("INSERT INTO settings VALUES('price_per_folio_usd','3.00','$createdAt','$createdAt'),('raptor_mini_preview_enabled','1','$createdAt','$createdAt')");
        $pdo->exec("INSERT INTO files(id,name,type,status,is_public,created_at,updated_at) VALUES(200,'banner.png','png','processed',0,'$createdAt','$createdAt')");

        $cmd = [PHP_BINARY, '-S', '127.0.0.1:' . self::$port, '-t', realpath(__DIR__ . '/../public')];
        $nullDevice = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null';
        self::$process = proc_open($cmd, [
            0 => ['pipe', 'r'],
            // The built-in server writes one access line per request. Leaving these
            // as unread pipes eventually fills the buffer and stalls the suite.
            1 => ['file', $nullDevice, 'a'],
            2 => ['file', $nullDevice, 'a']
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

    private function requestMultipart(string $uri, string $sessionId, string $field, string $filename, string $mime, string $contents): array {
        $boundary = '----DiarioMercantil' . bin2hex(random_bytes(8));
        $payload = "--{$boundary}\r\n"
            . "Content-Disposition: form-data; name=\"{$field}\"; filename=\"{$filename}\"\r\n"
            . "Content-Type: {$mime}\r\n\r\n"
            . $contents . "\r\n--{$boundary}--\r\n";
        $context = ['http' => [
            'method' => 'POST',
            'ignore_errors' => true,
            'header' => "Content-Type: multipart/form-data; boundary={$boundary}\r\n"
                . "Cookie: dm_session={$sessionId}; dm_csrf=test_csrf\r\n"
                . "X-CSRF-Token: test_csrf\r\n",
            'content' => $payload,
        ]];
        $response = @file_get_contents(
            'http://127.0.0.1:' . self::$port . $uri,
            false,
            stream_context_create($context)
        );
        $code = 0;
        if (isset($http_response_header[0]) && preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $matches)) {
            $code = (int)$matches[1];
        }
        return ['code'=>$code, 'body'=>json_decode((string)$response, true)];
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

    public function testForcedBcvRefreshRequiresAdmin(): void {
        $withoutSession = $this->request('POST', '/api/admin/rate/bcv/refresh');
        $this->assertSame(401, $withoutSession['code']);

        $asApplicant = $this->request('POST', '/api/admin/rate/bcv/refresh', 'user_session_test');
        $this->assertSame(403, $asApplicant['code']);
    }

    public function testLegalListFiltersPublicationTypeAndPartialEditionCode(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date,pub_type,created_at) VALUES(160,2,'Publicada',100,'Documento filtrable','2026-08-30','Documento','2026-08-30 10:00:00')");
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date,pub_type,created_at) VALUES(161,2,'Borrador',100,'Convocatoria filtrable','2026-08-30','Convocatoria','2026-08-30 11:00:00')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(60,'MMXXVI-0060','Publicada','2026-08-30',0,1,'2026-08-30',2026,NULL)");
        $pdo->exec("INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(60,160)");

        $byType = $this->request('GET', '/api/legal?pub_type=Convocatoria', 'admin_session_test');
        $this->assertSame(200, $byType['code'], json_encode($byType['body']));
        $this->assertSame([161], array_map('intval', array_column($byType['body']['items'] ?? [], 'id')));

        $byEdition = $this->request('GET', '/api/legal?edition_code=0060', 'admin_session_test');
        $this->assertSame(200, $byEdition['code'], json_encode($byEdition['body']));
        $this->assertSame([160], array_map('intval', array_column($byEdition['body']['items'] ?? [], 'id')));
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

    public function testAdminCanPersistSettingsAndPublishBanner(): void {
        $saved = $this->request('POST', '/api/admin/settings', 'admin_session_test', [
            'price_per_folio_usd' => 4.25,
            'raptor_mini_preview_enabled' => '1',
            'banner_header_global' => '/api/uploads/200',
            'banner_main_1' => '/api/uploads/200',
            'banner_history_1' => '/api/uploads/200',
        ]);
        $this->assertSame(200, $saved['code'], json_encode($saved['body']));
        $this->assertSame('4.25', Database::pdo()->query(
            "SELECT value FROM settings WHERE `key`='price_per_folio_usd'"
        )->fetchColumn());
        $this->assertSame(1, (int) Database::pdo()->query(
            'SELECT is_public FROM files WHERE id=200'
        )->fetchColumn());

        $public = $this->request('GET', '/api/settings');
        $this->assertSame(200, $public['code'], json_encode($public['body']));
        $this->assertSame('/api/uploads/200', $public['body']['settings']['banner_header_global'] ?? null);
        $this->assertSame('/api/uploads/200', $public['body']['settings']['banner_main_1'] ?? null);
        $this->assertSame('/api/uploads/200', $public['body']['settings']['banner_history_1'] ?? null);
    }

    public function testAdminCanCreateAndUpdatePaymentMethodVisibleToApplicant(): void {
        $created = $this->request('POST', '/api/payments', 'admin_session_test', [
            'bank' => 'Banco de Venezuela',
            'holder' => 'Diario Mercantil',
            'rif' => 'J-12345678-9',
            'phone' => '04121234567',
        ]);
        $this->assertSame(201, $created['code'], json_encode($created['body']));
        $id = (int)($created['body']['id'] ?? 0);
        $this->assertGreaterThan(0, $id);

        $visible = $this->request('GET', '/api/payment-methods', 'user_session_test');
        $this->assertSame(200, $visible['code'], json_encode($visible['body']));
        $this->assertSame('04121234567', $visible['body']['items'][0]['phone'] ?? null);

        $updated = $this->request('PUT', '/api/payments/' . $id, 'admin_session_test', [
            'bank' => 'Banesco',
            'holder' => 'Diario Mercantil Actualizado',
            'rif' => 'J-12345678-9',
            'phone' => '04141234567',
        ]);
        $this->assertSame(200, $updated['code'], json_encode($updated['body']));

        $refreshed = $this->request('GET', '/api/payment-methods', 'user_session_test');
        $this->assertSame('Banesco', $refreshed['body']['items'][0]['bank'] ?? null);
        $this->assertSame('04141234567', $refreshed['body']['items'][0]['phone'] ?? null);

        $blocked = $this->request('PUT', '/api/payments/' . $id, 'user_session_test', [
            'bank' => 'Otro banco',
            'holder' => 'No autorizado',
            'rif' => 'J-00000000-0',
            'phone' => '04161234567',
        ]);
        $this->assertSame(403, $blocked['code']);
    }

    public function testAdminCanUploadReplaceAndRemoveAuthenticatedPaymentQr(): void {
        $created = $this->request('POST', '/api/payments', 'admin_session_test', [
            'bank' => 'Banco de Venezuela',
            'holder' => 'Diario Mercantil QR',
            'rif' => 'J-12345678-9',
            'phone' => '04121234567',
        ]);
        $id = (int)($created['body']['id'] ?? 0);
        $this->assertGreaterThan(0, $id, json_encode($created['body']));

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        $this->assertIsString($png);
        $uploaded = $this->requestMultipart('/api/payments/' . $id . '/qr', 'admin_session_test', 'qr', 'pago.png', 'image/png', $png);
        $this->assertSame(200, $uploaded['code'], json_encode($uploaded['body']));
        $this->assertNotEmpty($uploaded['body']['qr_url'] ?? null);

        $visible = $this->request('GET', '/api/payment-methods', 'user_session_test');
        $row = array_values(array_filter($visible['body']['items'] ?? [], static fn(array $item): bool => (int)$item['id'] === $id))[0] ?? [];
        $this->assertSame('/api/payment-methods/' . $id . '/qr', $row['qr_url'] ?? null);
        $this->assertSame(200, $this->request('GET', '/api/payment-methods/' . $id . '/qr', 'user_session_test')['code']);
        $this->assertSame(403, $this->request('DELETE', '/api/payments/' . $id . '/qr', 'user_session_test')['code']);

        $removed = $this->request('DELETE', '/api/payments/' . $id . '/qr', 'admin_session_test');
        $this->assertSame(200, $removed['code'], json_encode($removed['body']));
        $qrState = Database::pdo()->query("SELECT qr_file_id FROM payment_methods WHERE id={$id}")->fetch(PDO::FETCH_ASSOC);
        $this->assertNull($qrState['qr_file_id'] ?? null);
        $this->assertSame('delete_payment_qr', Database::pdo()->query(
            "SELECT action FROM audit_logs WHERE resource_type='payment_method' AND resource_id={$id} ORDER BY id DESC LIMIT 1"
        )->fetchColumn());
    }

    public function testDeletingEditionIsPermanentAndRequeuesRequests(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,order_no,date,edition_code,publish_date) VALUES(150,2,'Publicada',100,'Publicada retirada','ORD-150','2026-08-30','MMXXVI-0050','2026-08-30')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(50,'MMXXVI-0050','Publicada','2026-08-30',50,1,'2026-08-30',2026,NULL)");
        $pdo->exec("INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(50,150)");

        $deleted = $this->request('DELETE', '/api/editions/50', 'admin_session_test');
        $this->assertSame(200, $deleted['code'], json_encode($deleted['body']));
        $this->assertTrue((bool)($deleted['body']['deleted'] ?? false));
        $this->assertSame(0, (int)$pdo->query('SELECT COUNT(*) FROM editions WHERE id=50')->fetchColumn());
        $this->assertSame(0, (int)$pdo->query('SELECT COUNT(*) FROM edition_orders WHERE edition_id=50')->fetchColumn());
        $this->assertSame('En trámite', $pdo->query('SELECT status FROM legal_requests WHERE id=150')->fetchColumn());

        $detail = $this->request('GET', '/api/legal/150', 'admin_session_test');
        $this->assertSame(200, $detail['code'], json_encode($detail['body']));
        $this->assertEmpty($detail['body']['item']['edition_code'] ?? null);
        $this->assertEmpty($detail['body']['item']['edition_file_url'] ?? null);

        $restored = $this->request('POST', '/api/editions/50/restore', 'admin_session_test');
        $this->assertSame(404, $restored['code'], json_encode($restored['body']));
    }

    public function testAdminCanPermanentlyDeletePublishedRequestAndItsEdition(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,order_no,date,edition_code,publish_date) VALUES(151,2,'Publicada',100,'Publicación a borrar','ORD-151','2026-08-31','MMXXVI-0051','2026-08-31')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(51,'MMXXVI-0051','Publicada','2026-08-31',51,1,'2026-08-31',2026,NULL)");
        $pdo->exec("INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(51,151)");

        $deleted = $this->request('DELETE', '/api/legal/151', 'admin_session_test');

        $this->assertSame(200, $deleted['code'], json_encode($deleted['body']));
        $this->assertTrue((bool)($deleted['body']['deleted'] ?? false));
        $this->assertSame(1, (int)($deleted['body']['deleted_editions'] ?? 0));
        $this->assertSame(0, (int)$pdo->query('SELECT COUNT(*) FROM legal_requests WHERE id=151')->fetchColumn());
        $this->assertSame(0, (int)$pdo->query('SELECT COUNT(*) FROM editions WHERE id=51')->fetchColumn());
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
