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
    
    public function testPublishFailsIfOrderHasNoSourcePdf() {
        $pdo = $this->createMock(PDO::class);
        $editionStmt = $this->createMock(PDOStatement::class);
        $ordersStmt = $this->createMock(PDOStatement::class);
        $preparedStmt = $this->createMock(PDOStatement::class);
        $orderStmt = $this->createMock(PDOStatement::class);
        $sourceStmt = $this->createMock(PDOStatement::class);

        $editionStmt->method('fetch')->willReturn(['status' => 'Borrador']);
        $ordersStmt->method('fetchAll')->willReturn([1]);
        $preparedStmt->method('fetch')->willReturn(false);
        $orderStmt->method('fetch')->willReturn([
            'status' => 'Borrador',
            'request_status' => 'En trámite',
            'publication_file_id' => null,
            'edition_file_id' => null,
        ]);
        $sourceStmt->method('fetch')->willReturn(false);
        $pdo->method('prepare')->willReturnOnConsecutiveCalls(
            $editionStmt,
            $ordersStmt,
            $preparedStmt,
            $orderStmt,
            $sourceStmt
        );
        
        $service = new EditionPublicationService($pdo);
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("La solicitud 1 no tiene un PDF de documento válido.");
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
