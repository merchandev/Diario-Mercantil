<?php
require_once __DIR__ . '/BcvService.php';

class PublicationService {
    private PDO $pdo;
    private BcvService $bcvService;
    
    public function __construct(PDO $pdo, BcvService $bcvService) {
        $this->pdo = $pdo;
        $this->bcvService = $bcvService;
    }
    
    public function getPricePerFolio(): float {
        $stmt = $this->pdo->prepare('SELECT value FROM settings WHERE `key`=?');
        $stmt->execute(['price_per_folio_usd']);
        $priceRaw = $stmt->fetchColumn();
        return is_numeric($priceRaw) ? (float)$priceRaw : 1.5;
    }
    
    public function calculatePricing(int $folios): array {
        $pricePerFolioUsd = $this->getPricePerFolio();
        $bcv = $this->bcvService->getRate();
        $ivaPercent = 16.0;
        
        $priceUsd = $folios * $pricePerFolioUsd;
        $subtotalBs = round($priceUsd * $bcv, 2);
        $ivaBs = round($subtotalBs * ($ivaPercent / 100), 2);
        $totalBs = round($subtotalBs + $ivaBs, 2);
        
        return [
            'price_per_folio_usd' => $pricePerFolioUsd,
            'price_usd' => $priceUsd,
            'bcv_rate' => $bcv,
            'subtotal_bs' => $subtotalBs,
            'iva_percent' => $ivaPercent,
            'iva_bs' => $ivaBs,
            'total_bs' => $totalBs
        ];
    }
    
    public function createLegalRequest(array $userData, int $folios, ?int $existingRequestId = null): int {
        $now = gmdate('c');
        if ($existingRequestId > 0) {
            $this->pdo->beginTransaction();
            try {
                $role = strtolower($userData['role'] ?? '');
                $isAdmin = in_array($role, ['admin','staff','manager']);
                
                $sql = "UPDATE legal_requests SET folios=?, updated_at=? WHERE id=?";
                $params = [$folios, $now, $existingRequestId];
                
                if (!$isAdmin) {
                    $sql .= " AND user_id=?";
                    $params[] = $userData['id'];
                }
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($params);
                
                if ($stmt->rowCount() === 0) {
                    throw new Exception("Solicitud no encontrada o acceso denegado");
                }
                
                $this->pdo->prepare("DELETE FROM legal_files WHERE legal_request_id=? AND kind='document_pdf'")->execute([$existingRequestId]);
                
                $this->pdo->commit();
                return $existingRequestId;
            } catch (Exception $e) {
                $this->pdo->rollBack();
                throw $e;
            }
        }
        
        $stmt = $this->pdo->prepare("INSERT INTO legal_requests(status,name,document,date,folios,pub_type,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)");
        $stmt->execute(['Borrador', $userData['name'], $userData['document'], gmdate('Y-m-d'), $folios, 'Documento', $userData['id'], $now]);
        return (int)$this->pdo->lastInsertId();
    }
    
    public function attachFileToRequest(int $reqId, int $fileId): void {
        $now = gmdate('c');
        $this->pdo->prepare('INSERT INTO legal_files(legal_request_id,kind,file_id,created_at) VALUES(?,?,?,?)')
            ->execute([$reqId, 'document_pdf', $fileId, $now]);
    }
}
