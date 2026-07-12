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
        return is_numeric($bcvRaw) ? (float)$bcvRaw : 370.0;
    }
}
