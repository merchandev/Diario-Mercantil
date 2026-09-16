<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/EditionPublicationService.php';

class EditionPublicationServiceTest extends TestCase {


    public function testPublishFailsIfEditionNotFound() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(false);
        $pdo->method('prepare')->willReturn($stmt);
        
        $service = new EditionPublicationService($pdo);
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Edición no encontrada");
        $this->expectExceptionCode(404);
        
        $service->publish(1, 1);
    }
    
    public function testPublishFailsIfNotDraft() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Publicada']);
        $pdo->method('prepare')->willReturn($stmt);
        
        $service = new EditionPublicationService($pdo);
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("La edición debe estar en estado Borrador para ser publicada.");
        $this->expectExceptionCode(409);
        
        $service->publish(1, 1);
    }
    
    public function testPublishRequiresFinalPdf(): void {
        $pdo = new PDO('sqlite::memory:');
        $pdo->exec('CREATE TABLE editions(id INTEGER PRIMARY KEY,status TEXT,file_id INTEGER,deleted_at TEXT)');
        $pdo->exec('CREATE TABLE edition_orders(edition_id INTEGER,legal_request_id INTEGER)');
        $pdo->exec("INSERT INTO editions VALUES(1,'Borrador',NULL,NULL)");
        $pdo->exec('INSERT INTO edition_orders VALUES(1,1)');
        try {
            (new EditionPublicationService($pdo))->publish(1,1);
            $this->fail('Debe exigir PDF final.');
        } catch (RuntimeException $e) {
            $this->assertSame(422, $e->getCode());
            $this->assertFalse($pdo->inTransaction());
            $this->assertSame('Borrador', $pdo->query('SELECT status FROM editions')->fetchColumn());
        }
    }

    public function testPublishFailsIfNoOrders() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Borrador', 'file_id' => 99, 'orders_count' => 0]);
        $pdo->method('prepare')->willReturn($stmt);
        
        $service = new EditionPublicationService($pdo);
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("La edición debe tener al menos una solicitud asociada.");
        $this->expectExceptionCode(400);
        
        $service->publish(1, 1);
    }
}
