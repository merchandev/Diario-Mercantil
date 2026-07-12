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
    
    public function testPublishFailsIfNoPdf() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Borrador', 'file_id' => null]);
        $pdo->method('prepare')->willReturn($stmt);
        
        $service = new EditionPublicationService($pdo);
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Debe subir el PDF definitivo antes de publicar la edición.");
        $this->expectExceptionCode(422);
        
        $service->publish(1, 1);
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
