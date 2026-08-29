<?php
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/StoragePath.php';

class EditionPublicationService {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function publish(int $id, int $actorId, ?callable $progressCallback = null): void {
        $now = gmdate('Y-m-d');
        
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        
        try {
            $lockClause = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
            // Lock edition
            $edStmt = $this->pdo->prepare('SELECT date, status, file_id FROM editions WHERE id=? AND deleted_at IS NULL' . $lockClause);
            $edStmt->execute([$id]);
            $edition = $edStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$edition) {
                throw new RuntimeException("Edición no encontrada", 404);
            }
            
            if ($edition['status'] !== 'Borrador') {
                throw new RuntimeException("La edición debe estar en estado Borrador para ser publicada.", 409);
            }
            
            // Validate Orders
            $stmt = $this->pdo->prepare("SELECT legal_request_id FROM edition_orders WHERE edition_id=?");
            $stmt->execute([$id]);
            $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (count($orderIds) === 0) {
                throw new RuntimeException("La edición debe tener al menos una solicitud asociada.", 400);
            }
            
            // Check if there is an existing file_id, if not, generate it
            $currentChecksum = '';
            if (empty($edition['file_id'])) {
                // Generate PDF automatically
                require_once __DIR__ . '/EditionPdfGenerator.php';
                $generator = new EditionPdfGenerator($this->pdo);
                $outputName = $generator->generate($id, $orderIds, $progressCallback);
                $storageRoot = StoragePath::getUploadsDir();
                $physicalPath = StoragePath::getFile($outputName);
                
                $size = filesize($physicalPath);
                $checksum = hash_file('sha256', $physicalPath);
                $currentChecksum = $checksum;
                $nowStr = gmdate('Y-m-d H:i:s');
                
                // Insert into files table
                $ins = $this->pdo->prepare('INSERT INTO files(name, size, type, checksum, status, created_at, updated_at, path) VALUES(?,?,?,?,?,?,?,?)');
                $ins->execute([$outputName, $size, 'pdf', $checksum, 'uploaded', $nowStr, $nowStr, $outputName]);
                $newFileId = $this->pdo->lastInsertId();
                
                $this->pdo->prepare('UPDATE editions SET file_id=? WHERE id=?')->execute([$newFileId, $id]);
            } else {
                // Validate File Physical Integrity if it was uploaded manually
                $fStmt = $this->pdo->prepare('SELECT path, type, checksum FROM files WHERE id=? AND status="uploaded"');
                $fStmt->execute([$edition['file_id']]);
                $fileData = $fStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$fileData) {
                    throw new RuntimeException("El archivo físico asociado a la edición no existe o no es válido.", 422);
                }
                
                $storageRoot = StoragePath::getUploadsDir();
                try {
                    $physicalPath = StoragePath::getFile((string)$fileData['path']);
                } catch (RuntimeException $e) {
                    throw new RuntimeException('El archivo PDF asociado no se encuentra en el almacenamiento configurado.', 422, $e);
                }
                
                if (!file_exists($physicalPath) || !is_readable($physicalPath)) {
                    throw new RuntimeException("El archivo PDF asociado no se encuentra en disco o no es legible.", 422);
                }
                
                $currentChecksum = hash_file('sha256', $physicalPath);
                if ($currentChecksum !== $fileData['checksum']) {
                    throw new RuntimeException("La integridad del archivo PDF ha sido comprometida. El checksum no coincide.", 422);
                }
            }
            
            $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
            $statusStmt = $this->pdo->prepare("SELECT id, status, deleted_at FROM legal_requests WHERE id IN ($inQuery)" . $lockClause);
            $statusStmt->execute($orderIds);
            $requests = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($requests) !== count($orderIds)) {
                throw new RuntimeException("Algunas solicitudes asociadas ya no existen en la base de datos.", 400);
            }
            
            foreach ($requests as $req) {
                if ($req['status'] !== 'En trámite' || $req['deleted_at'] !== null) {
                    throw new RuntimeException("La solicitud {$req['id']} debe estar verificada y en estado 'En trámite', y no puede estar eliminada.", 400);
                }
            }

            // Date chronology validation
            $editionDate = $edition['date'] ?: $now;
            $lastEdStmt = $this->pdo->query("SELECT MAX(date) FROM editions WHERE status='Publicada' AND deleted_at IS NULL");
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
                 
            $auditStmt = $this->pdo->prepare("INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id) VALUES(?,?,?,?)");
            foreach ($orderIds as $orderId) {
                $auditStmt->execute([$actorId, 'status_changed_to_Publicada', 'legal_request', $orderId]);
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
