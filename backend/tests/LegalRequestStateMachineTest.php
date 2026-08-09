<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/Services/LegalRequestStateMachine.php';

class LegalRequestStateMachineTest extends TestCase {

    public function testSubmitValidatesDraftOrRejected() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'En trámite', 'created_at' => '2026-01-01']);
        $pdo->method('prepare')->willReturn($stmt);
        
        $machine = new LegalRequestStateMachine($pdo);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("La solicitud no está en Borrador ni Rechazado.");
        
        $machine->submit(1);
    }
    
    public function testVerifyRequiresPorVerificar() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Borrador']);
        $pdo->method('prepare')->willReturn($stmt);
        
        $machine = new LegalRequestStateMachine($pdo);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("La solicitud no está en estado 'Por verificar'.");
        
        $machine->verify(1);
    }

    public function testRejectRequiresPorVerificarOrEnTramite() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Publicada']);
        $pdo->method('prepare')->willReturn($stmt);
        
        $machine = new LegalRequestStateMachine($pdo);
        
        // Mock auth
        $_COOKIE['dm_token'] = 'test';
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Solo se pueden rechazar solicitudes 'Por verificar' o 'En trámite'.");
        
        $machine->reject(1, 'Reason');
    }

    public function testReturnToDraftRequiresPorVerificarOrEnTramite() {
        $pdo = $this->createMock(PDO::class);
        $stmt = $this->createMock(PDOStatement::class);
        
        $stmt->method('fetch')->willReturn(['status' => 'Publicada']);
        $pdo->method('prepare')->willReturn($stmt);
        
        $machine = new LegalRequestStateMachine($pdo);
        
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Solo se puede devolver a borrador si la solicitud está 'Por verificar' o 'En trámite'.");
        
        $machine->returnToDraft(1);
    }
}
