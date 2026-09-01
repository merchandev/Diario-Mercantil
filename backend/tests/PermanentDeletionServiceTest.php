<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/PermanentDeletionService.php';

final class PermanentDeletionServiceTest extends TestCase
{
    private PDO $pdo;
    private string $uploadDir;
    private string|false $previousUploadDir;

    protected function setUp(): void
    {
        $this->previousUploadDir = getenv('UPLOAD_DIR');
        $this->uploadDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm-delete-' . bin2hex(random_bytes(6));
        mkdir($this->uploadDir, 0750, true);
        putenv('UPLOAD_DIR=' . $this->uploadDir);

        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->createSchema();
    }

    protected function tearDown(): void
    {
        if (is_dir($this->uploadDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($this->uploadDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($iterator as $item) {
                $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
            }
            rmdir($this->uploadDir);
        }
        $this->previousUploadDir === false
            ? putenv('UPLOAD_DIR')
            : putenv('UPLOAD_DIR=' . $this->previousUploadDir);
    }

    public function testDeletingPublishedEditionRemovesGeneratedFilesAndRequeuesRequests(): void
    {
        $this->seedPublishedEdition();

        $result = (new PermanentDeletionService($this->pdo))->deleteEdition(10, 99);

        $this->assertTrue($result['deleted']);
        $this->assertSame(2, $result['requests_requeued']);
        $this->assertSame(3, $result['files_deleted']);
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM editions')->fetchColumn());
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM edition_orders')->fetchColumn());
        $this->assertSame(
            ['En trámite', 'En trámite'],
            $this->pdo->query('SELECT status FROM legal_requests ORDER BY id')->fetchAll(PDO::FETCH_COLUMN)
        );
        $this->assertSame(2, (int) $this->pdo->query('SELECT COUNT(*) FROM files')->fetchColumn());
        $this->assertFileDoesNotExist($this->uploadDir . '/edition.pdf');
        $this->assertFileDoesNotExist($this->uploadDir . '/publication-14.pdf');
        $this->assertFileDoesNotExist($this->uploadDir . '/publication-15.pdf');
        $this->assertFileExists($this->uploadDir . '/source-14.pdf');
        $this->assertFileExists($this->uploadDir . '/source-15.pdf');
    }

    public function testDeletingPublishedRequestInvalidatesEditionAndDeletesAllOwnedData(): void
    {
        $this->seedPublishedEdition();
        $this->pdo->exec("INSERT INTO legal_payments(id,legal_request_id) VALUES(1,14)");
        $this->pdo->exec("INSERT INTO payments(id,legal_request_id) VALUES(1,14)");

        $result = (new PermanentDeletionService($this->pdo))->deleteLegalRequest(14, 99);

        $this->assertTrue($result['deleted']);
        $this->assertSame(1, $result['deleted_editions']);
        $this->assertSame(1, $result['requests_requeued']);
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM editions')->fetchColumn());
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM legal_requests WHERE id=14')->fetchColumn());
        $this->assertSame('En trámite', $this->pdo->query('SELECT status FROM legal_requests WHERE id=15')->fetchColumn());
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM legal_payments')->fetchColumn());
        $this->assertSame(0, (int) $this->pdo->query('SELECT COUNT(*) FROM payments')->fetchColumn());
        $this->assertSame(1, (int) $this->pdo->query('SELECT COUNT(*) FROM legal_files')->fetchColumn());
        $this->assertSame(['source-15.pdf'], $this->pdo->query('SELECT path FROM files')->fetchAll(PDO::FETCH_COLUMN));
        $this->assertFileDoesNotExist($this->uploadDir . '/source-14.pdf');
        $this->assertFileExists($this->uploadDir . '/source-15.pdf');
    }

    public function testMissingRecordsReturnNotFound(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(404);
        (new PermanentDeletionService($this->pdo))->deleteEdition(999, 99);
    }

    private function createSchema(): void
    {
        $this->pdo->exec(
            'CREATE TABLE files (id INTEGER PRIMARY KEY,name TEXT,path TEXT,size INTEGER,type TEXT,status TEXT)'
        );
        $this->pdo->exec(
            'CREATE TABLE legal_requests (id INTEGER PRIMARY KEY,status TEXT,publish_date TEXT,edition_code TEXT,edition_no INTEGER,deleted_at TEXT)'
        );
        $this->pdo->exec(
            'CREATE TABLE editions (id INTEGER PRIMARY KEY,status TEXT,file_id INTEGER,deleted_at TEXT,orders_count INTEGER)'
        );
        $this->pdo->exec(
            'CREATE TABLE edition_orders (edition_id INTEGER,legal_request_id INTEGER,publication_file_id INTEGER)'
        );
        $this->pdo->exec(
            'CREATE TABLE legal_files (id INTEGER PRIMARY KEY,legal_request_id INTEGER,file_id INTEGER)'
        );
        $this->pdo->exec(
            'CREATE TABLE legal_payments (id INTEGER PRIMARY KEY,legal_request_id INTEGER)'
        );
        $this->pdo->exec(
            'CREATE TABLE payments (id INTEGER PRIMARY KEY,legal_request_id INTEGER)'
        );
        $this->pdo->exec(
            'CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT,resource_type TEXT,resource_id INTEGER)'
        );
    }

    private function seedPublishedEdition(): void
    {
        foreach ([
            1 => 'source-14.pdf',
            2 => 'source-15.pdf',
            3 => 'edition.pdf',
            4 => 'publication-14.pdf',
            5 => 'publication-15.pdf',
        ] as $id => $path) {
            file_put_contents($this->uploadDir . DIRECTORY_SEPARATOR . $path, '%PDF-test');
            $stmt = $this->pdo->prepare(
                "INSERT INTO files(id,name,path,size,type,status) VALUES(?,?,?,9,'pdf','processed')"
            );
            $stmt->execute([$id, $path, $path]);
        }

        $this->pdo->exec(
            "INSERT INTO legal_requests(id,status,publish_date,edition_code,edition_no) VALUES"
            . "(14,'Publicada','2026-09-01','DMV-1',1),(15,'Publicada','2026-09-01','DMV-1',1)"
        );
        $this->pdo->exec("INSERT INTO editions(id,status,file_id,orders_count) VALUES(10,'Publicada',3,2)");
        $this->pdo->exec(
            'INSERT INTO edition_orders(edition_id,legal_request_id,publication_file_id) VALUES(10,14,4),(10,15,5)'
        );
        $this->pdo->exec('INSERT INTO legal_files(id,legal_request_id,file_id) VALUES(1,14,1),(2,15,2)');
    }
}
