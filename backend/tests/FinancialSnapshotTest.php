<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/BcvService.php';
require_once __DIR__ . '/../src/Services/PublicationService.php';

class FinancialSnapshotTest extends TestCase {
    
    public function testExceptionWhenNoPriceConfigured() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetchColumn')->willReturnOnConsecutiveCalls(false, 16.0);
        $pdo->method('prepare')->willReturn($stmt);
        
        $bcvService = $this->createMock(BcvService::class);
        $bcvService->method('getRate')->willReturn(40.0);
        
        $service = new PublicationService($pdo, $bcvService);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("El precio por folio no está configurado en el sistema.");
        
        $service->calculatePricing(2);
    }
    
    public function testExceptionWhenNoIvaConfigured() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetchColumn')->willReturnOnConsecutiveCalls(1.5, false);
        $pdo->method('prepare')->willReturn($stmt);
        
        $bcvService = $this->createMock(BcvService::class);
        $bcvService->method('getRate')->willReturn(40.0);
        
        $service = new PublicationService($pdo, $bcvService);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("El porcentaje de IVA no está configurado en el sistema.");
        
        $service->calculatePricing(2);
    }
    
    public function testPricingCalculation() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetchColumn')->willReturnOnConsecutiveCalls(1.5, 16.0);
        $pdo->method('prepare')->willReturn($stmt);
        
        $bcvService = $this->createMock(BcvService::class);
        $bcvService->method('getRate')->willReturn(40.0);
        
        $service = new PublicationService($pdo, $bcvService);
        $pricing = $service->calculatePricing(2);
        
        $this->assertEquals(1.5, $pricing['price_per_folio_usd']);
        $this->assertEquals(40.0, $pricing['bcv_rate']);
        $this->assertEquals(16.0, $pricing['iva_percent']);
        
        $this->assertEquals(3.0, $pricing['price_usd']);
        $this->assertEquals(120.0, $pricing['subtotal_bs']);
        $this->assertEquals(19.2, $pricing['iva_bs']);
        $this->assertEquals(139.2, $pricing['total_bs']);
    }
}
