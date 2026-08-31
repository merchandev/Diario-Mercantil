<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/fpdf.php';
require_once __DIR__ . '/../src/Services/EditionPdfGenerator.php';
require_once __DIR__ . '/../src/Services/PdfInspector.php';
require_once __DIR__ . '/../src/Services/EditionPublicationService.php';

final class EditionPdfGeneratorTest extends TestCase
{
    private string $uploadDir;
    private string|false $previousUploadDir;

    protected function setUp(): void
    {
        $this->previousUploadDir = getenv('UPLOAD_DIR');
        $this->uploadDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'dm-edition-pdf-' . bin2hex(random_bytes(6));
        mkdir($this->uploadDir, 0750, true);
        putenv('UPLOAD_DIR=' . $this->uploadDir);
    }

    protected function tearDown(): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->uploadDir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        if (is_dir($this->uploadDir)) rmdir($this->uploadDir);
        $this->previousUploadDir === false
            ? putenv('UPLOAD_DIR')
            : putenv('UPLOAD_DIR=' . $this->previousUploadDir);
    }

    public function testConsolidationUsesOnePreparedFilePerRequestInStableOrder(): void
    {
        $first = $this->createPdf('solicitud-14.pdf', 'SOLICITUD 14');
        $second = $this->createPdf('solicitud-15.pdf', 'SOLICITUD 15');

        $pdo = new PDO('sqlite::memory:');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('CREATE TABLE editions (id INTEGER PRIMARY KEY,code TEXT NOT NULL)');
        $pdo->exec('CREATE TABLE files (id INTEGER PRIMARY KEY,path TEXT,checksum TEXT,status TEXT,deleted_at TEXT)');
        $pdo->exec('CREATE TABLE edition_orders (edition_id INTEGER,legal_request_id INTEGER,publication_file_id INTEGER,publication_checksum TEXT)');
        $pdo->exec("INSERT INTO editions(id,code) VALUES(1,'MMXXVI-0001')");

        $insertFile = $pdo->prepare('INSERT INTO files(id,path,checksum,status) VALUES(?,?,?,?)');
        $insertFile->execute([14, basename($first), hash_file('sha256', $first), 'processed']);
        $insertFile->execute([15, basename($second), hash_file('sha256', $second), 'processed']);
        $insertOrder = $pdo->prepare('INSERT INTO edition_orders VALUES(?,?,?,?)');
        $insertOrder->execute([1, 14, 14, hash_file('sha256', $first)]);
        $insertOrder->execute([1, 15, 15, hash_file('sha256', $second)]);

        $relativePath = (new EditionPdfGenerator($pdo))->generate(1, [14, 15]);
        $output = $this->uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);

        $this->assertFileExists($output);
        $this->assertSame(2, (new PdfInspector())->pageCount($output));
        $this->assertNotSame(hash_file('sha256', $first), hash_file('sha256', $second));
    }

    public function testPublicationPreparesAndKeepsTwoIndependentRequestPdfs(): void
    {
        $first = $this->createPdf('source-14.pdf', 'SOLICITUD 14');
        $second = $this->createPdf('source-15.pdf', 'SOLICITUD 15');
        $pdo = new PDO('sqlite::memory:');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec(
            'CREATE TABLE editions (id INTEGER PRIMARY KEY,code TEXT,status TEXT,date TEXT,file_id INTEGER,'
            . 'file_name TEXT,deleted_at TEXT,published_at TEXT,published_by INTEGER,'
            . 'published_file_checksum TEXT,orders_count INTEGER)'
        );
        $pdo->exec(
            'CREATE TABLE files (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,path TEXT,size INTEGER,type TEXT,'
            . 'checksum TEXT,version INTEGER,status TEXT,owner TEXT,deleted_at TEXT,created_at TEXT,updated_at TEXT)'
        );
        $pdo->exec(
            'CREATE TABLE legal_requests (id INTEGER PRIMARY KEY,user_id INTEGER,status TEXT,deleted_at TEXT,publish_date TEXT)'
        );
        $pdo->exec('CREATE TABLE legal_files (id INTEGER PRIMARY KEY AUTOINCREMENT,legal_request_id INTEGER,kind TEXT,file_id INTEGER)');
        $pdo->exec(
            'CREATE TABLE edition_orders (edition_id INTEGER,legal_request_id INTEGER,publication_file_id INTEGER,'
            . 'publication_file_name TEXT,publication_checksum TEXT,publication_source TEXT,'
            . 'publication_prepared_at TEXT,publication_updated_at TEXT,PRIMARY KEY(edition_id,legal_request_id))'
        );
        $pdo->exec('CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT,resource_type TEXT,resource_id INTEGER)');
        $pdo->exec("INSERT INTO editions(id,code,status,date,orders_count) VALUES(1,'MMXXVI-0001','Borrador','2026-08-31',2)");
        $pdo->exec("INSERT INTO legal_requests VALUES(14,101,'En trámite',NULL,NULL),(15,102,'En trámite',NULL,NULL)");

        $insertFile = $pdo->prepare(
            'INSERT INTO files(id,name,path,size,type,checksum,version,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
        );
        foreach ([[14, $first], [15, $second]] as [$id, $path]) {
            $insertFile->execute([
                $id, basename($path), basename($path), filesize($path), 'pdf', hash_file('sha256', $path),
                1, 'processed', '2026-08-31 12:00:00', '2026-08-31 12:00:00',
            ]);
        }
        $pdo->exec("INSERT INTO legal_files(legal_request_id,kind,file_id) VALUES(14,'document_pdf',14),(15,'document_pdf',15)");
        $pdo->exec('INSERT INTO edition_orders(edition_id,legal_request_id) VALUES(1,14),(1,15)');

        (new EditionPublicationService($pdo))->publish(1, 1);

        $rows = $pdo->query(
            'SELECT legal_request_id,publication_file_id,publication_checksum,publication_source '
            . 'FROM edition_orders ORDER BY legal_request_id'
        )->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(2, $rows);
        $this->assertNotSame($rows[0]['publication_file_id'], $rows[1]['publication_file_id']);
        $this->assertNotSame($rows[0]['publication_checksum'], $rows[1]['publication_checksum']);
        $this->assertSame('generated', $rows[0]['publication_source']);
        $this->assertSame('generated', $rows[1]['publication_source']);
        $this->assertSame('Publicada', $pdo->query('SELECT status FROM editions WHERE id=1')->fetchColumn());
        $this->assertSame(2, (int) $pdo->query("SELECT COUNT(*) FROM legal_requests WHERE status='Publicada'")->fetchColumn());

        $consolidated = $pdo->query(
            'SELECT f.path FROM editions e JOIN files f ON f.id=e.file_id WHERE e.id=1'
        )->fetchColumn();
        $this->assertIsString($consolidated);
        $this->assertSame(
            2,
            (new PdfInspector())->pageCount(
                $this->uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $consolidated)
            )
        );
    }

    private function createPdf(string $name, string $text): string
    {
        $path = $this->uploadDir . DIRECTORY_SEPARATOR . $name;
        $pdf = new FPDF();
        $pdf->AddPage();
        $pdf->SetFont('Arial', '', 14);
        $pdf->Cell(0, 10, $text);
        $pdf->Output('F', $path);
        return $path;
    }
}
