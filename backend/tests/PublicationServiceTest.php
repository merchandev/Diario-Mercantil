<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/BcvService.php';
require_once __DIR__ . '/../src/Services/PublicationService.php';

class PublicationServiceTest extends TestCase {
    
    public function testCalculatePricing() {
        // Mock PDO
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        // Simulate fetchColumn returning 1.5 for price_per_folio
        $stmt->method('fetchColumn')->willReturn(1.5);
        $pdo->method('prepare')->willReturn($stmt);
        
        // Mock BcvService
        $bcvService = $this->createMock(BcvService::class);
        $bcvService->method('getRate')->willReturn(40.0); // BCV rate
        
        $service = new PublicationService($pdo, $bcvService);
        
        $pricing = $service->calculatePricing(2); // 2 folios
        
        $this->assertEquals(1.5, $pricing['price_per_folio_usd']);
        $this->assertEquals(3.0, $pricing['price_usd']);
        $this->assertEquals(40.0, $pricing['bcv_rate']);
        
        // 3.0 USD * 40.0 BCV = 120.0 Bs
        $this->assertEquals(120.0, $pricing['subtotal_bs']);
        
        // 16% of 120 = 19.2
        $this->assertEquals(19.2, $pricing['iva_bs']);
        
        // 120 + 19.2 = 139.2
        $this->assertEquals(139.2, $pricing['total_bs']);
    }
}
