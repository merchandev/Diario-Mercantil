<?php
require_once __DIR__ . '/../Database.php';

class EditionPublicationService {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function publish(int $id, int $actorId): void {
        $now = gmdate('Y-m-d');
        
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        
        try {
            // Lock edition
            $edStmt = $this->pdo->prepare('SELECT date, status, file_id FROM editions WHERE id=? FOR UPDATE');
            $edStmt->execute([$id]);
            $edition = $edStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$edition) {
                throw new RuntimeException("Edición no encontrada", 404);
            }
            
            if ($edition['status'] !== 'Borrador') {
                throw new RuntimeException("La edición debe estar en estado Borrador para ser publicada.", 409);
            }
            
            if (empty($edition['file_id'])) {
                throw new RuntimeException("Debe subir el PDF definitivo antes de publicar la edición.", 422);
            }
            
            // Validate Orders
            $stmt = $this->pdo->prepare("SELECT legal_request_id FROM edition_orders WHERE edition_id=?");
            $stmt->execute([$id]);
            $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (count($orderIds) === 0) {
                throw new RuntimeException("La edición debe tener al menos una solicitud asociada.", 400);
            }
            
            // Validate File Physical Integrity
            $fStmt = $this->pdo->prepare('SELECT path, type, checksum FROM files WHERE id=? AND status="uploaded"');
            $fStmt->execute([$edition['file_id']]);
            $fileData = $fStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$fileData) {
                throw new RuntimeException("El archivo físico asociado a la edición no existe o no es válido.", 422);
            }
            
            $storageRoot = realpath(__DIR__ . '/../../storage/uploads');
            $physicalPath = realpath($storageRoot . '/' . $fileData['path']);
            
            if ($physicalPath === false || !str_starts_with($physicalPath, $storageRoot . DIRECTORY_SEPARATOR)) {
                throw new DomainException('Ruta de archivo inválida. Posible path traversal.', 422);
            }
            
            if (!file_exists($physicalPath) || !is_readable($physicalPath)) {
                throw new RuntimeException("El archivo PDF asociado no se encuentra en disco o no es legible.", 422);
            }
            
            // MIME and Signature validation
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $physicalPath);
            finfo_close($finfo);
            if ($mime !== 'application/pdf') {
                throw new RuntimeException("El archivo asociado no es un PDF válido (MIME: $mime).", 422);
            }
            
            $handle = fopen($physicalPath, 'r');
            $header = fread($handle, 5);
            fclose($handle);
            if ($header !== '%PDF-') {
                throw new RuntimeException("El archivo asociado no tiene la firma de un PDF.", 422);
            }
            
            $currentChecksum = hash_file('sha256', $physicalPath);
            if ($currentChecksum !== $fileData['checksum']) {
                throw new RuntimeException("La integridad del archivo PDF ha sido comprometida. El checksum no coincide.", 422);
            }
            
            $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
            $statusStmt = $this->pdo->prepare("SELECT id, status, deleted_at FROM legal_requests WHERE id IN ($inQuery) FOR UPDATE");
            $statusStmt->execute($orderIds);
            $requests = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($requests) !== count($orderIds)) {
                throw new RuntimeException("Algunas solicitudes asociadas ya no existen en la base de datos.", 400);
            }
            
            foreach ($requests as $req) {
                if ($req['status'] !== 'En trámite' || $req['deleted_at'] !== null) {
                    throw new RuntimeException("La solicitud {$req['id']} no está en estado 'En trámite' o fue eliminada.", 400);
                }
            }

            // Date chronology validation
            $editionDate = $edition['date'] ?: $now;
            $lastEdStmt = $this->pdo->query("SELECT MAX(date) FROM editions WHERE status='Publicada'");
            $lastEdDate = $lastEdStmt->fetchColumn();
            if ($lastEdDate && $editionDate <= $lastEdDate) {
                throw new RuntimeException("La fecha de esta edición ($editionDate) debe ser posterior a la última edición publicada ($lastEdDate).", 400);
            }
            
            // Execute Publication
            $params = array_merge([$editionDate], $orderIds);
            $updReqs = $this->pdo->prepare("UPDATE legal_requests SET status='Publicada', publish_date=? WHERE id IN ($inQuery) AND status='En trámite'");
            $updReqs->execute($params);
            
            if ($updReqs->rowCount() !== count($orderIds)) {
                throw new RuntimeException("Error de concurrencia: el número de solicitudes actualizadas no coincide con las órdenes bloqueadas.", 409);
            }
            
            $publishNow = gmdate('Y-m-d H:i:s');
            $this->pdo->prepare("UPDATE editions SET status='Publicada', published_at=?, published_by=?, published_file_checksum=?, orders_count=? WHERE id=?")
                 ->execute([$publishNow, $actorId, $currentChecksum, count($orderIds), $id]);
            
            $this->pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)")
                 ->execute([$actorId, 'publish_edition', 'edition', $id]);
                 
            // Send publication emails
            try {
                $edStmt2 = $this->pdo->prepare("SELECT code FROM editions WHERE id=?");
                $edStmt2->execute([$id]);
                $edCode = $edStmt2->fetchColumn() ?: "DM-$id";
                
                $ownersStmt = $this->pdo->prepare("SELECT u.email, u.name, l.order_no FROM legal_requests l JOIN users u ON l.user_id = u.id WHERE l.id IN ($inQuery)");
                $ownersStmt->execute($orderIds);
                $owners = $ownersStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($owners) > 0) {
                    require_once __DIR__ . '/EmailService.php';
                    foreach ($owners as $owner) {
                        if ($owner['email']) {
                            try {
                                EmailService::sendPublished($owner['email'], $owner['name'], $owner['order_no'] ?? 'N/A', $edCode);
                            } catch (Throwable $e) {
                                error_log("Failed to send published email to {$owner['email']}: " . $e->getMessage());
                            }
                        }
                    }
                }
            } catch (Throwable $e) {
                error_log("Failed to process publication emails: " . $e->getMessage());
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
