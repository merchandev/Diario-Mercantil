<?php
use PHPUnit\Framework\TestCase;

class AuthorizationIntegrationTest extends TestCase {
    
    private static $process;
    private static $pipes = [];
    private static $port = 0;
    private static string $dbPath;
    private static string $uploadDir;
    
    public static function setUpBeforeClass(): void {
        self::$port = random_int(18080, 18980);
        self::$dbPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm_authorization_' . getmypid() . '.sqlite';
        if (is_file(self::$dbPath)) unlink(self::$dbPath);
        self::$uploadDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm_authorization_uploads_' . getmypid();
        if (!is_dir(self::$uploadDir)) mkdir(self::$uploadDir, 0750, true);
        putenv('DB_CONNECTION=sqlite');
        putenv('DB_PATH=' . self::$dbPath);
        putenv('UPLOAD_DIR=' . self::$uploadDir);

        require_once __DIR__ . '/../src/Database.php';
        $pdo = Database::pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, role TEXT NOT NULL, name TEXT NOT NULL, document TEXT NOT NULL, email TEXT, phone TEXT, password_hash TEXT, status TEXT, person_type TEXT DEFAULT 'natural', state TEXT, municipality TEXT, address TEXT, created_at DATETIME, updated_at DATETIME)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, payload TEXT, last_activity INTEGER, token_hash VARCHAR(255), revoked_at DATETIME, expires_at DATETIME)");
        $pdo->exec("CREATE TABLE edition_sequences (publication_year INTEGER PRIMARY KEY, last_number INTEGER NOT NULL)");
        $pdo->exec("CREATE TABLE editions (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, cve TEXT UNIQUE, status TEXT NOT NULL, date TEXT, edition_no INTEGER NOT NULL, orders_count INTEGER DEFAULT 0, created_at TEXT, publication_year INTEGER NOT NULL, file_id INTEGER, deleted_at TEXT, published_file_checksum TEXT, published_at TEXT, published_by INTEGER, file_name TEXT)");
        $pdo->exec("CREATE UNIQUE INDEX edition_active_number ON editions(publication_year,edition_no) WHERE deleted_at IS NULL");
        $pdo->exec("CREATE UNIQUE INDEX edition_active_code ON editions(code) WHERE deleted_at IS NULL");
        $pdo->exec("CREATE TABLE edition_link_aliases(alias TEXT PRIMARY KEY,edition_id INTEGER NOT NULL)");
        $pdo->exec("CREATE TABLE legal_requests (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, status TEXT NOT NULL, total_bs NUMERIC, deleted_at TEXT, name TEXT, order_no TEXT, document TEXT, date TEXT, meta TEXT, edition_code TEXT, publish_date TEXT, pub_type TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE legal_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, ref TEXT, date TEXT, bank TEXT, type TEXT, amount_bs NUMERIC, status TEXT, mobile_phone TEXT, comment TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE legal_files (id INTEGER PRIMARY KEY AUTOINCREMENT, legal_request_id INTEGER NOT NULL, file_id INTEGER NOT NULL, kind TEXT, created_at TEXT)");
        $pdo->exec("CREATE TABLE edition_orders (edition_id INTEGER NOT NULL, legal_request_id INTEGER NOT NULL, publication_file_id INTEGER, publication_file_name TEXT, publication_checksum TEXT, publication_source TEXT, publication_prepared_at TEXT, publication_updated_at TEXT, PRIMARY KEY(edition_id, legal_request_id))");
        $pdo->exec("CREATE TABLE files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, size INTEGER, type TEXT, checksum TEXT, version INTEGER, status TEXT, owner TEXT, is_public INTEGER DEFAULT 0, deleted_at TEXT, created_at TEXT, updated_at TEXT)");
        $pdo->exec("CREATE TABLE file_events (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER NOT NULL, ts TEXT NOT NULL, type TEXT NOT NULL, message TEXT)");
        $pdo->exec("CREATE TABLE settings (`key` TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
        $pdo->exec("CREATE TABLE payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, bank TEXT, account TEXT, holder TEXT, rif TEXT, phone TEXT, qr_file_id INTEGER, qr_updated_at TEXT, created_at TEXT NOT NULL)");
        $pdo->exec("CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER, action TEXT, resource_type TEXT, resource_id INTEGER)");
        $pdo->exec("CREATE TABLE edition_archives (id INTEGER PRIMARY KEY AUTOINCREMENT, edition_id INTEGER NOT NULL, file_id INTEGER, snapshot_json TEXT NOT NULL, actor_user_id INTEGER, reason TEXT NOT NULL, created_at TEXT NOT NULL)");
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
        if (isset(self::$uploadDir) && is_dir(self::$uploadDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(self::$uploadDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($iterator as $item) {
                $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
            }
            rmdir(self::$uploadDir);
        }
        putenv('UPLOAD_DIR');
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
        
        return ['code' => $code, 'body' => json_decode((string)$response, true), 'raw' => (string)$response];
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

    public function testLegalDownloadContractReportsOnlyPhysicallyAvailableEditionFiles(): void
    {
        exec('pdfinfo -v 2>&1', $output, $returnCode);
        if ($returnCode !== 0) {
            $this->markTestSkipped('poppler-utils (pdfinfo) no está instalado.');
        }

        $pdo = Database::pdo();
        require_once __DIR__ . '/../src/fpdf.php';
        $pdf = new FPDF();
        $pdf->AddPage();
        $pdf->SetFont('Arial', '', 12);
        $pdf->Cell(0, 10, 'EDICION FINAL OFICIAL');
        $contents = $pdf->Output('S');
        file_put_contents(self::$uploadDir . DIRECTORY_SEPARATOR . 'available-edition.pdf', $contents);
        $checksum = hash('sha256', $contents);
        $pdo->prepare("INSERT INTO files(id,name,path,size,type,checksum,status,created_at,updated_at) VALUES(201,'available.pdf','available-edition.pdf',?,'pdf',?,'processed','2026-09-01','2026-09-01')")
            ->execute([strlen($contents), $checksum]);
        $pdo->exec("INSERT INTO files(id,name,path,size,type,checksum,status,created_at,updated_at) VALUES(202,'missing.pdf','missing-edition.pdf',25,'pdf','deadbeef','processed','2026-09-01','2026-09-01')");
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date,created_at) VALUES(164,2,'Publicada',100,'Con PDF','2026-09-01','2026-09-01'),(165,2,'Publicada',100,'Sin PDF','2026-09-01','2026-09-01')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(61,'MMXXV-0061','Publicada','2025-09-01',61,1,'2025-09-01',2025,201),(62,'MMXXV-0062','Publicada','2025-09-01',62,1,'2025-09-01',2025,202)");
        $pdo->prepare('UPDATE editions SET published_file_checksum=? WHERE id=61')->execute([$checksum]);
        $pdo->exec('INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(61,164),(62,165)');

        $response = $this->request('GET', '/api/legal', 'admin_session_test');
        $this->assertSame(200, $response['code'], json_encode($response['body']));
        $items = [];
        foreach ($response['body']['items'] ?? [] as $item) $items[(int) $item['id']] = $item;
        $this->assertTrue($items[164]['edition_has_file'] ?? false);
        $this->assertSame('/api/e/code/MMXXV-0061/download', $items[164]['edition_file_url'] ?? null);
        $this->assertFalse($items[165]['edition_has_file'] ?? true);
        $this->assertNull($items[165]['edition_file_url'] ?? null);
    }

    public function testSQLiteEditionCounterCreatesConsecutiveRomanCodes() {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,date,created_at) VALUES(162,2,'En trámite',100,'Correlativo uno','2026-08-29','2026-08-29'),(163,2,'En trámite',100,'Correlativo dos','2026-08-30','2026-08-30')");
        $first = $this->request('POST', '/api/editions', 'admin_session_test', [
            'date' => '2026-08-29',
            'orders' => [162],
        ]);
        $second = $this->request('POST', '/api/editions', 'admin_session_test', [
            'date' => '2026-08-30',
            'orders' => [163],
        ]);

        $this->assertSame(200, $first['code'], json_encode($first['body']));
        $this->assertSame('MMXXVI-0001', $first['body']['code'] ?? null);
        $this->assertSame(200, $second['code'], json_encode($second['body']));
        $this->assertSame('MMXXVI-0002', $second['body']['code'] ?? null);
        $this->assertSame('Borrador', $pdo->query('SELECT status FROM editions WHERE id=' . (int)$first['body']['id'])->fetchColumn());
        $this->assertSame('En trámite', $pdo->query('SELECT status FROM legal_requests WHERE id=162')->fetchColumn());
    }

    public function testEditionCreationStaysDraftForOneTwoThreeAndTenRequests(): void
    {
        $pdo = Database::pdo();
        $nextRequestId = 170;
        foreach ([1, 2, 3, 10] as $scenario => $count) {
            $ids = [];
            for ($index = 0; $index < $count; $index++) {
                $id = $nextRequestId++;
                $ids[] = $id;
                $pdo->prepare('INSERT INTO legal_requests(id,user_id,status,total_bs,name,date,created_at) VALUES(?,?,?,?,?,?,?)')
                    ->execute([$id, 2, 'En trámite', 100, "Solicitud {$id}", '2026-09-01', '2026-09-01']);
            }
            $created = $this->request('POST', '/api/editions', 'admin_session_test', [
                'date' => sprintf('2026-09-%02d', $scenario + 1),
                'orders' => $ids,
            ]);
            $this->assertSame(200, $created['code'], json_encode($created['body']));
            $editionId = (int) ($created['body']['id'] ?? 0);
            $this->assertSame('Borrador', $pdo->query("SELECT status FROM editions WHERE id={$editionId}")->fetchColumn());
            $this->assertSame($count, (int) $pdo->query("SELECT COUNT(*) FROM edition_orders WHERE edition_id={$editionId}")->fetchColumn());
            $this->assertSame($count, (int) $pdo->query('SELECT COUNT(*) FROM legal_requests WHERE status=\'En trámite\' AND id IN (' . implode(',', $ids) . ')')->fetchColumn());
        }
    }

    public function testEditionCreationRejectsAnEmptySelection(): void
    {
        $created = $this->request('POST', '/api/editions', 'admin_session_test', [
            'date' => '2026-09-10',
            'orders' => [],
        ]);
        $this->assertSame(422, $created['code'], json_encode($created['body']));
        $this->assertStringContainsString('al menos una solicitud', $created['body']['error'] ?? '');
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

    public function testTrashingPublishedEditionRequeuesItsRequests(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,order_no,date,edition_code,publish_date) VALUES(150,2,'Publicada',100,'Publicada retirada','ORD-150','2026-08-30','MMXXVI-0050','2026-08-30')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(50,'MMXXVI-0050','Publicada','2026-08-30',50,1,'2026-08-30',2026,NULL)");
        $pdo->exec("INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(50,150)");

        $deleted = $this->request('DELETE', '/api/editions/50', 'admin_session_test');
        // DELETE now soft-deletes (sends to trash) and requeues requests → 200
        $this->assertSame(200, $deleted['code'], json_encode($deleted['body']));
        $this->assertSame(1, $deleted['body']['requests_requeued'] ?? null);
        // The edition must be soft-deleted
        $this->assertNotEmpty($pdo->query('SELECT deleted_at FROM editions WHERE id=50')->fetchColumn());
        // The request must have been re-queued to Por verificar
        $this->assertSame('Por verificar', $pdo->query('SELECT status FROM legal_requests WHERE id=150')->fetchColumn());
        $retired = $this->request('GET', '/api/editions-retired', 'admin_session_test');
        $this->assertSame(200, $retired['code']);
        $item = array_values(array_filter($retired['body']['items'], fn($item) => (int)$item['id'] === 50))[0];
        $this->assertTrue($item['can_permanently_delete']);
        // Administrators can explicitly delete trashed editions, preserving requeued requests.
        $perm = $this->request('DELETE', '/api/editions/50/permanent', 'admin_session_test');
        $this->assertSame(200, $perm['code'], json_encode($perm['body']));
        $this->assertSame(0, (int)$pdo->query('SELECT COUNT(*) FROM editions WHERE id=50')->fetchColumn());
        $this->assertSame('Por verificar', $pdo->query('SELECT status FROM legal_requests WHERE id=150')->fetchColumn());
    }

    public function testAdminCannotTrashRequestInPublishedEdition(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name,order_no,date,edition_code,publish_date) VALUES(151,2,'Publicada',100,'Publicación a borrar','ORD-151','2026-08-31','MMXXVI-0051','2026-08-31')");
        $pdo->exec("INSERT INTO editions(id,code,status,date,edition_no,orders_count,created_at,publication_year,file_id) VALUES(51,'MMXXVI-0051','Publicada','2026-08-31',51,1,'2026-08-31',2026,NULL)");
        $pdo->exec("INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(51,151)");

        $deleted = $this->request('DELETE', '/api/legal/151', 'admin_session_test');

        $this->assertSame(409, $deleted['code'], json_encode($deleted['body']));
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
    public function testFinalPdfWorkflowSameDayRetirementAndSnapshot(): void {
        require_once __DIR__ . '/../src/fpdf.php';
        $pdo = Database::pdo();
        $pdf = new FPDF(); $pdf->AddPage(); $pdf->SetFont('Arial', '', 12); $pdf->Cell(0,10,'FINAL OFICIAL');
        $contents = $pdf->Output('S');
        $sha = hash('sha256', $contents);
        $ids = [];
        foreach ([601,602] as $requestId) {
            $pdo->prepare("INSERT INTO legal_requests(id,user_id,status,name,date,total_bs) VALUES(?,2,'En trámite','Solicitud V2','2026-09-01',100)")->execute([$requestId]);
            $created = $this->request('POST','/api/editions','admin_session_test',['date'=>'2026-09-01','orders'=>[$requestId]]);
            $this->assertSame(200,$created['code'],json_encode($created['body']));
            $id = $created['body']['id']; $ids[] = $id;
            $before = $pdo->query('SELECT * FROM editions WHERE id=' . $id)->fetch(PDO::FETCH_ASSOC);
            $blocked = $this->request('POST',"/api/editions/{$id}/publish",'admin_session_test');
            $this->assertSame(409,$blocked['code']);
            $this->assertSame($before,$pdo->query('SELECT * FROM editions WHERE id=' . $id)->fetch(PDO::FETCH_ASSOC));
            $uploaded = $this->requestMultipart("/api/editions/{$id}/pdf",'admin_session_test','file','final.pdf','application/pdf',$contents);
            $this->assertSame(200,$uploaded['code'],json_encode($uploaded['body']));
            $ready = $this->request('GET',"/api/editions/{$id}/readiness",'admin_session_test');
            $this->assertTrue($ready['body']['ready']);
            $filesBefore = $pdo->query('SELECT * FROM files ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
            $published = $this->request('POST',"/api/editions/{$id}/publish",'admin_session_test');
            $this->assertSame(200,$published['code'],json_encode($published['body']));
            $this->assertSame($filesBefore,$pdo->query('SELECT * FROM files ORDER BY id')->fetchAll(PDO::FETCH_ASSOC));
            $this->assertSame(409,$this->request('POST',"/api/editions/{$id}/publish",'admin_session_test')['code']);
            $this->assertSame(409,$this->request('DELETE',"/api/editions/{$id}/permanent",'admin_session_test')['code']);
            $detail = $this->request('GET',"/api/legal/{$requestId}",'user_session_test');
            $url = $detail['body']['item']['edition_file_url'];
            $this->assertSame('/api/e/code/'.$created['body']['cve'].'/download',$url);
            $download = $this->request('GET',$url);
            $this->assertSame(200,$download['code']);
            $this->assertSame($sha,hash('sha256',$download['raw']));
            $this->assertSame($sha,$pdo->query('SELECT published_file_checksum FROM editions WHERE id='.$id)->fetchColumn());
        }
        $first = $ids[0]; $second = $ids[1];
        $list = $this->request('GET','/api/e?from=2026-09-01&to=2026-09-01');
        $this->assertSame($second,(int)$list['body']['items'][0]['id']);
        $this->assertSame(200,$this->request('DELETE',"/api/editions/{$first}",'admin_session_test')['code']);
        $this->assertNotEmpty($pdo->query('SELECT deleted_at FROM editions WHERE id='.$first)->fetchColumn());
        $this->assertSame('Por verificar', $pdo->query('SELECT status FROM legal_requests WHERE id=601')->fetchColumn());
        $firstCode = $pdo->query('SELECT code FROM editions WHERE id='.$first)->fetchColumn();
        $this->assertSame(404,$this->request('GET','/api/e/code/'.$firstCode.'/download')['code']);
        $trash = $this->request('GET',"/api/editions/{$first}/trash-detail",'admin_session_test');
        $this->assertSame(200,$trash['code']);
        $this->assertSame(1,count($trash['body']['orders']));
        $archivedPdf = $this->request('GET',$trash['body']['edition']['file_url'],'admin_session_test');
        $this->assertSame(200,$archivedPdf['code']);
        $this->assertSame($sha,hash('sha256',$archivedPdf['raw']));
        $this->assertSame(200,$this->request('POST',"/api/editions/{$first}/restore",'admin_session_test')['code']);
        $restored = $this->request('GET',"/api/editions/{$first}",'admin_session_test');
        $this->assertSame('Borrador',$restored['body']['edition']['status']);
        $this->assertNull($restored['body']['edition']['file_id']);
        $this->assertFalse($restored['body']['edition']['readiness']['ready']);
        $this->assertSame(409,$this->request('POST',"/api/editions/{$first}/publish",'admin_session_test')['code']);
        $pdo->prepare('UPDATE editions SET published_file_checksum=? WHERE id=?')->execute([str_repeat('0',64),$second]);
        $code = $pdo->query('SELECT code FROM editions WHERE id='.$second)->fetchColumn();
        $this->assertSame(404,$this->request('GET','/api/e/code/'.$code.'/download')['code']);
        $this->assertNull($this->request('GET','/api/legal/602','user_session_test')['body']['item']['edition_file_url']);
        $list = $this->request('GET','/api/e?from=2026-09-01&to=2026-09-01');
        $this->assertNotContains($second,array_map('intval',array_column($list['body']['items'],'id')));
    }

    public function testDeletedDraftNumberIsReusedWithDistinctCve(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name) VALUES(603,2,'En trámite',100,'Reserva')");
        $data = ['date'=>'2026-10-10','orders'=>[603]];
        $first=$this->request('POST','/api/editions','admin_session_test',$data);
        $this->assertSame(200,$first['code']);
        $id=$first['body']['id'];
        $listed = $this->request('GET','/api/legal','admin_session_test');
        $request = array_values(array_filter($listed['body']['items'], fn($row) => (int)$row['id'] === 603))[0];
        $this->assertSame((int)$id,(int)$request['active_edition_id']);
        // Soft-delete the edition: request 603 returns to Por verificar
        $this->assertSame(200,$this->request('DELETE',"/api/editions/{$id}",'admin_session_test')['code']);
        $listed = $this->request('GET','/api/legal','admin_session_test');
        $request = array_values(array_filter($listed['body']['items'], fn($row) => (int)$row['id'] === 603))[0];
        $this->assertNull($request['active_edition_id']);
        $this->assertSame('Por verificar',$request['status']);
        // Re-verify request 603 so it can be selected in a new edition
        $pdo->exec("UPDATE legal_requests SET status='En trámite' WHERE id=603");
        $second=$this->request('POST','/api/editions','admin_session_test',$data);
        $this->assertSame(200,$second['code'],$second['body']['error'] ?? '');
        $this->assertSame($first['body']['edition_no'],$second['body']['edition_no']);
        $this->assertSame($first['body']['code'],$second['body']['code']);
        $this->assertNotSame($first['body']['cve'],$second['body']['cve']);
        $available = $this->request('GET','/api/legal?available_for_edition=1','admin_session_test');
        $availableIds = array_map('intval', array_column($available['body']['items'], 'id'));
        $this->assertNotContains(603, $availableIds);
        $this->assertSame(409,$this->request('POST',"/api/editions/{$id}/restore",'admin_session_test')['code']);
    }

    public function testPublicationTrashDetailRestoreAndPermissions(): void {
        $pdo = Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,total_bs,name) VALUES(620,2,'En trámite',100,'Papelera HTTP')");
        $pdo->exec("INSERT INTO legal_payments(legal_request_id,amount_bs,status) VALUES(620,100,'Aprobado')");
        $this->assertSame(403,$this->request('DELETE','/api/legal/620','user_session_test')['code']);
        $this->assertSame(200,$this->request('DELETE','/api/legal/620','admin_session_test')['code']);
        $this->assertSame(404,$this->request('GET','/api/legal/620','admin_session_test')['code']);
        $detail = $this->request('GET','/api/legal/trash/620','admin_session_test');
        $this->assertSame(200,$detail['code']);
        $this->assertSame(100,(int)$detail['body']['payments'][0]['amount_bs']);
        $this->assertSame(403,$this->request('DELETE','/api/legal/trash/620','user_session_test')['code']);
        $this->assertSame(403,$this->request('DELETE','/api/legal/trash','admin_session_test')['code']);
        $this->assertSame(200,$this->request('POST','/api/legal/620/restore','admin_session_test')['code']);
        $restored = $this->request('GET','/api/legal/620','admin_session_test');
        $this->assertSame('Por verificar',$restored['body']['item']['status']);
        $this->assertSame(100,(int)$restored['body']['payments'][0]['amount_bs']);
    }

    public function testDateFilterIncludesDateOnlyAndLastFractionalSecond(): void {
        $pdo=Database::pdo();
        $pdo->exec("INSERT INTO legal_requests(id,user_id,status,name,publish_date,created_at) VALUES(610,2,'En trámite','Día','2024-02-29','2024-02-29 00:00:00'),(611,2,'En trámite','Final','2024-02-29 23:59:59.999','2024-02-29 23:59:59.999'),(612,2,'En trámite','Siguiente','2024-03-01','2024-03-01')");
        foreach (['pub_from=2024-02-29&pub_to=2024-02-29','req_from=2024-02-29&req_to=2024-02-29'] as $filter) {
            $res=$this->request('GET','/api/legal?'.$filter,'admin_session_test');
            $this->assertSame(200,$res['code']);
            $ids=array_map('intval',array_column($res['body']['items'],'id'));
            $this->assertContains(610,$ids); $this->assertContains(611,$ids); $this->assertNotContains(612,$ids);
        }
    }

    public function testIndividualTrashDeletionAllowsOnlyAdminAndSuperadmin(): void {
        $pdo = Database::pdo();
        $insertUser = $pdo->prepare("INSERT INTO users(id,role,name,document,status) VALUES(?,?,?,?,'active')");
        $insertSession = $pdo->prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)");
        foreach (['staff', 'manager', 'solicitante', 'admin', 'superadmin'] as $index => $role) {
            $id = 830 + $index;
            $session = 'trash_permission_' . $role;
            $insertUser->execute([$id, $role, $role, 'V' . $id]);
            $insertSession->execute([$session, $id, hash('sha256', $session), date('Y-m-d H:i:s', time() + 3600)]);
            $pdo->prepare("INSERT INTO editions(id,code,status,edition_no,publication_year,deleted_at) VALUES(?,?,'Publicada',?,2026,CURRENT_TIMESTAMP)")->execute([$id, 'MMXXVI-' . $id, $id]);
            $pdo->prepare("INSERT INTO legal_requests(id,user_id,status,name,deleted_at) VALUES(?,?,'Por verificar',?,CURRENT_TIMESTAMP)")->execute([$id, $id, 'Papelera ' . $role]);

            $allowed = in_array($role, ['admin', 'superadmin'], true);
            $publications = $this->request('GET', '/api/legal/trash', $session);
            $this->assertSame(200, $publications['code']);
            $item = array_values(array_filter($publications['body']['items'], fn($item) => (int)$item['id'] === $id))[0];
            $this->assertSame($allowed, $item['can_permanently_delete'], $role);
            if ($allowed) {
                $editions = $this->request('GET', '/api/editions-retired', $session);
                $this->assertSame(200, $editions['code']);
                $item = array_values(array_filter($editions['body']['items'], fn($item) => (int)$item['id'] === $id))[0];
                $this->assertTrue($item['can_permanently_delete']);
            }
            foreach (["/api/editions/{$id}/permanent", "/api/legal/trash/{$id}"] as $endpoint) {
                $deleted = $this->request('DELETE', $endpoint, $session);
                $this->assertSame($allowed ? 200 : 403, $deleted['code'], $role . ': ' . json_encode($deleted['body']));
            }
            $this->assertSame($allowed ? 0 : 1, (int)$pdo->query("SELECT COUNT(*) FROM editions WHERE id={$id}")->fetchColumn());
            $this->assertSame($allowed ? 0 : 1, (int)$pdo->query("SELECT COUNT(*) FROM legal_requests WHERE id={$id}")->fetchColumn());
        }
    }

    public function testRegistrationIsEnforcedByApiAndNumericIdentityIsValidated(): void {
        $pdo=Database::pdo();
        $pdo->exec("INSERT OR REPLACE INTO settings VALUES('registration_enabled','0','now','now')");
        $before=(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $blocked=$this->request('POST','/api/auth/register',null,['document'=>'V789','name'=>'Blocked','password'=>'password123456']);
        $this->assertSame(403,$blocked['code']);
        $this->assertSame($before,(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn());
        $this->assertSame(403, $this->request('POST','/api/admin/settings','user_session_test',['registration_enabled'=>true])['code']);
        $this->assertSame('0', $pdo->query("SELECT value FROM settings WHERE `key`='registration_enabled'")->fetchColumn());
        $this->assertSame(200, $this->request('POST','/api/admin/settings','admin_session_test',['registration_enabled'=>true])['code']);
        $this->assertSame('1', $this->request('GET','/api/settings')['body']['settings']['registration_enabled']);
        $invalid=$this->request('POST','/api/auth/register',null,['document'=>'Vabc','name'=>'Invalid','password'=>'password123456']);
        $this->assertSame(422,$invalid['code']);
        $this->assertSame(422,$this->request('POST','/api/auth/login',null,['document'=>'soporte','password'=>'anything'])['code']);
        $this->assertSame(200, $this->request('POST','/api/admin/settings','admin_session_test',['registration_enabled'=>false])['code']);
        $this->assertSame('0', $this->request('GET','/api/settings')['body']['settings']['registration_enabled']);
    }
    public function testFutureYearsAreRejectedButPublishedSameYearFuturePdfIsPublic(): void {
        $year=(int)date('Y');
        $invalid=$this->request('POST','/api/editions','admin_session_test',['date'=>($year+1).'-01-01','orders'=>[100]]);
        $this->assertSame(422,$invalid['code']);
        $pdo=Database::pdo();
        $e=$pdo->query("SELECT * FROM editions WHERE status='Publicada' AND deleted_at IS NULL AND published_file_checksum IS NOT NULL LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $pdo->prepare('UPDATE editions SET date=? WHERE id=?')->execute([$year.'-12-31',$e['id']]);
        try {
            $url='/api/dm/e-'.($e['cve'] ?? $e['code']);
            $public=$this->request('GET',$url);
            $this->assertSame(200,$public['code']);
            $pdf=$this->request('GET',$public['body']['edition']['file_url']);
            $this->assertSame(200,$pdf['code']);
            $this->assertSame($e['published_file_checksum'],hash('sha256',$pdf['raw']));
            $list=$this->request('GET','/api/e?q='.$e['cve']);
            $this->assertContains((int)$e['id'],array_map('intval',array_column($list['body']['items'],'id')));
        } finally { $pdo->prepare('UPDATE editions SET date=? WHERE id=?')->execute([$e['date'],$e['id']]); }
    }
}
