<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/EditionIntegrityService.php';

final class EditionIntegrityServiceTest extends TestCase
{
    private string $uploadDir;
    private string|false $previousUploadDir;
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->previousUploadDir = getenv('UPLOAD_DIR');
        $this->uploadDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm-edition-integrity-' . bin2hex(random_bytes(5));
        mkdir($this->uploadDir, 0750, true);
        putenv('UPLOAD_DIR=' . $this->uploadDir);

        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE files (id INTEGER PRIMARY KEY,path TEXT,size INTEGER,checksum TEXT,status TEXT,deleted_at TEXT)');
        $this->pdo->exec('CREATE TABLE editions (id INTEGER PRIMARY KEY,edition_no INTEGER,code TEXT,status TEXT,file_id INTEGER,file_name TEXT,published_at TEXT,published_by INTEGER,published_file_checksum TEXT,deleted_at TEXT)');
        $this->pdo->exec('CREATE TABLE legal_requests (id INTEGER PRIMARY KEY,status TEXT,publish_date TEXT,deleted_at TEXT)');
        $this->pdo->exec('CREATE TABLE edition_orders (edition_id INTEGER,legal_request_id INTEGER)');
        $this->pdo->exec('CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT,resource_type TEXT,resource_id INTEGER)');
    }

    protected function tearDown(): void
    {
        foreach (glob($this->uploadDir . DIRECTORY_SEPARATOR . '*') ?: [] as $file) unlink($file);
        if (is_dir($this->uploadDir)) rmdir($this->uploadDir);
        $this->previousUploadDir === false ? putenv('UPLOAD_DIR') : putenv('UPLOAD_DIR=' . $this->previousUploadDir);
    }

    public function testDetectsAValidPhysicalFile(): void
    {
        $path = $this->uploadDir . DIRECTORY_SEPARATOR . 'edition.pdf';
        file_put_contents($path, '%PDF-1.4 valid test');
        $checksum = hash_file('sha256', $path);
        $stmt = $this->pdo->prepare("INSERT INTO files VALUES(1,'edition.pdf',?,?, 'processed',NULL)");
        $stmt->execute([filesize($path), $checksum]);

        $service = new EditionIntegrityService($this->pdo);
        $this->assertTrue($service->fileIsAvailable(1));
        $this->assertTrue($service->fileHasValidChecksum(1));
    }

    public function testRepairReturnsOnlyAffectedEditionToDraftAndPreservesIdentity(): void
    {
        $this->pdo->exec("INSERT INTO files VALUES(2,'missing.pdf',100,'deadbeef','processed',NULL)");
        $this->pdo->exec("INSERT INTO editions VALUES(2,2,'MMXXVI-0002','Publicada',2,'missing.pdf','2026-09-02 10:00:00',1,'deadbeef',NULL)");
        $this->pdo->exec("INSERT INTO legal_requests VALUES(14,'Publicada','2026-09-02',NULL),(15,'Publicada','2026-09-02',NULL),(16,'En trámite',NULL,NULL)");
        $this->pdo->exec('INSERT INTO edition_orders VALUES(2,14),(2,15)');

        $service = new EditionIntegrityService($this->pdo);
        $invalid = $service->findInvalidPublishedEditions(2);
        $this->assertCount(1, $invalid);
        $this->assertSame('missing_or_invalid_physical_file', $invalid[0]['reason']);

        $result = $service->repairInvalidPublishedEdition(2, 1);
        $this->assertSame(2, $result['requests_requeued']);
        $edition = $this->pdo->query('SELECT * FROM editions WHERE id=2')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('Borrador', $edition['status']);
        $this->assertSame('MMXXVI-0002', $edition['code']);
        $this->assertSame(2, (int) $edition['edition_no']);
        $this->assertNull($edition['file_id']);
        $this->assertNull($edition['published_at']);
        $this->assertSame(2, (int) $this->pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='En trámite' AND id IN (14,15)")->fetchColumn());
        $this->assertSame('repair_invalid_published_edition', $this->pdo->query('SELECT action FROM audit_logs ORDER BY id DESC LIMIT 1')->fetchColumn());
    }
}
