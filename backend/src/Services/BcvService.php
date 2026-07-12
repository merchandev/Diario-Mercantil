<?php
class BcvService {
    private PDO $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function getRate(): float {
        $stmt = $this->pdo->prepare('SELECT value FROM settings WHERE `key`=?');
        $stmt->execute(['bcv_rate']);
        $bcvRaw = $stmt->fetchColumn();
        if (!is_numeric($bcvRaw) || (float)$bcvRaw <= 0) {
            throw new Exception("Tasa del BCV no configurada o inválida. Por favor, configure la tasa en el panel de administración.");
        }
        return (float)$bcvRaw;
    }
}
